import { HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

interface ConnectedClient { socket: WebSocket; userId: string; email: string; name: string; boardId?: string; }

/** Relays WebRTC setup data only. Audio and video travel directly between browsers. */
export class SignalingServer {
  private clients = new Map<WebSocket, ConnectedClient>();

  init(server: HttpServer): WebSocketServer {
    const signalingPath = '/api/collab-socket';
    // Vite uses the same HTTP server for its own HMR WebSocket (/?token=...).
    // Use noServer mode so this signaling server leaves every other upgrade alone.
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
      let pathname: string;
      try {
        pathname = new URL(request.url || '/', 'http://localhost').pathname;
      } catch {
        return;
      }
      if (pathname !== signalingPath) return;
      wss.handleUpgrade(request, socket, head, upgradedSocket => {
        wss.emit('connection', upgradedSocket, request);
      });
    });
    wss.on('connection', socket => {
      socket.on('message', raw => {
        let data: any;
        try { data = JSON.parse(raw.toString()); } catch { return; }
        if (data.type === 'register') {
          this.clients.set(socket, { socket, email: String(data.email || '').trim().toLowerCase(), userId: String(data.userId || ''), name: String(data.name || 'Teammate'), boardId: data.boardId });
          return;
        }
        const sender = this.clients.get(socket);
        if (!sender) return;
        if (data.type === 'update_board') { sender.boardId = data.boardId; return; }
        this.relay(data, sender);
      });
      socket.on('close', () => this.clients.delete(socket));
      socket.on('error', () => this.clients.delete(socket));
    });
    return wss;
  }

  private relay(data: any, sender: ConnectedClient) {
    const targetEmail = String(data.targetEmail || '').trim().toLowerCase();
    const targets = Array.isArray(data.targetEmails) ? data.targetEmails.map((e: string) => String(e).trim().toLowerCase()) : [];
    const deliver = (client: ConnectedClient, message: any) => {
      if (client.socket !== sender.socket && client.socket.readyState === WebSocket.OPEN) client.socket.send(JSON.stringify(message));
    };
    const users = (email: string) => [...this.clients.values()].filter(client => client.email === email);
    switch (data.type) {
      case 'chat_message':
        for (const client of this.clients.values()) if (client.boardId && client.boardId === (data.boardId || sender.boardId)) deliver(client, data);
        break;
      case 'call_ring':
        for (const email of targets) for (const client of users(email)) deliver(client, {
          type: 'incoming_call', callId: data.callId, callerId: sender.userId, callerName: sender.name,
          callerEmail: sender.email, callerColor: data.callerColor, callerAvatar: data.callerAvatar,
          boardId: data.boardId, boardName: data.boardName, callType: data.callType
        });
        break;
      case 'call_accept':
        for (const client of users(targetEmail)) deliver(client, { type: 'call_accepted', callId: data.callId, accepterId: sender.userId, accepterEmail: sender.email, accepterName: sender.name, boardId: data.boardId });
        break;
      case 'call_reject':
        for (const client of users(targetEmail)) deliver(client, { type: 'call_rejected', callId: data.callId, rejecterId: sender.userId, rejecterEmail: sender.email, rejecterName: sender.name });
        break;
      case 'call_cancel': case 'call_end':
        for (const email of targets.length ? targets : targetEmail ? [targetEmail] : []) for (const client of users(email)) deliver(client, { type: data.type === 'call_cancel' ? 'call_cancelled' : 'call_ended', callId: data.callId, callerId: sender.userId, senderId: sender.userId });
        break;
      case 'webrtc_offer': case 'webrtc_answer': case 'webrtc_ice':
        for (const client of users(targetEmail)) deliver(client, { ...data, senderId: sender.userId, senderEmail: sender.email });
        break;
      case 'task_delegated':
        for (const client of users(String(data.recipientEmail || '').trim().toLowerCase())) deliver(client, data);
        break;
    }
  }

  getConnectedClients() { return [...this.clients.values()].map(({ socket, ...client }) => client); }
}

export const signalingServer = new SignalingServer();
