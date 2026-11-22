import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { save } from '@/lib/server/db.js';
import { ownedCampaign } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

export const POST = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = ownedCampaign(user, id); const b = await readBody(req);
  c.fear = Math.max(0, Math.min(12, b.set != null ? parseInt(b.set, 10) || 0 : c.fear + (parseInt(b.delta, 10) || 0)));
  save(); publish(c.id, 'refresh', {});
  return { fear: c.fear };
});
