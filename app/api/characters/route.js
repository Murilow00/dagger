import { api, readBody, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save, uid } from '@/lib/server/db.js';
import { getIdx } from '@/lib/server/srd.js';
import { buildNewCharacter, publicSummary } from '@/lib/rules.js';
import { campaignsOfCharacter } from '@/lib/server/campaigns.js';

export const dynamic = 'force-dynamic';

export const GET = api(async () => {
  const user = await requireUser(); const idx = getIdx();
  return { characters: db().characters.filter(c => c.ownerId === user.id).map(c => ({ ...publicSummary(c, idx), campaigns: campaignsOfCharacter(c.id).map(x => ({ id: x.id, name: x.name })) })) };
});

export const POST = api(async (req) => {
  const user = await requireUser(); const idx = getIdx();
  if (db().characters.filter(c => c.ownerId === user.id).length >= 40) throw new HttpError(400, 'Limite de 40 personagens atingido.');
  const char = { ...buildNewCharacter(await readBody(req), idx), id: uid(), ownerId: user.id, createdAt: Date.now() };
  db().characters.push(char); save();
  return { character: char };
});
