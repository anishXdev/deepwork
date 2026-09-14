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
        }
      }
    ],
    server: {
      port: 5173,
      host: true
    }
  };
});
