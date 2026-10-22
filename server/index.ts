import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app';
import { signalingServer } from './socket';

dotenv.config();

const PORT = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://abhishek44work:abhishek44M@cluster0.pmmziei.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function bootstrap() {
  try {
    console.log('[Server] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      dbName: 'studypulse',
      serverSelectionTimeoutMS: 8000
    });
    console.log('[Server] Successfully connected to MongoDB Atlas (studypulse).');

    const server = http.createServer(app);
    signalingServer.init(server);

    server.listen(PORT, () => {
      console.log(`[Server] LiveKit Calling & Express Backend running on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/api/calls/config`);
    });
  } catch (err: any) {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { app };
