import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setSignalingBroadcaster } from './routes/calls';
import { CallRecord } from './models/CallRecord';

export interface ConnectedClient {
  socketId: string;
  userId: string;
  email: string;
  name: string;
  boardId?: string;
}

export class SignalingServer {
  private io: SocketIOServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  constructor() {}

  public init(httpServer: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io/'
    });

    this.io.on('connection', (socket: Socket) => {
      socket.on('register', (data: { userId: string; email: string; name: string; boardId?: string }) => {
        const normEmail = (data.email || '').toLowerCase().trim();
        this.clients.set(socket.id, {
          socketId: socket.id,
          userId: data.userId,
          email: normEmail,
          name: data.name,
          boardId: data.boardId
        });
        socket.join(`user:${normEmail}`);
        if (data.userId) socket.join(`user_id:${data.userId}`);
        if (data.boardId) socket.join(`board:${data.boardId}`);
      });

      socket.on('join_board', (boardId: string) => {
        socket.join(`board:${boardId}`);
        const c = this.clients.get(socket.id);
        if (c) c.boardId = boardId;
      });

      socket.on('disconnect', () => {
        this.clients.delete(socket.id);
      });
    });

    // Wire up signaling broadcaster so Express routes can emit directly to recipients
    setSignalingBroadcaster((event: string, payload: any) => {
      this.broadcast(event, payload);
    });

    return this.io;
  }

  public broadcast(event: string, payload: any) {
    if (!this.io) return;

    // Route event according to targets
    if (payload.targetEmails && Array.isArray(payload.targetEmails)) {
      payload.targetEmails.forEach((email: string) => {
        this.io?.to(`user:${(email || '').toLowerCase().trim()}`).emit(event, payload);
      });
    } else if (payload.targetEmail) {
      this.io.to(`user:${(payload.targetEmail || '').toLowerCase().trim()}`).emit(event, payload);
    } else if (payload.boardId) {
      this.io.to(`board:${payload.boardId}`).emit(event, payload);
    } else {
      this.io.emit(event, payload);
    }
  }

  public getConnectedClients(): ConnectedClient[] {
    return Array.from(this.clients.values());
  }
}

export const signalingServer = new SignalingServer();
