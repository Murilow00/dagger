import { api, readBody, HttpError } from '@/lib/server/http.js';
import { db } from '@/lib/server/db.js';
import { checkPassword, startSession, publicUser, throttle } from '@/lib/server/auth.js';

export const POST = api(async (req) => {
  const b = await readBody(req);
  const username = String(b.username || '').trim().toLowerCase();
  throttle('login:' + username + ':' + (req.headers.get('x-forwarded-for') || 'local'));
  const user = db().users.find(u => u.username === username);
  if (!user || !checkPassword(String(b.password || ''), user)) throw new HttpError(401, 'Usuário ou senha incorretos.');
  await startSession(user);
  return { user: publicUser(user) };
});
