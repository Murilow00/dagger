import { api } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { campaignFor } from '@/lib/server/campaigns.js';
import { rollsFor } from '@/lib/server/rolls.js';

export const dynamic = 'force-dynamic';
export const GET = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const limit = Math.min(200, parseInt(new URL(req.url).searchParams.get('limit'), 10) || 80);
  const after = new URL(req.url).searchParams.get('after') || '';
  return { rolls: await rollsFor(campaignFor(user, id), user, limit, after) };
});
