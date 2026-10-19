import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';

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

          // Real-time WebRTC Signaling & Chat WebSocket Server for Deepwork
          const collabClients = new Map<WebSocket, { email: string; boardId: string; userId: string; name: string }>();

          if (server.httpServer) {
            const wss = new WebSocketServer({ noServer: true });

            server.httpServer.on('upgrade', (req, socket, head) => {
              if (req.url && req.url.startsWith('/api/collab-socket')) {
                wss.handleUpgrade(req, socket, head, (ws) => {
                  wss.emit('connection', ws, req);
                });
              }
            });

            wss.on('connection', (ws: WebSocket) => {
              ws.on('message', (messageRaw: any) => {
                try {
                  const data = JSON.parse(messageRaw.toString());

                  if (data.type === 'register') {
                    collabClients.set(ws, {
                      email: (data.email || '').toLowerCase().trim(),
                      boardId: data.boardId,
                      userId: data.userId,
                      name: data.name
                    });
                    return;
                  }

                  if (data.type === 'update_board') {
                    const client = collabClients.get(ws);
                    if (client) {
                      client.boardId = data.boardId;
                    }
                    return;
                  }

                  // 1. Chat Message Broadcast
                  if (data.type === 'chat_message') {
                    const sender = collabClients.get(ws);
                    const targetBoardId = data.boardId || sender?.boardId;
                    for (const [clientWs, client] of collabClients.entries()) {
                      if (clientWs !== ws && client.boardId === targetBoardId && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify(data));
                      }
                    }
                    return;
                  }

                  // 2. Call Ringing: Send incoming_call to targeted users
                  if (data.type === 'call_ring') {
                    const targetEmails = (data.targetEmails || []).map((e: string) => (e || '').toLowerCase().trim());
                    const callerEmail = (data.callerEmail || '').toLowerCase().trim();

                    for (const [clientWs, client] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        const isTargetEmail = targetEmails.length === 0 || targetEmails.includes(client.email);
                        const isSameBoard = client.boardId === data.boardId;
                        const notCaller = client.email !== callerEmail;

                        if (notCaller && (isTargetEmail || isSameBoard)) {
                          clientWs.send(JSON.stringify({
                            type: 'incoming_call',
                            callId: data.callId,
                            callerId: data.callerId,
                            callerName: data.callerName,
                            callerEmail: data.callerEmail,
                            callerColor: data.callerColor,
                            callerAvatar: data.callerAvatar,
                            boardId: data.boardId,
                            boardName: data.boardName,
                            callType: data.callType
                          }));
                        }
                      }
                    }
                    return;
                  }

                  // 3. Call Accepted: At least one person accepted!
                  if (data.type === 'call_accept') {
                    for (const [clientWs] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({
                          type: 'call_accepted',
                          callId: data.callId,
                          accepterId: data.accepterId,
                          accepterEmail: data.accepterEmail,
                          accepterName: data.accepterName,
                          boardId: data.boardId
                        }));
                      }
                    }
                    return;
                  }

                  // 4. Call Rejected
                  if (data.type === 'call_reject') {
                    const targetEmail = (data.targetEmail || '').toLowerCase().trim();
                    for (const [clientWs, client] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        if (!targetEmail || client.email === targetEmail) {
                          clientWs.send(JSON.stringify({
                            type: 'call_rejected',
                            callId: data.callId,
                            rejecterId: data.rejecterId,
                            rejecterEmail: data.rejecterEmail,
                            rejecterName: data.rejecterName
                          }));
                        }
                      }
                    }
                    return;
                  }

                  // 5. Call Cancelled (caller hung up before acceptance)
                  if (data.type === 'call_cancel') {
                    for (const [clientWs] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({
                          type: 'call_cancelled',
                          callId: data.callId
                        }));
                      }
                    }
                    return;
                  }

                  // 6. Call Ended
                  if (data.type === 'call_end') {
                    for (const [clientWs] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({
                          type: 'call_ended',
                          callId: data.callId
                        }));
                      }
                    }
                    return;
                  }

                  // 7. WebRTC Signaling Relays (Offer, Answer, ICE)
                  if (data.type === 'webrtc_offer' || data.type === 'webrtc_answer' || data.type === 'webrtc_ice') {
                    const targetEmail = (data.targetEmail || '').toLowerCase().trim();
                    for (const [clientWs, client] of collabClients.entries()) {
                      if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
                        if (!targetEmail || client.email === targetEmail) {
                          clientWs.send(JSON.stringify(data));
                        }
                      }
                    }
                    return;
                  }
                } catch (err) {
                  console.warn('[Vite Collab Socket] Error processing message:', err);
                }
              });

              ws.on('close', () => {
                collabClients.delete(ws);
              });

              ws.on('error', () => {
                collabClients.delete(ws);
              });
            });
          }

          // Cross-device Cloud Sync Dev Middleware powered by MongoDB Atlas
          const devSyncStore = new Map();
          const mongoUri = env.MONGODB_URI || 'mongodb+srv://abhishek44work:abhishek44M@cluster0.pmmziei.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
          let devMongoClient: any = null;
          let lastMongoAttempt = 0;

          const getDevCollection = async () => {
            if (devMongoClient) {
              try {
                return devMongoClient.db('studypulse').collection('user_data');
              } catch {
                devMongoClient = null;
              }
            }
            // Allow retry every 10 seconds if it failed previously
            if (Date.now() - lastMongoAttempt < 10000) return null;
            lastMongoAttempt = Date.now();

            try {
              const { MongoClient } = await import('mongodb');
              devMongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 7000, connectTimeoutMS: 7000 });
              await devMongoClient.connect();
              console.log('[StudyPulse Dev] Connected to MongoDB Atlas (studypulse.user_data)');
              return devMongoClient.db('studypulse').collection('user_data');
            } catch (e: any) {
              devMongoClient = null;
              console.warn('[StudyPulse Dev] MongoDB connect attempt failed:', e?.message);
              return null;
            }
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
            const users = url.searchParams.get('users');
            const lookupEmail = url.searchParams.get('lookupEmail');
            const boardCode = url.searchParams.get('boardCode');
            const notifications = url.searchParams.get('notifications');
            const emailParam = url.searchParams.get('email');

            if (status === '1') {
              try {
                const col = await getDevCollection();
                if (col) {
                  const count = await col.countDocuments();
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    connected: true,
                    cluster: 'cluster0.pmmziei.mongodb.net',
                    database: 'studypulse',
                    collection: 'user_data',
                    totalUsers: count
                  }));
                  return;
                }
              } catch (err: any) {
                // fall through
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ connected: false, error: 'MongoDB Atlas unavailable in current network', fallbackMode: true }));
              return;
            }

            // 1. Registered Users Directory (MongoDB Atlas)
            if (users === '1') {
              try {
                const col = await getDevCollection();
                if (col) {
                  const docs = await col.find({
                    'data.profile.email': { $exists: true, $ne: '' }
                  }, { projection: { _id: 1, 'data.profile': 1 } }).toArray();

                  const userList: any[] = [];
                  const seen = new Set<string>();
                  docs.forEach((d: any) => {
                    const p = d.data?.profile;
                    if (p && p.email && p.email.includes('@') && !seen.has(p.email.toLowerCase())) {
                      seen.add(p.email.toLowerCase());
                      userList.push({
                        id: p.id || d._id,
                        name: p.name || p.email.split('@')[0],
                        email: p.email,
                        avatar: p.avatarUrl || p.avatar || '',
                        googleConnected: Boolean(p.googleConnected)
                      });
                    }
                  });
                  res.statusCode = 200;
                  res.end(JSON.stringify({ users: userList }));
                  return;
                }
              } catch (err: any) {
                console.warn('[StudyPulse Dev] Users list error:', err?.message);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ users: [] }));
              return;
            }

            // 2. Email lookup (MongoDB Atlas)
            if (lookupEmail) {
              let rawEmail = String(lookupEmail).trim().toLowerCase();
              if (rawEmail.endsWith('@gamil.com')) {
                rawEmail = rawEmail.replace('@gamil.com', '@gmail.com');
              }
              try {
                const col = await getDevCollection();
                if (col) {
                  const doc = await col.findOne({
                    $or: [
                      { _id: `user_${rawEmail.replace(/[@.]/g, '_')}` },
                      { 'data.profile.email': { $regex: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
                    ]
                  }, { projection: { _id: 1, 'data.profile': 1 } });

                  if (doc && doc.data?.profile) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      found: true,
                      user: {
                        id: doc.data.profile.id || doc._id,
                        name: doc.data.profile.name || rawEmail.split('@')[0],
                        email: doc.data.profile.email || rawEmail,
                        avatar: doc.data.profile.avatarUrl || doc.data.profile.avatar || ''
                      }
                    }));
                    return;
                  }
                }
              } catch (err: any) {
                console.warn('[StudyPulse Dev] Email lookup error:', err?.message);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ found: false }));
              return;
            }

            // 3. User Notifications Endpoint (MongoDB Atlas)
            if (notifications === '1') {
              const targetEmail = String(emailParam || '').trim().toLowerCase();
              if (!targetEmail) {
                res.statusCode = 200;
                res.end(JSON.stringify({ notifications: [] }));
                return;
              }
              try {
                const col = await getDevCollection();
                if (col) {
                  const notifDocs = await col.find({
                    recipientEmail: targetEmail
                  }).sort({ timestamp: -1 }).limit(50).toArray();

                  const notifs = notifDocs.map((d: any) => ({
                    id: d._id,
                    type: d.type || 'collab_invite',
                    title: d.title,
                    message: d.message,
                    recipientEmail: d.recipientEmail,
                    senderEmail: d.senderEmail,
                    senderName: d.senderName,
                    senderAvatar: d.senderAvatar,
                    senderColor: d.senderColor,
                    boardId: d.boardId,
                    boardName: d.boardName,
                    inviteCode: d.inviteCode,
                    taskId: d.taskId,
                    taskTitle: d.taskTitle,
                    timestamp: d.timestamp,
                    read: Boolean(d.read),
                    status: d.status || 'pending'
                  }));

                  res.statusCode = 200;
                  res.end(JSON.stringify({ notifications: notifs }));
                  return;
                }
              } catch (err: any) {
                console.warn('[StudyPulse Dev] Notifications query fallback:', err?.message);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ notifications: [] }));
              return;
            }

            // 4. Board Invite Code Lookup
            if (boardCode) {
              const rawCode = String(boardCode).trim().toUpperCase();
              const cleanLower = rawCode.toLowerCase();
              const bareSuffix = cleanLower.replace(/^dw-/, '');
              try {
                const col = await getDevCollection();
                if (col) {
                  let doc = await col.findOne({ _id: `invite_${rawCode}` });
                  if (doc && doc.board) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ found: true, board: doc.board, inviter: doc.inviter || 'Teammate' }));
                    return;
                  }

                  doc = await col.findOne({
                    $or: [
                      { 'data.boards.inviteCode': rawCode },
                      { 'data.boards.id': cleanLower },
                      { 'data.boards.id': `board_${bareSuffix}` },
                      { 'data.boards.name': { $regex: new RegExp(`^${bareSuffix}$`, 'i') } }
                    ]
                  });

                  if (doc && doc.data?.boards && Array.isArray(doc.data.boards)) {
                    const board = doc.data.boards.find((b: any) =>
                      b.inviteCode?.toUpperCase() === rawCode ||
                      b.id?.toLowerCase() === cleanLower ||
                      b.id?.toLowerCase() === `board_${bareSuffix}`
                    );
                    if (board) {
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        found: true,
                        board,
                        inviter: doc.data?.profile?.name || doc.data?.profile?.email || 'Teammate'
                      }));
                      return;
                    }
                  }
                }
              } catch (err: any) {
                console.warn('[StudyPulse Dev] Board code lookup error:', err?.message);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ found: false, message: `No board found matching invite code "${rawCode}"` }));
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
                if (col) {
                  const doc = await col.findOne({ _id: key });
                  if (doc && doc.data) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ found: true, data: doc.data, updatedAt: doc.updatedAt, storage: 'mongodb' }));
                    return;
                  }
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
                  const { action, notification, notifId, status: updateStatus, read: updateRead, boardCode: joinCode, user: joinUser } = parsed;

                  // A. Send Notification to Recipient (MongoDB Atlas)
                  if (action === 'send_notification' && notification && notification.recipientEmail) {
                    try {
                      const col = await getDevCollection();
                      const cleanRecipient = String(notification.recipientEmail).trim().toLowerCase();
                      const id = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                      const doc = {
                        _id: id,
                        recipientEmail: cleanRecipient,
                        senderEmail: notification.senderEmail || '',
                        senderName: notification.senderName || 'Teammate',
                        senderAvatar: notification.senderAvatar || '',
                        senderColor: notification.senderColor || '#0C66E4',
                        type: notification.type || 'collab_invite',
                        title: notification.title,
                        message: notification.message,
                        boardId: notification.boardId,
                        boardName: notification.boardName,
                        inviteCode: notification.inviteCode,
                        taskId: notification.taskId,
                        taskTitle: notification.taskTitle,
                        status: notification.status || 'pending',
                        read: false,
                        timestamp: notification.timestamp || new Date().toISOString(),
                        createdAt: new Date().toISOString()
                      };
                      if (col) {
                        await col.updateOne({ _id: id }, { $set: doc }, { upsert: true });
                      }
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, notifId: id }));
                      return;
                    } catch (err: any) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: err?.message }));
                      return;
                    }
                  }

                  // B. Update Notification (Accept / Decline / Read)
                  if (action === 'update_notification' && notifId) {
                    try {
                      const col = await getDevCollection();
                      if (col) {
                        const update: any = { updatedAt: new Date().toISOString() };
                        if (updateStatus) update.status = updateStatus;
                        if (updateRead !== undefined) update.read = updateRead;
                        await col.updateOne({ _id: notifId }, { $set: update });
                      }
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
                      return;
                    } catch (err: any) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: err?.message }));
                      return;
                    }
                  }

                  // C. Join Board Remote
                  if (action === 'join_board' && joinCode && joinUser) {
                    const rawCode = String(joinCode).trim().toUpperCase();
                    try {
                      const col = await getDevCollection();
                      if (col) {
                        let inviteDoc = await col.findOne({ _id: `invite_${rawCode}` });
                        let targetBoard = inviteDoc?.board;
                        let ownerEmail = inviteDoc?.ownerEmail;

                        if (!targetBoard) {
                          const userDoc = await col.findOne({ 'data.boards.inviteCode': rawCode });
                          if (userDoc && Array.isArray(userDoc.data?.boards)) {
                            targetBoard = userDoc.data.boards.find((b: any) => b.inviteCode?.toUpperCase() === rawCode);
                            ownerEmail = userDoc.data?.profile?.email;
                          }
                        }

                        if (targetBoard) {
                          const members = Array.isArray(targetBoard.members) ? [...targetBoard.members] : [];
                          const cleanEmail = String(joinUser.email || '').trim().toLowerCase();
                          if (cleanEmail && !members.some((m: any) => (m.email || '').trim().toLowerCase() === cleanEmail)) {
                            members.push({
                              id: joinUser.id || `m_${Date.now()}`,
                              name: joinUser.name || cleanEmail.split('@')[0],
                              email: joinUser.email,
                              color: joinUser.color || '#10B981',
                              avatar: joinUser.avatar || '',
                              role: 'editor',
                              joinedAt: new Date().toISOString()
                            });
                            targetBoard.members = members;
                          }

                          await col.updateOne(
                            { _id: `invite_${rawCode}` },
                            { $set: { board: targetBoard, updatedAt: new Date().toISOString() } },
                            { upsert: true }
                          );

                          if (ownerEmail) {
                            await col.updateOne(
                              { 'data.profile.email': ownerEmail, 'data.boards.inviteCode': rawCode },
                              { $set: { 'data.boards.$.members': members } }
                            );

                            const joinNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                            await col.updateOne(
                              { _id: joinNotifId },
                              {
                                $set: {
                                  _id: joinNotifId,
                                  recipientEmail: ownerEmail.toLowerCase(),
                                  senderEmail: joinUser.email,
                                  senderName: joinUser.name || joinUser.email.split('@')[0],
                                  senderAvatar: joinUser.avatar || '',
                                  senderColor: '#10B981',
                                  type: 'collab_invite',
                                  title: 'New Member Joined Board',
                                  message: `${joinUser.name || joinUser.email} joined your board "${targetBoard.name}"!`,
                                  boardId: targetBoard.id,
                                  boardName: targetBoard.name,
                                  inviteCode: rawCode,
                                  status: 'accepted',
                                  read: false,
                                  timestamp: new Date().toISOString(),
                                  createdAt: new Date().toISOString()
                                }
                              },
                              { upsert: true }
                            );
                          }

                          res.statusCode = 200;
                          res.end(JSON.stringify({ success: true, board: targetBoard }));
                          return;
                        }
                      }
                      res.statusCode = 404;
                      res.end(JSON.stringify({ success: false, message: `Board with code "${rawCode}" not found` }));
                      return;
                    } catch (err: any) {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: err?.message }));
                      return;
                    }
                  }

                  // D. Normal User Sync Snapshot
                  const targetKey = parsed.key || key;
                  if (!targetKey || !parsed.data) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Missing key or data' }));
                    return;
                  }
                  const updatedAt = new Date().toISOString();

                  try {
                    const col = await getDevCollection();
                    if (col) {
                      await col.updateOne(
                        { _id: targetKey },
                        { $set: { data: parsed.data, updatedAt } },
                        { upsert: true }
                      );

                      // Index each board's invite code in MongoDB Atlas
                      if (Array.isArray(parsed.data?.boards)) {
                        for (const b of parsed.data.boards) {
                          if (b.inviteCode) {
                            await col.updateOne(
                              { _id: `invite_${b.inviteCode.toUpperCase()}` },
                              {
                                $set: {
                                  board: b,
                                  inviter: parsed.data.profile?.name || parsed.data.profile?.email || 'Teammate',
                                  ownerEmail: parsed.data.profile?.email || null,
                                  updatedAt
                                }
                              },
                              { upsert: true }
                            );
                          }
                        }
                      }

                      devSyncStore.set(targetKey, { data: parsed.data, updatedAt });
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, storage: 'mongodb', updatedAt }));
                      return;
                    }
                  } catch (err: any) {
                    console.warn('[StudyPulse Dev] MongoDB save fallback:', err?.message);
                  }

                  devSyncStore.set(targetKey, { data: parsed.data, updatedAt });
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, storage: 'memory', updatedAt }));
                  return;
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

          // Model Context Protocol (MCP) JSON-RPC Endpoint for external AI assistants (Cursor, Claude, Antigravity)
          server.middlewares.use('/api/mcp', async (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'OPTIONS') {
              res.statusCode = 200;
              res.end();
              return;
            }

            if (req.method === 'GET') {
              res.statusCode = 200;
              res.end(JSON.stringify({
                name: 'deepwork-mcp',
                version: '1.0.0',
                status: 'online',
                protocol: 'Model Context Protocol (JSON-RPC 2.0)',
                endpoint: 'http://localhost:5173/api/mcp',
                stdioScript: 'node scripts/deepwork-mcp.cjs',
                tools: [
                  'deepwork_list_tasks',
                  'deepwork_create_task',
                  'deepwork_update_task',
                  'deepwork_list_boards',
                  'deepwork_get_analytics',
                  'deepwork_log_focus_session'
                ]
              }, null, 2));
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  const { method, id, params } = payload;

                  if (method === 'initialize') {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      jsonrpc: '2.0',
                      id,
                      result: {
                        protocolVersion: '2024-11-05',
                        capabilities: { tools: {} },
                        serverInfo: { name: 'deepwork-mcp', version: '1.0.0' }
                      }
                    }));
                    return;
                  }

                  const storeFile = path.resolve(process.cwd(), 'deepwork-mcp-store.json');
                  let store: any = { boards: [], tags: [], tasks: [], sessions: [], streak: { currentStreak: 0 } };
                  try {
                    if (fs.existsSync(storeFile)) {
                      store = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
                    }
                  } catch {}

                  const saveStore = () => {
                    try {
                      fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), 'utf-8');
                    } catch {}
                  };

                  if (method === 'tools/list') {
                    const tools = [
                      {
                        name: 'deepwork_list_tasks',
                        description: 'Retrieve all tasks and cards from Deepwork with optional filters (status, tag, or boardId)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['all', 'todo', 'completed'] },
                            tag: { type: 'string' },
                            boardId: { type: 'string' }
                          }
                        }
                      },
                      {
                        name: 'deepwork_create_task',
                        description: 'Create a new card/task in Deepwork. Automatically extracts #tags from the title, creates missing tags, and assigns deadline and focus duration.',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            title: { type: 'string' },
                            approxHours: { type: 'number' },
                            deadlineDate: { type: 'string' },
                            priority: { type: 'string', enum: ['normal', 'high', 'urgent'] },
                            notes: { type: 'string' },
                            boardId: { type: 'string' }
                          },
                          required: ['title']
                        }
                      },
                      {
                        name: 'deepwork_update_task',
                        description: 'Update an existing task in Deepwork (change status to completed, reschedule date, or edit notes)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            taskId: { type: 'string' },
                            status: { type: 'string', enum: ['todo', 'completed'] },
                            deadlineDate: { type: 'string' },
                            notes: { type: 'string' }
                          },
                          required: ['taskId']
                        }
                      },
                      {
                        name: 'deepwork_list_boards',
                        description: 'List all project and task boards in Deepwork along with their collaborators',
                        inputSchema: { type: 'object', properties: {} }
                      },
                      {
                        name: 'deepwork_get_analytics',
                        description: 'Get deep work productivity metrics: total focus hours logged, completed tasks count, active streak, and tag breakdown',
                        inputSchema: { type: 'object', properties: {} }
                      },
                      {
                        name: 'deepwork_log_focus_session',
                        description: 'Log completed focus time or Pomodoro session to Deepwork',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            durationMinutes: { type: 'number' },
                            taskId: { type: 'string' },
                            mode: { type: 'string', enum: ['pomodoro', 'custom', 'short_break'] }
                          },
                          required: ['durationMinutes']
                        }
                      }
                    ];
                    res.statusCode = 200;
                    res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { tools } }));
                    return;
                  }

                  if (method === 'tools/call') {
                    const toolName = params?.name;
                    const toolArgs = params?.arguments || {};

                    if (toolName === 'deepwork_list_tasks') {
                      let tasks = store.tasks || [];
                      if (toolArgs.status && toolArgs.status !== 'all') {
                        tasks = tasks.filter((t: any) => t.status === toolArgs.status);
                      }
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        result: { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] }
                      }));
                      return;
                    }

                    if (toolName === 'deepwork_create_task') {
                      const title = toolArgs.title || '';
                      const tagMatches = (title.match(/#([a-zA-Z0-9_\-]+)/g) || []).map((m: string) => m.slice(1).toLowerCase());
                      const matchedTagIds: string[] = [];
                      for (const tName of tagMatches) {
                        let existing = (store.tags || []).find((t: any) => t.name.toLowerCase() === tName);
                        if (!existing) {
                          existing = { id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6), name: tName, color: '#0C66E4' };
                          store.tags = store.tags || [];
                          store.tags.push(existing);
                        }
                        if (!matchedTagIds.includes(existing.id)) matchedTagIds.push(existing.id);
                      }
                      const cleanTitle = title.replace(/#([a-zA-Z0-9_\-]+)/g, '').trim() || title.trim();
                      const newTask = {
                        id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        boardId: toolArgs.boardId || 'board_default',
                        name: cleanTitle,
                        tags: matchedTagIds,
                        approxHours: Number(toolArgs.approxHours) || 1.5,
                        scheduledDate: toolArgs.deadlineDate || new Date().toISOString().split('T')[0],
                        status: 'todo',
                        priority: toolArgs.priority || 'normal',
                        notes: toolArgs.notes || '',
                        createdAt: new Date().toISOString()
                      };
                      store.tasks = store.tasks || [];
                      store.tasks.push(newTask);
                      saveStore();
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        result: { content: [{ type: 'text', text: `✅ Created card "${cleanTitle}" [ID: ${newTask.id}]` }] }
                      }));
                      return;
                    }

                    if (toolName === 'deepwork_update_task') {
                      const task = (store.tasks || []).find((t: any) => t.id === toolArgs.taskId);
                      if (!task) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: 'Task not found' }] } }));
                        return;
                      }
                      if (toolArgs.status) task.status = toolArgs.status;
                      if (toolArgs.deadlineDate) task.scheduledDate = toolArgs.deadlineDate;
                      if (toolArgs.notes !== undefined) task.notes = toolArgs.notes;
                      saveStore();
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        result: { content: [{ type: 'text', text: `✅ Updated task "${task.name}"` }] }
                      }));
                      return;
                    }

                    if (toolName === 'deepwork_get_analytics') {
                      const tasks = store.tasks || [];
                      const completed = tasks.filter((t: any) => t.status === 'completed');
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        result: {
                          content: [{
                            type: 'text',
                            text: JSON.stringify({
                              totalTasks: tasks.length,
                              completedTasks: completed.length,
                              streakDays: store.streak?.currentStreak || 0
                            }, null, 2)
                          }]
                        }
                      }));
                      return;
                    }

                    if (toolName === 'deepwork_list_boards') {
                      res.statusCode = 200;
                      res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id,
                        result: { content: [{ type: 'text', text: JSON.stringify(store.boards || [], null, 2) }] }
                      }));
                      return;
                    }
                  }

                  res.statusCode = 200;
                  res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }));
                } catch (e: any) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: e?.message } }));
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
