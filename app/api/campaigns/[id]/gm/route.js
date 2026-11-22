import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { save, uid } from '@/lib/server/db.js';
import { ownedCampaign } from '@/lib/server/campaigns.js';
import { publish } from '@/lib/server/hub.js';

export const dynamic = 'force-dynamic';
const s = (v, n) => String(v ?? '').slice(0, n);
const i = (v, lo, hi) => Math.max(lo, Math.min(hi, parseInt(v, 10) || 0));

function cleanGm(b) {
  return {
    notes: s(b.notes, 20000),
    encounters: (Array.isArray(b.encounters) ? b.encounters : []).slice(0, 30).map(e => ({
      id: s(e.id, 30) || uid(), name: s(e.name, 60) || 'Encontro', active: !!e.active,
      environment: e.environment ? s(e.environment, 80) : null, revealEnvironment: !!e.revealEnvironment, notes: s(e.notes, 2000),
      adversaries: (Array.isArray(e.adversaries) ? e.adversaries : []).slice(0, 40).map(a => ({
        id: s(a.id, 30) || uid(), ref: s(a.ref, 80), name: s(a.name, 80), tier: i(a.tier, 0, 4), type: s(a.type, 30),
        difficulty: i(a.difficulty, 0, 40), hpMax: i(a.hpMax, 0, 60), hp: i(a.hp, 0, 60), stressMax: i(a.stressMax, 0, 30), stress: i(a.stress, 0, 30),
        revealed: !!a.revealed, notes: s(a.notes, 400),
      })),
    })),
  };
}

export const GET = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  return { gm: ownedCampaign(user, id).gm };
});

export const PUT = api(async (req, { params }) => {
  const user = await requireUser(); const { id } = await params;
  const c = ownedCampaign(user, id);
  c.gm = cleanGm(await readBody(req)); save();
  publish(c.id, 'refresh', {});
  return { gm: c.gm };
});
