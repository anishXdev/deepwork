import { promisify } from 'node:util';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const scrypt = promisify(scryptCallback);

export async function authenticateEmail(method, body, getCollection) {
  if (method !== 'POST') return { status: 405, data: { error: 'Method not allowed.' } };

  const action = body?.action;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';

  if (!['signup', 'signin'].includes(action)) return { status: 400, data: { error: 'Choose sign in or sign up.' } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { status: 400, data: { error: 'Enter a valid email address.' } };
  }
  if (password.length < 8 || password.length > 128) {
    return { status: 400, data: { error: 'Password must be between 8 and 128 characters.' } };
  }
  if (action === 'signup' && !name) return { status: 400, data: { error: 'Enter your name.' } };

  try {
    const users = await getCollection();
    await users.createIndex({ email: 1 }, { unique: true });

    if (action === 'signup') {
      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = {
        _id: randomUUID(),
        email,
        name,
        salt,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      await users.insertOne(user);
      return {
        status: 201,
        data: { success: true, isNewAccount: true, profile: { id: user._id, name: user.name, email: user.email } }
      };
    }

    const user = await users.findOne({ email });
    if (!user) return { status: 401, data: { error: 'Invalid email or password.' } };
    const candidate = await scrypt(password, user.salt, 64);
    const stored = Buffer.from(user.passwordHash, 'hex');
    if (stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
      return { status: 401, data: { error: 'Invalid email or password.' } };
    }
    return {
      status: 200,
      data: { success: true, profile: { id: user._id, name: user.name, email: user.email } }
    };
  } catch (error) {
    if (error?.code === 11000) return { status: 409, data: { error: 'An account with this email already exists. Sign in instead.' } };
    console.error('[EmailAuth] Authentication request failed:', error?.message || error);
    return { status: 503, data: { error: 'Email sign-in is temporarily unavailable. Please try again.' } };
  }
}
