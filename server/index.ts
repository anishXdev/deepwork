import http from 'http';
import dotenv from 'dotenv';
import { app } from './app';
import { signalingServer } from './socket';

dotenv.config();
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
signalingServer.init(server);
server.listen(PORT, () => {
  console.log(`[Server] Deepwork WebRTC signaling server listening on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
});
