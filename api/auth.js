import { MongoClient } from 'mongodb';
import { authenticateEmail } from './emailAuth.js';

const MONGODB_URI = process.env.MONGODB_URI;
let clientPromise;

async function getUsers() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect().catch(error => {
      clientPromise = null;
      throw error;
    });
  }
  const client = await clientPromise;
  return client.db('studypulse').collection('auth_users');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const result = await authenticateEmail(req.method, body, getUsers);
  return res.status(result.status).json(result.data);
}
