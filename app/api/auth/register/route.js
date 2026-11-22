import { api, readBody, HttpError } from '@/lib/server/http.js';
import { db, save, uid } from '@/lib/server/db.js';
import { hashPassword, startSession, publicUser, throttle } from '@/lib/server/auth.js';

export const POST = api(async (req) => {
  const b = await readBody(req);
  const username = String(b.username || '').trim().toLowerCase();
  const displayName = String(b.displayName || '').trim().slice(0, 30) || username;
  const password = String(b.password || '');
  throttle('reg:' + (req.headers.get('x-forwarded-for') || 'local'), 20);
  if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw new HttpError(400, 'Usuário: 3 a 24 caracteres (letras minúsculas, números, _ . -).');
  if (password.length < 8 || password.length > 100) throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres.');
  if (db().users.some(u => u.username === username)) throw new HttpError(409, 'Esse usuário já existe.');
  const user = { id: uid(), username, displayName, ...hashPassword(password), createdAt: Date.now() };
  db().users.push(user); save();
  await startSession(user);
  return { user: publicUser(user) };
});
