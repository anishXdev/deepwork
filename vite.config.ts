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

          // Cross-device Cloud Sync Dev Middleware
          const devSyncStore = new Map();
          server.middlewares.use('/api/sync', (req, res) => {
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

            if (req.method === 'GET') {
              if (!key) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing key parameter' }));
                return;
              }
              const payload = devSyncStore.get(key);
              if (!payload) {
                res.statusCode = 200;
                res.end(JSON.stringify({ found: false }));
                return;
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ found: true, data: payload.data, updatedAt: payload.updatedAt }));
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const targetKey = parsed.key || key;
                  if (!targetKey || !parsed.data) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing key or data' }));
                    return;
                  }
                  const updatedAt = new Date().toISOString();
                  devSyncStore.set(targetKey, { data: parsed.data, updatedAt });
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, updatedAt }));
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
