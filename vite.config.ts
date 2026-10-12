import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'process.env': {}
    },
    plugins: [
      react(),
      {
        name: 'api-config-and-cache-buster-middleware',
        configureServer(server) {
          // Stale asset self-healing interceptor
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/assets/') && req.url.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
              res.end(`
                console.warn('[StudyPulse] Stale build asset requested (' + window.location.pathname + '). Purging Service Worker & refreshing...');
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var r of regs) r.unregister();
                    if ('caches' in window) {
                      caches.keys().then(function(keys) {
                        for (var k of keys) caches.delete(k);
                        window.location.href = '/';
                      });
                    } else {
                      window.location.href = '/';
                    }
                  });
                } else {
                  window.location.href = '/';
                }
              `);
              return;
            }
            next();
          });

          // Google OAuth Client ID config endpoint
          server.middlewares.use('/api/config', (req, res) => {
            const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              clientId,
              configured: Boolean(clientId),
              backendReady: true
            }));
          });

          // Cross-device Cloud Sync Dev Middleware powered by MongoDB Atlas
          const devSyncStore = new Map();
          const mongoUri = env.MONGODB_URI || 'mongodb+srv://abhishek44work:abhishek44M@cluster0.pmmziei.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
          let devMongoClient: any = null;

          const getDevCollection = async () => {
            if (!devMongoClient) {
              const { MongoClient } = await import('mongodb');
              devMongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
              await devMongoClient.connect();
              console.log('[StudyPulse Dev] Connected to MongoDB Atlas (studypulse.user_data)');
            }
            return devMongoClient.db('studypulse').collection('user_data');
          };

          server.middlewares.use('/api/sync', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }

            const url = new URL(req.url || '', 'http://localhost');
            const key = url.searchParams.get('key');
            const status = url.searchParams.get('status');

            if (status === '1') {
              try {
                const col = await getDevCollection();
                const count = await col.countDocuments();
                res.statusCode = 200;
                res.end(JSON.stringify({
                  connected: true,
                  cluster: 'cluster0.pmmziei.mongodb.net',
                  database: 'studypulse',
                  collection: 'user_data',
                  totalUsers: count
                }));
              } catch (err: any) {
                res.statusCode = 200;
                res.end(JSON.stringify({ connected: false, error: err?.message, fallbackMode: true }));
              }
              return;
            }

            if (req.method === 'GET') {
              if (!key) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing key parameter' }));
                return;
              }

              try {
                const col = await getDevCollection();
                const doc = await col.findOne({ _id: key });
                if (doc && doc.data) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ found: true, data: doc.data, updatedAt: doc.updatedAt, storage: 'mongodb' }));
                  return;
                }
              } catch (err: any) {
                console.warn('[StudyPulse Dev] MongoDB query fallback:', err?.message);
              }

              const payload = devSyncStore.get(key);
              if (!payload) {
                res.statusCode = 200;
                res.end(JSON.stringify({ found: false }));
                return;
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ found: true, data: payload.data, updatedAt: payload.updatedAt, storage: 'memory' }));
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const targetKey = parsed.key || key;
                  if (!targetKey || !parsed.data) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing key or data' }));
                    return;
                  }
                  const updatedAt = new Date().toISOString();

                  try {
                    const col = await getDevCollection();
                    await col.updateOne(
                      { _id: targetKey },
                      { $set: { data: parsed.data, updatedAt } },
                      { upsert: true }
                    );
                    devSyncStore.set(targetKey, { data: parsed.data, updatedAt });
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, storage: 'mongodb', updatedAt }));
                    return;
                  } catch (err: any) {
                    console.warn('[StudyPulse Dev] MongoDB save fallback:', err?.message);
                    devSyncStore.set(targetKey, { data: parsed.data, updatedAt });
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, storage: 'fallback', updatedAt, warning: err?.message }));
                    return;
                  }
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
              });
              return;
            }

            res.statusCode = 405;
            res.end();
          });
        }
      }
    ],
    server: {
      port: 5173,
      host: true
    }
  };
});
