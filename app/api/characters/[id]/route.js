import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save } from '@/lib/server/db.js';
import { getIdx } from '@/lib/server/srd.js';
import { applyEdit } from '@/lib/rules.js';
import { campaignsOfCharacter } from '@/lib/server/campaigns.js';
import { characterFor, ownedCharacter, refreshTables } from '@/lib/server/characters.js';
import { publish } from '@/lib/server/hub.js';

export const dynamic = 'force-dynamic';

export const GET = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const { ch, owner } = characterFor(user, id);
  return { character: ch, readOnly: !owner, campaigns: campaignsOfCharacter(id).map(c => ({ id: c.id, name: c.name })) };
});

export const PATCH = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const ch = ownedCharacter(user, id);
  const next = applyEdit(ch, await readBody(req), getIdx());
  Object.assign(ch, next); save(); refreshTables(id);
  return { character: ch };
});

export const DELETE = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  ownedCharacter(user, id);
  const tables = campaignsOfCharacter(id);
  for (const c of tables) c.characters = c.characters.filter(x => x.characterId !== id);
  db().characters = db().characters.filter(c => c.id !== id); save();
  for (const c of tables) publish(c.id, 'refresh', {});
  return { ok: true };
});
