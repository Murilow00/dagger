import { api, readBody, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save, uid, inviteCode } from '@/lib/server/db.js';
import { isMember, nameOf } from '@/lib/server/campaigns.js';

export const dynamic = 'force-dynamic';

export const GET = api(async () => {
  const user = await requireUser();
  return {
    campaigns: db().campaigns.filter(c => isMember(c, user.id)).map(c => ({
      id: c.id, name: c.name, description: c.description, isGm: c.ownerId === user.id, gmName: nameOf(c.ownerId),
      players: c.members.length, myCharacters: c.characters.filter(x => x.userId === user.id).length,
    })),
  };
});

export const POST = api(async (req) => {
  const user = await requireUser(); const b = await readBody(req);
  const name = String(b.name || '').trim().slice(0, 60);
  if (name.length < 2) throw new HttpError(400, 'Dê um nome à campanha.');
  if (db().campaigns.filter(c => c.ownerId === user.id).length >= 20) throw new HttpError(400, 'Limite de 20 campanhas atingido.');
  const c = { id: uid(), ownerId: user.id, name, description: String(b.description || '').slice(0, 500), inviteCode: inviteCode(), members: [], characters: [], fear: 0, gm: { notes: '', encounters: [] }, createdAt: Date.now() };
  db().campaigns.push(c); save();
  return { id: c.id };
});
