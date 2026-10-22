import { HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

interface ConnectedClient { socket: WebSocket; userId: string; email: string; name: string; boardId?: string; lastSeen: number; }

/** Relays WebRTC setup data only. Audio and video travel directly between browsers. */
export class SignalingServer {
  private clients = new Map<WebSocket, ConnectedClient>();
  private callParticipants = new Map<string, Set<WebSocket>>();
  private acceptedCallParticipants = new Map<string, Set<ConnectedClient>>();

  init(server: HttpServer): WebSocketServer {
    const signalingPath = '/api/collab-socket';
    // Vite uses the same HTTP server for its own HMR WebSocket (/?token=...).
    // Use noServer mode so this signaling server leaves every other upgrade alone.
    const wss = new WebSocketServer({ noServer: true });
    const presenceSweep = setInterval(() => {
      const cutoff = Date.now() - 45000;
      const expired = [...this.clients.values()].filter(client => client.lastSeen < cutoff);
      const affectedBoards = new Set(expired.map(client => client.boardId).filter(Boolean) as string[]);
      for (const client of expired) {
        this.clients.delete(client.socket);
        this.callParticipants.forEach(peers => peers.delete(client.socket));
        client.socket.terminate();
      }
      affectedBoards.forEach(boardId => this.publishPresence(boardId));
    }, 15000);
    presenceSweep.unref?.();
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
          const previous = this.clients.get(socket);
          this.clients.set(socket, { socket, email: String(data.email || '').trim().toLowerCase(), userId: String(data.userId || ''), name: String(data.name || 'Teammate'), boardId: data.boardId, lastSeen: Date.now() });
          if (previous?.boardId && previous.boardId !== data.boardId) this.publishPresence(previous.boardId);
          if (data.boardId) this.publishPresence(String(data.boardId));
          return;
        }
        const sender = this.clients.get(socket);
        if (!sender) return;
        sender.lastSeen = Date.now();
        if (data.type === 'heartbeat') return;
        if (data.type === 'update_board') {
          const previousBoard = sender.boardId;
          sender.boardId = data.boardId;
          if (previousBoard) this.publishPresence(previousBoard);
          if (sender.boardId) this.publishPresence(sender.boardId);
          return;
        }
        this.relay(data, sender);
      });
      const removeClient = () => {
        const client = this.clients.get(socket);
        this.clients.delete(socket);
        this.callParticipants.forEach(peers => peers.delete(socket));
        if (client?.boardId) this.publishPresence(client.boardId);
      };
      socket.on('close', removeClient);
      socket.on('error', removeClient);
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
      case 'call_ring': {
        const participants = new Set<WebSocket>([sender.socket]);
        for (const email of targets) for (const client of users(email)) {
          participants.add(client.socket);
          deliver(client, {
          type: 'incoming_call', callId: data.callId, callerId: sender.userId, callerName: sender.name,
          callerEmail: sender.email, callerColor: data.callerColor, callerAvatar: data.callerAvatar,
          boardId: data.boardId, boardName: data.boardName, callType: data.callType
          });
        }
        this.callParticipants.set(String(data.callId), participants);
        this.acceptedCallParticipants.set(String(data.callId), new Set([sender]));
        break;
      }
      case 'call_accept': {
        const callId = String(data.callId || '');
        const accepted = this.acceptedCallParticipants.get(callId) || new Set<ConnectedClient>();
        const previous = [...accepted];
        accepted.add(sender);
        this.acceptedCallParticipants.set(callId, accepted);
        for (const client of users(targetEmail)) deliver(client, { type: 'call_accepted', callId: data.callId, accepterId: sender.userId, accepterEmail: sender.email, accepterName: sender.name, boardId: data.boardId });
        for (const peer of previous) deliver(peer, { type: 'call_participant_joined', callId, participant: { id: sender.userId, email: sender.email, name: sender.name } });
        for (const peer of previous) if (sender.socket.readyState === WebSocket.OPEN) sender.socket.send(JSON.stringify({ type: 'call_participant_joined', callId, participant: { id: peer.userId, email: peer.email, name: peer.name } }));
        break;
      }
      case 'call_reject':
        for (const client of users(targetEmail)) deliver(client, { type: 'call_rejected', callId: data.callId, rejecterId: sender.userId, rejecterEmail: sender.email, rejecterName: sender.name });
        break;
      case 'call_cancel': case 'call_end': {
        const peers = this.callParticipants.get(String(data.callId)) || new Set(targets.flatMap(email => users(email).map(client => client.socket)));
        for (const socket of peers) { const client = this.clients.get(socket); if (client) deliver(client, { type: data.type === 'call_cancel' ? 'call_cancelled' : 'call_ended', callId: data.callId, callerId: sender.userId, senderId: sender.userId, peerId: sender.userId }); }
        this.callParticipants.delete(String(data.callId));
        this.acceptedCallParticipants.delete(String(data.callId));
        break;
      }
      case 'webrtc_offer': case 'webrtc_answer': case 'webrtc_ice':
        for (const client of users(targetEmail)) deliver(client, { ...data, senderId: sender.userId, senderEmail: sender.email });
        break;
      case 'task_delegated':
        for (const client of users(String(data.recipientEmail || '').trim().toLowerCase())) deliver(client, data);
        break;
    }
  }

  private publishPresence(boardId: string) {
    const clients = [...this.clients.values()].filter(client => client.boardId === boardId && client.socket.readyState === WebSocket.OPEN);
    const onlineEmails = [...new Set(clients.map(client => client.email).filter(Boolean))];
    const message = JSON.stringify({ type: 'presence_update', boardId, onlineEmails });
    for (const client of clients) client.socket.send(message);
  }

  getConnectedClients() { return [...this.clients.values()].map(({ socket, ...client }) => client); }
}

export const signalingServer = new SignalingServer();
