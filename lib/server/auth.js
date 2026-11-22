import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db, save, uid } from './db.js';
import { HttpError } from './http.js';

const COOKIE = 'dh_session';
const DAYS = 30;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
export function checkPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

export async function startSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const d = db();
  d.sessions = d.sessions.filter(s => s.expires > Date.now());
  d.sessions.push({ id: sha(token), userId: user.id, expires: Date.now() + DAYS * 864e5 });
  save();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: DAYS * 86400,
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) { const d = db(); d.sessions = d.sessions.filter(s => s.id !== sha(token)); save(); }
  jar.delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = db().sessions.find(x => x.id === sha(token) && x.expires > Date.now());
  return s ? db().users.find(u => u.id === s.userId) || null : null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'Entre na sua conta para continuar.');
  return u;
}

export const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName });

// Limitador simples de tentativas de login (em memória).
const attempts = (globalThis.__dh_attempts ||= new Map());
export function throttle(key, max = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  list.push(now); attempts.set(key, list);
}
export const newUserId = uid;
