// Vercel Serverless Function: Cloud Sync with MongoDB Atlas
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek44work:abhishek44M@cluster0.pmmziei.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'studypulse';
const COLLECTION_NAME = 'user_data';

// Cached MongoClient connection across serverless invocations
let cachedClient = null;

async function getCollection() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  const db = cachedClient.db(DB_NAME);
  return db.collection(COLLECTION_NAME);
}

// In-memory fallback in case of transient database connection issue
const memoryFallback = new Map();

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key, status, users, lookupEmail, boardCode, notifications, email } = req.query;

  // Health/status check for MongoDB
  if (status === '1') {
    try {
      const collection = await getCollection();
      const count = await collection.countDocuments();
      return res.status(200).json({
        connected: true,
        cluster: 'cluster0.pmmziei.mongodb.net',
        database: DB_NAME,
        collection: COLLECTION_NAME,
        totalUsers: count
      });
    } catch (err) {
      return res.status(200).json({
        connected: false,
        error: err.message,
        fallbackMode: true
      });
    }
  }

  // 1. Registered Users Directory (MongoDB Atlas lookup across all accounts)
  if (users === '1') {
    try {
      const collection = await getCollection();
      const docs = await collection.find({
        'data.profile.email': { $exists: true, $ne: '' }
      }, { projection: { _id: 1, 'data.profile': 1 } }).toArray();

      const userList = [];
      const seen = new Set();
      docs.forEach(d => {
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
      return res.status(200).json({ users: userList });
    } catch (err) {
      return res.status(200).json({ users: [] });
    }
  }

  // 2. Email lookup (Instant live lookup for collaboration invite)
  if (lookupEmail) {
    let rawEmail = String(lookupEmail).trim().toLowerCase();
    if (rawEmail.endsWith('@gamil.com')) {
      rawEmail = rawEmail.replace('@gamil.com', '@gmail.com');
    }
    try {
      const collection = await getCollection();
      const doc = await collection.findOne({
        $or: [
          { _id: `user_${rawEmail.replace(/[@.]/g, '_')}` },
          { 'data.profile.email': { $regex: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      }, { projection: { _id: 1, 'data.profile': 1 } });

      if (doc && doc.data?.profile) {
        return res.status(200).json({
          found: true,
          user: {
            id: doc.data.profile.id || doc._id,
            name: doc.data.profile.name || rawEmail.split('@')[0],
            email: doc.data.profile.email || rawEmail,
            avatar: doc.data.profile.avatarUrl || doc.data.profile.avatar || ''
          }
        });
      }
      return res.status(200).json({ found: false });
    } catch (err) {
      return res.status(200).json({ found: false, error: err.message });
    }
  }

  // 3. Remote Notifications for User
  if (notifications === '1') {
    const targetEmail = String(email || '').trim().toLowerCase();
    if (!targetEmail) {
      return res.status(200).json({ notifications: [] });
    }
    try {
      const collection = await getCollection();
      const notifDocs = await collection.find({
        recipientEmail: targetEmail
      }).sort({ timestamp: -1 }).limit(50).toArray();

      const notifs = notifDocs.map(d => ({
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

      return res.status(200).json({ notifications: notifs });
    } catch (err) {
      return res.status(200).json({ notifications: [] });
    }
  }

  // 4. Board Invite Code Lookup (Resolve DW-XXXXXX or board ID)
  if (boardCode) {
    const rawCode = String(boardCode).trim().toUpperCase();
    const cleanLower = rawCode.toLowerCase();
    const bareSuffix = cleanLower.replace(/^dw-/, '');
    try {
      const collection = await getCollection();
      // Check direct invite record first
      let doc = await collection.findOne({ _id: `invite_${rawCode}` });
      if (doc && doc.board) {
        return res.status(200).json({ found: true, board: doc.board, inviter: doc.inviter || 'Teammate' });
      }

      // Query within user boards
      doc = await collection.findOne({
        $or: [
          { 'data.boards.inviteCode': rawCode },
          { 'data.boards.id': cleanLower },
          { 'data.boards.id': `board_${bareSuffix}` },
          { 'data.boards.name': { $regex: new RegExp(`^${bareSuffix}$`, 'i') } }
        ]
      });

      if (doc && doc.data?.boards && Array.isArray(doc.data.boards)) {
        const board = doc.data.boards.find(b =>
          b.inviteCode?.toUpperCase() === rawCode ||
          b.id?.toLowerCase() === cleanLower ||
          b.id?.toLowerCase() === `board_${bareSuffix}`
        );
        if (board) {
          return res.status(200).json({
            found: true,
            board,
            inviter: doc.data?.profile?.name || doc.data?.profile?.email || 'Teammate'
          });
        }
      }

      return res.status(200).json({ found: false, message: `No board found matching invite code "${rawCode}"` });
    } catch (err) {
      return res.status(200).json({ found: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    if (!key) {
      return res.status(400).json({ error: 'Missing sync key parameter' });
    }

    try {
      const collection = await getCollection();
      const doc = await collection.findOne({ _id: key });

      if (!doc || !doc.data) {
        const fb = memoryFallback.get(key);
        if (fb) {
          return res.status(200).json({ found: true, data: fb.data, updatedAt: fb.updatedAt, storage: 'memory' });
        }
        return res.status(200).json({ found: false, message: 'No remote cloud data found for this sync key' });
      }

      return res.status(200).json({
        found: true,
        data: doc.data,
        updatedAt: doc.updatedAt,
        storage: 'mongodb'
      });
    } catch (err) {
      console.warn('MongoDB query error, attempting fallback:', err.message);
      const fb = memoryFallback.get(key);
      if (fb) {
        return res.status(200).json({ found: true, data: fb.data, updatedAt: fb.updatedAt, storage: 'fallback' });
      }
      return res.status(200).json({ found: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { action, notification, notifId, status: updateStatus, read: updateRead, boardCode: joinCode, user: joinUser, key: bodyKey, data } = body;

    // A. Send Notification to Recipient
    if (action === 'send_notification' && notification && notification.recipientEmail) {
      try {
        const collection = await getCollection();
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
        await collection.updateOne({ _id: id }, { $set: doc }, { upsert: true });
        return res.status(200).json({ success: true, notifId: id });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // B. Update Notification Status (Accept / Decline / Read)
    if (action === 'update_notification' && notifId) {
      try {
        const collection = await getCollection();
        const update = { updatedAt: new Date().toISOString() };
        if (updateStatus) update.status = updateStatus;
        if (updateRead !== undefined) update.read = updateRead;
        await collection.updateOne({ _id: notifId }, { $set: update });
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // C. Join Board Remote
    if (action === 'join_board' && joinCode && joinUser) {
      const rawCode = String(joinCode).trim().toUpperCase();
      try {
        const collection = await getCollection();
        let inviteDoc = await collection.findOne({ _id: `invite_${rawCode}` });
        let targetBoard = inviteDoc?.board;
        let ownerEmail = inviteDoc?.ownerEmail;

        if (!targetBoard) {
          const userDoc = await collection.findOne({ 'data.boards.inviteCode': rawCode });
          if (userDoc && Array.isArray(userDoc.data?.boards)) {
            targetBoard = userDoc.data.boards.find(b => b.inviteCode?.toUpperCase() === rawCode);
            ownerEmail = userDoc.data?.profile?.email;
          }
        }

        if (targetBoard) {
          const members = Array.isArray(targetBoard.members) ? [...targetBoard.members] : [];
          const cleanEmail = String(joinUser.email || '').trim().toLowerCase();
          if (cleanEmail && !members.some(m => (m.email || '').trim().toLowerCase() === cleanEmail)) {
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

          // Update invite record
          await collection.updateOne(
            { _id: `invite_${rawCode}` },
            { $set: { board: targetBoard, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );

          // Update owner's board copy in Atlas and notify owner
          if (ownerEmail) {
            await collection.updateOne(
              { 'data.profile.email': ownerEmail, 'data.boards.inviteCode': rawCode },
              { $set: { 'data.boards.$.members': members } }
            );

            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            await collection.updateOne(
              { _id: notifId },
              {
                $set: {
                  _id: notifId,
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

          return res.status(200).json({ success: true, board: targetBoard });
        }
        return res.status(404).json({ success: false, message: `Board with code "${rawCode}" not found` });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // D. Normal sync snapshot (user data)
    const targetKey = bodyKey || key;
    if (!targetKey || !data) {
      return res.status(400).json({ error: 'Missing sync key or data payload' });
    }

    const updatedAt = new Date().toISOString();

    try {
      const collection = await getCollection();
      await collection.updateOne(
        { _id: targetKey },
        { 
          $set: { 
            data, 
            updatedAt,
            lastClientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
          } 
        },
        { upsert: true }
      );

      // Index each board's invite code in MongoDB Atlas
      if (Array.isArray(data?.boards)) {
        for (const b of data.boards) {
          if (b.inviteCode) {
            await collection.updateOne(
              { _id: `invite_${b.inviteCode.toUpperCase()}` },
              {
                $set: {
                  board: b,
                  inviter: data.profile?.name || data.profile?.email || 'Teammate',
                  ownerEmail: data.profile?.email || null,
                  updatedAt
                }
              },
              { upsert: true }
            );
          }
        }
      }

      memoryFallback.set(targetKey, { data, updatedAt });

      return res.status(200).json({
        success: true,
        storage: 'mongodb',
        updatedAt,
        message: 'Successfully saved to MongoDB Atlas (studypulse.user_data)'
      });
    } catch (err) {
      console.warn('MongoDB write error, saving to in-memory fallback:', err.message);
      memoryFallback.set(targetKey, { data, updatedAt });

      return res.status(200).json({
        success: true,
        storage: 'fallback',
        updatedAt,
        warning: 'Saved to session cache (database reconnecting): ' + err.message
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
