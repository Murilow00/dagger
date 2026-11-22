import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { save } from '@/lib/server/db.js';
import { getIdx } from '@/lib/server/srd.js';
import { buildLevelUp, applyLevelUp, clampState } from '@/lib/rules.js';
import { ownedCharacter, refreshTables } from '@/lib/server/characters.js';

export const POST = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params; const idx = getIdx();
  const ch = ownedCharacter(user, id);
  const entry = buildLevelUp(ch, await readBody(req), idx);
  const next = applyLevelUp(ch, entry);
  next.state = clampState(next, idx);
  Object.assign(ch, next); save(); refreshTables(id);
  return { character: ch };
});
