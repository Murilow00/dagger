import { api, readBody, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save } from '@/lib/server/db.js';
import { campaignFor } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

export const POST = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = campaignFor(user, id); const b = await readBody(req);
  const ch = db().characters.find(x => x.id === b.characterId);
  if (!ch || ch.ownerId !== user.id) throw new HttpError(404, 'Personagem não encontrado.');
  if (c.ownerId === user.id) throw new HttpError(400, 'O mestre não participa com personagens jogadores.');
  if (c.characters.some(x => x.characterId === ch.id)) throw new HttpError(409, 'Esse personagem já está na campanha.');
  if (c.characters.filter(x => x.userId === user.id).length >= 3) throw new HttpError(400, 'Cada jogador pode levar até 3 personagens por campanha.');
  c.characters.push({ characterId: ch.id, userId: user.id }); save();
  publish(c.id, 'refresh', {});
  return { ok: true };
});

export const DELETE = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = campaignFor(user, id);
  const characterId = new URL(req.url).searchParams.get('characterId');
  const link = c.characters.find(x => x.characterId === characterId);
  if (!link) throw new HttpError(404, 'Personagem não está na campanha.');
  if (link.userId !== user.id && c.ownerId !== user.id) throw new HttpError(403, 'Sem permissão.');
  c.characters = c.characters.filter(x => x !== link); save();
  publish(c.id, 'refresh', {});
  return { ok: true };
});
