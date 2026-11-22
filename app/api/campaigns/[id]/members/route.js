import { api, HttpError } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { save } from '@/lib/server/db.js';
import { campaignFor } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

// Mestre remove um jogador, ou o próprio jogador sai da campanha.
export const DELETE = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = campaignFor(user, id);
  const userId = new URL(req.url).searchParams.get('userId') || user.id;
  if (userId === c.ownerId) throw new HttpError(400, 'O mestre não pode sair da própria campanha. Exclua-a se quiser encerrar.');
  if (userId !== user.id && c.ownerId !== user.id) throw new HttpError(403, 'Apenas o mestre pode remover jogadores.');
  c.members = c.members.filter(m => m.userId !== userId);
  c.characters = c.characters.filter(x => x.userId !== userId); save();
  publish(c.id, 'refresh', {});
  return { ok: true };
});
