import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { SignalingServer } from './server/socket';
import { authenticateEmail } from './api/emailAuth.js';

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
          // Email/password signup and sign-in for local development.
          server.middlewares.use('/api/auth', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(Buffer.from(chunk)));
            req.on('end', async () => {
              try {
                const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
                const result = await authenticateEmail(req.method || 'GET', body, async () => {
                  const collection = await getDevCollection('auth_users');
                  if (!collection) throw new Error('MONGODB_URI is not configured or MongoDB is unavailable');
                  return collection;
                });
                res.statusCode = result.status;
                res.end(JSON.stringify(result.data));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Could not process the email sign-in request.' }));
              }
            });
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

          if (server.httpServer) new SignalingServer().init(server.httpServer);

          // Cross-device Cloud Sync Dev Middleware powered by MongoDB Atlas
          const devSyncStore = new Map();
          const devChatStore = new Map<string, any[]>();
          const mongoUri = env.MONGODB_URI;
          let devMongoClient: any = null;
          let lastMongoAttempt = 0;

          const getDevCollection = async (collName = 'user_data') => {
            if (!mongoUri) return null;
            if (devMongoClient) {
              try {
                return devMongoClient.db('studypulse').collection(collName);
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
              console.log(`[Deepwork Dev] Connected to MongoDB Atlas (studypulse.${collName})`);
              return devMongoClient.db('studypulse').collection(collName);
            } catch (e: any) {
              devMongoClient = null;
              console.warn('[Deepwork Dev] MongoDB connect attempt failed:', e?.message);
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
            const chatParam = url.searchParams.get('chat');
            const chatBoardId = url.searchParams.get('boardId');

            // 0. Board Chat Messages Query (MongoDB Atlas)
            if (chatParam === '1' && chatBoardId) {
              try {
                const col = await getDevCollection('chat_messages');
                if (col) {
                  const msgs = await col.find({ boardId: chatBoardId }).sort({ timestamp: 1 }).limit(100).toArray();
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    messages: msgs.map((m: any) => ({
                      id: m._id,
                      boardId: m.boardId,
                      senderId: m.senderId,
                      senderName: m.senderName,
                      senderColor: m.senderColor,
                      content: m.content,
                      taskId: m.taskId,
                      taskTitle: m.taskTitle,
                      timestamp: m.timestamp
                    }))
                  }));
                  return;
                }
              } catch (err: any) {
                console.warn('[Deepwork Dev] Chat history query error:', err?.message);
              }
              const fallbackMessages = devChatStore.get(chatBoardId) || [];
              res.statusCode = 200;
              res.end(JSON.stringify({ messages: fallbackMessages }));
              return;
            }

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
                console.warn('[Deepwork Dev] Users list error:', err?.message);
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
                console.warn('[Deepwork Dev] Email lookup error:', err?.message);
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
                console.warn('[Deepwork Dev] Notifications query fallback:', err?.message);
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
                console.warn('[Deepwork Dev] Board code lookup error:', err?.message);
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
                console.warn('[Deepwork Dev] MongoDB query fallback:', err?.message);
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

                        // If task delegated, also append directly to recipient's tasks list in MongoDB!
                        if (notification.type === 'task_delegated' && notification.task) {
                          try {
                            const userKey = `user_${cleanRecipient.replace(/[^a-z0-9]/g, '_')}`;
                            const userDoc = await col.findOne({ _id: userKey });
                            const existingTasks = Array.isArray(userDoc?.data?.tasks)
                              ? [...userDoc.data.tasks]
                              : (Array.isArray(userDoc?.data?.topics) ? [...userDoc.data.topics] : []);

                            const existingIdx = existingTasks.findIndex((t: any) => t.id === notification.task.id);
                            if (existingIdx >= 0) {
                              existingTasks[existingIdx] = notification.task;
                            } else {
                              existingTasks.unshift(notification.task);
                            }

                            await col.updateOne(
                              { _id: userKey },
                              {
                                $set: {
                                  'data.tasks': existingTasks,
                                  'data.topics': existingTasks,
                                  updatedAt: new Date().toISOString()
                                }
                              },
                              { upsert: true }
                            );
                          } catch (errTask: any) {
                            console.warn('[Deepwork Dev] Failed to append delegated task to recipient:', errTask?.message);
                          }
                        }
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

                  // A2. Send Chat Message (MongoDB Atlas)
                  if (action === 'send_chat' && parsed.message) {
                    try {
                      const m = parsed.message;
                      const doc = {
                        id: m.id || `msg_${Date.now()}`,
                        boardId: m.boardId || 'default',
                        senderId: m.senderId || 'anon',
                        senderName: m.senderName || 'Teammate',
                        senderColor: m.senderColor || '#0C66E4',
                        content: String(m.content || '').trim(),
                        taskId: m.taskId || null,
                        taskTitle: m.taskTitle || null,
                        timestamp: m.timestamp || new Date().toISOString()
                      };
                      if (!doc.content) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ success: false, error: 'Message content is required.' }));
                        return;
                      }
                      const chatCol = await getDevCollection('chat_messages');
                      if (chatCol) {
                        const doc = {
                          _id: m.id || `msg_${Date.now()}`,
                          boardId: m.boardId || 'default',
                          senderId: m.senderId || 'anon',
                          senderName: m.senderName || 'Teammate',
                          senderColor: m.senderColor || '#0C66E4',
                          content: m.content || '',
                          taskId: m.taskId || null,
                          taskTitle: m.taskTitle || null,
                          timestamp: m.timestamp || new Date().toISOString(),
                          createdAt: new Date().toISOString()
                        };
                        await chatCol.updateOne({ _id: doc._id }, { $set: doc }, { upsert: true });
                      }
                      const messages = devChatStore.get(doc.boardId) || [];
                      if (!messages.some((message: any) => message.id === doc.id)) messages.push(doc);
                      devChatStore.set(doc.boardId, messages.slice(-100));
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true }));
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
                    console.warn('[Deepwork Dev] MongoDB save fallback:', err?.message);
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


        }
      }
    ],
    server: {
      port: 5173,
      host: true
    }
  };
});
