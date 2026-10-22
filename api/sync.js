// Vercel Serverless Function: Cloud Sync with MongoDB Atlas
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'studypulse';
const COLLECTION_NAME = 'user_data';

// Cached MongoClient connection across serverless invocations
let cachedClient = null;

async function getCollection(collectionName = COLLECTION_NAME) {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await cachedClient.connect();
  }
  const db = cachedClient.db(DB_NAME);
  return db.collection(collectionName);
}

// In-memory fallback in case of transient database connection issue
const memoryFallback = new Map();
const chatFallback = new Map();

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key, status, users, lookupEmail, boardCode, notifications, email } = req.query;

  // Shared board chat history. Keep a short in-memory fallback for transient DB outages.
  if (req.method === 'GET' && req.query.chat === '1') {
    const boardId = String(req.query.boardId || '').trim();
    if (!boardId) return res.status(200).json({ messages: [] });
    try {
      const collection = await getCollection('chat_messages');
      const messages = await collection.find({ boardId, content: { $exists: true } })
        .sort({ timestamp: 1 }).limit(100).toArray();
      return res.status(200).json({ messages: messages.map(({ _id, messageId, ...m }) => ({ id: messageId || _id, ...m })) });
    } catch (err) {
      return res.status(200).json({ messages: chatFallback.get(boardId) || [], fallbackMode: true });
    }
  }

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
        $or: [{ 'directoryProfile.email': { $exists: true, $ne: '' } }, { 'data.profile.email': { $exists: true, $ne: '' } }]
      }, { projection: { _id: 1, directoryProfile: 1, 'data.profile': 1 } }).toArray();

      const userList = [];
      const seen = new Set();
      docs.forEach(d => {
        const p = d.directoryProfile || d.data?.profile;
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
          { 'directoryProfile.email': { $regex: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { 'data.profile.email': { $regex: new RegExp(`^${rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      }, { projection: { _id: 1, directoryProfile: 1, 'data.profile': 1 } });

      const publicProfile = doc?.directoryProfile || doc?.data?.profile;
      if (doc && publicProfile) {
        return res.status(200).json({
          found: true,
          user: {
            id: publicProfile.id || doc._id,
            name: publicProfile.name || rawEmail.split('@')[0],
            email: publicProfile.email || rawEmail,
            avatar: publicProfile.avatarUrl || publicProfile.avatar || ''
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
        task: d.task,
        sealed: d.sealed,
        e2ee: d.e2ee === true,
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
      if (doc?.encryptedEnvelope) return res.status(200).json({ found: true, encryptedEnvelope: doc.encryptedEnvelope });
      if (doc?.board) return res.status(200).json({ found: false, message: 'This invite uses an older format. Ask the owner to create a new secure invite link.' });

      // Query within user boards
      doc = await collection.findOne({
        $or: [
          { 'data.boards.inviteCode': rawCode },
          { 'data.boards.id': cleanLower },
          { 'data.boards.id': `board_${bareSuffix}` },
          { 'data.boards.name': { $regex: new RegExp(`^${bareSuffix}$`, 'i') } }
        ]
      });

      if (doc && doc.data?.encrypted === true) return res.status(404).json({ found: false, message: 'Open the complete secure invite link.' });
      if (doc && doc.data?.boards && Array.isArray(doc.data.boards)) {
        const board = doc.data.boards.find(b =>
          b.inviteCode?.toUpperCase() === rawCode ||
          b.id?.toLowerCase() === cleanLower ||
          b.id?.toLowerCase() === `board_${bareSuffix}`
        );
        if (board) {
          return res.status(200).json({
            found: false,
            message: 'This invite uses an older format. Ask the owner to create a new secure invite link.',
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
    const { action, notification, notifId, status: updateStatus, read: updateRead, joinCode: secureJoinCode, boardCode, joinUser: secureJoinUser, user, key: bodyKey, data, boardInvites, directoryProfile } = body;
    const joinCode = secureJoinCode || boardCode;
    const joinUser = secureJoinUser || user;

    // Save board messages for collaborators using polling when a live socket is unavailable.
    if (action === 'send_chat' && body.message) {
      const m = body.message;
      const boardId = String(m.boardId || '').trim();
      if (!boardId || !String(m.content || '').trim()) {
        return res.status(400).json({ success: false, error: 'Board and message content are required.' });
      }
      const message = {
        id: m.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        boardId,
        senderId: m.senderId || 'anon',
        senderName: m.senderName || 'Teammate',
        senderColor: m.senderColor || '#0C66E4',
        content: String(m.content).trim(),
        taskId: m.taskId || null,
        taskTitle: m.taskTitle || null,
        timestamp: m.timestamp || new Date().toISOString()
      };
      try {
        const collection = await getCollection('chat_messages');
        await collection.updateOne(
          { _id: `chat_${boardId}_${message.id}` },
          { $set: { ...message, messageId: message.id, _id: `chat_${boardId}_${message.id}` } },
          { upsert: true }
        );
      } catch (err) {
        const messages = chatFallback.get(boardId) || [];
        if (!messages.some(existing => existing.id === message.id)) messages.push(message);
        chatFallback.set(boardId, messages.slice(-100));
      }
      return res.status(200).json({ success: true, message });
    }

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
          message: notification.message || '',
          sealed: notification.sealed || null,
          e2ee: notification.e2ee === true,
          boardId: notification.boardId,
          boardName: notification.boardName,
          inviteCode: notification.inviteCode,
          taskId: notification.taskId,
          taskTitle: notification.taskTitle,
          task: notification.task,
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
        if (inviteDoc?.encryptedEnvelope) {
          const members = Array.isArray(inviteDoc.members) ? [...inviteDoc.members] : [];
          const cleanEmail = String(joinUser.email || '').trim().toLowerCase();
          if (cleanEmail && !members.some(m => String(m.email || '').trim().toLowerCase() === cleanEmail)) {
            members.push({
              id: joinUser.id || `m_${Date.now()}`,
              name: joinUser.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              color: joinUser.color || '#10B981',
              avatar: joinUser.avatar || '',
              role: 'editor',
              joinedAt: new Date().toISOString()
            });
            await collection.updateOne({ _id: `invite_${rawCode}` }, { $set: { members, updatedAt: new Date().toISOString() } });
          }
          return res.status(200).json({ success: true, encryptedEnvelope: inviteDoc.encryptedEnvelope, members });
        }
        let targetBoard = inviteDoc?.board;
        let ownerEmail = inviteDoc?.ownerEmail;

        if (!targetBoard && !inviteDoc) {
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
            directoryProfile: directoryProfile || undefined,
            updatedAt,
            lastClientIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
          } 
        },
        { upsert: true }
      );

      // Publish only encrypted board payloads for secure invite links.
      if (Array.isArray(boardInvites)) {
        for (const invite of boardInvites) {
          const code = String(invite.inviteCode || '').trim().toUpperCase();
          if (!code || typeof invite.envelope !== 'string') continue;
          await collection.updateOne(
            { _id: `invite_${code}` },
            { $set: { encryptedEnvelope: invite.envelope, ownerEmail: invite.ownerEmail || null, updatedAt }, $unset: { board: '', inviter: '' } },
            { upsert: true }
          );
        }
      }

      // Legacy plaintext snapshots are no longer indexed for board invites.
      if (data?.encrypted !== true && Array.isArray(data?.boards)) {
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
