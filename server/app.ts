import express from 'express';
import cors from 'cors';

export const app = express();
app.use(cors({ origin: true }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'deepwork-signaling' }));
