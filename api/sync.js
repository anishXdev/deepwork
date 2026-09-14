// Vercel Serverless Function for cross-device cloud sync
// In-memory store across active instances; can be backed by KV or cloud store in production

const syncMemoryStore = new Map();

export default async function handler(req, res) {
  // Enable CORS for mobile / web clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { key } = req.query;

  if (req.method === 'GET') {
    if (!key) {
      return res.status(400).json({ error: 'Missing sync key parameter' });
    }

    const payload = syncMemoryStore.get(key);
    if (!payload) {
      return res.status(200).json({
        found: false,
        message: 'No remote cloud data found for this sync key yet.'
      });
    }

    return res.status(200).json({
      found: true,
      data: payload.data,
      updatedAt: payload.updatedAt
    });
  }

  if (req.method === 'POST') {
    const { key: bodyKey, data } = req.body || {};
    const targetKey = bodyKey || key;

    if (!targetKey || !data) {
      return res.status(400).json({ error: 'Missing key or data payload' });
    }

    const updatedAt = new Date().toISOString();
    syncMemoryStore.set(targetKey, { data, updatedAt });

    return res.status(200).json({
      success: true,
      updatedAt,
      message: 'Cloud sync snapshot saved successfully.'
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
