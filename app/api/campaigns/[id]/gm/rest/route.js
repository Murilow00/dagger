import { api, readBody, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { save, uid, rng } from '@/lib/server/db.js';
import { ownedCampaign } from '@/lib/server/campaigns.js';
import { recordRoll } from '@/lib/server/rolls.js';
import { publish } from '@/lib/server/hub.js';

// Descanso: o mestre recebe Medo (curto: 1d4; longo: nº de personagens + 1d4).
export const POST = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = ownedCampaign(user, id); const b = await readBody(req);
  if (!['short', 'long'].includes(b.kind)) throw new HttpError(400, 'Tipo de descanso inválido.');
  const die = rng(4); const chars = c.characters.length;
  const gain = b.kind === 'short' ? die : die + chars;
  c.fear = Math.min(12, c.fear + gain);
  recordRoll([c.id], { id: uid(), ts: Date.now(), userId: user.id, userName: user.displayName, type: 'rest', label: b.kind === 'short' ? 'Descanso curto' : 'Descanso longo', hidden: false, result: { die, chars, gain, kind: b.kind }, effects: {} });
  save(); publish(c.id, 'refresh', {});
  return { fear: c.fear, gain };
});
