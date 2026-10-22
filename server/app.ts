import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { callRouter } from './routes/calls';
import { LivekitService } from './services/livekitService';

export const app: Express = express();

// Standard middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Public health check and config endpoint (never exposes secrets)
app.get('/api/calls/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    provider: 'LiveKit Cloud / Self-Hosted',
    livekitUrl: LivekitService.getLivekitUrl(),
    configured: LivekitService.isConfigured()
  });
});

// Mount protected Calls API
app.use('/api/calls', callRouter);

// Safe global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Express App] Uncaught error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});
