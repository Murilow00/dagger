import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { db, save, inviteCode } from '@/lib/server/db.js';
import { campaignFor, ownedCampaign, campaignView } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

export const dynamic = 'force-dynamic';

export const GET = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  return { campaign: campaignView(campaignFor(user, id), user) };
});

export const PATCH = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = ownedCampaign(user, id); const b = await readBody(req);
  if (typeof b.name === 'string' && b.name.trim().length >= 2) c.name = b.name.trim().slice(0, 60);
  if (typeof b.description === 'string') c.description = b.description.slice(0, 500);
  if (b.regenerateInvite) c.inviteCode = inviteCode();
  save(); publish(c.id, 'refresh', {});
  return { campaign: campaignView(c, user) };
});

export const DELETE = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = ownedCampaign(user, id);
  db().campaigns = db().campaigns.filter(x => x.id !== c.id);   // as rolagens e o aviso de exclusão saem junto, em store.js
  return { ok: true };
});
