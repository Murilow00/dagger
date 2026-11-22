import { api, readBody, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save } from '@/lib/server/db.js';
import { nameOf } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

export const dynamic = 'force-dynamic';
const byCode = async (params) => {
  const code = String((await params).code || '').toUpperCase();
  const c = db().campaigns.find(x => x.inviteCode === code);
  if (!c) throw new HttpError(404, 'Convite inválido ou expirado. Peça um novo link ao mestre.');
  return c;
};

export const GET = api(async (req, { params }) => {
  const c = await byCode(params);
  return { campaign: { id: c.id, name: c.name, description: c.description, gmName: nameOf(c.ownerId), players: c.members.length } };
});

export const POST = api(async (req, { params }) => {
  const user = await requireUser(); const c = await byCode(params); const b = await readBody(req).catch(() => ({}));
  if (c.ownerId !== user.id && !c.members.some(m => m.userId === user.id)) {
    if (c.members.length >= 12) throw new HttpError(400, 'A campanha está cheia.');
    c.members.push({ userId: user.id, joinedAt: Date.now() });
  }
  if (b.characterId && c.ownerId !== user.id) {
    const ch = db().characters.find(x => x.id === b.characterId);
    if (ch && ch.ownerId === user.id && !c.characters.some(x => x.characterId === ch.id) && c.characters.filter(x => x.userId === user.id).length < 3)
      c.characters.push({ characterId: ch.id, userId: user.id });
  }
  save(); publish(c.id, 'refresh', {});
  return { id: c.id };
});
