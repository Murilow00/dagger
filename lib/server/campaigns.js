import { db } from './db.js';
import { HttpError } from './http.js';
import { getIdx } from './srd.js';
import { publicSummary } from '../rules.js';

export const isMember = (c, userId) => c.ownerId === userId || c.members.some(m => m.userId === userId);

export function campaignFor(user, id) {
  const c = db().campaigns.find(x => x.id === id);
  if (!c) throw new HttpError(404, 'Campanha não encontrada.');
  if (!isMember(c, user.id)) throw new HttpError(403, 'Você não participa desta campanha.');
  return c;
}
export function ownedCampaign(user, id) {
  const c = campaignFor(user, id);
  if (c.ownerId !== user.id) throw new HttpError(403, 'Apenas o mestre pode fazer isso.');
  return c;
}
export const campaignsOfCharacter = (characterId) => db().campaigns.filter(c => c.characters.some(x => x.characterId === characterId));
export const nameOf = (userId) => db().users.find(u => u.id === userId)?.displayName || 'Jogador';

// Visão da campanha para um participante. Dados do mestre (notas, encontros ocultos, convite) ficam de fora dos jogadores.
export function campaignView(c, user) {
  const idx = getIdx();
  const isGm = c.ownerId === user.id;
  const characters = c.characters.map(link => {
    const ch = db().characters.find(x => x.id === link.characterId);
    if (!ch) return null;
    return { ...publicSummary(ch, idx), ownerId: ch.ownerId, ownerName: nameOf(ch.ownerId) };
  }).filter(Boolean);
  const revealed = (c.gm?.encounters || []).filter(e => e.active).map(e => ({
    id: e.id, name: e.name, environment: e.revealEnvironment ? e.environment : null,
    adversaries: e.adversaries.filter(a => a.revealed).map(a => ({ id: a.id, name: a.name, hp: a.hp, hpMax: a.hpMax, stress: a.stress, stressMax: a.stressMax, tier: a.tier, type: a.type })),
  })).filter(e => e.adversaries.length || e.environment);
  return {
    id: c.id, name: c.name, description: c.description, isGm,
    gm: { id: c.ownerId, name: nameOf(c.ownerId) },
    members: [c.ownerId, ...c.members.map(m => m.userId)].map(id => ({ id, name: nameOf(id), isGm: id === c.ownerId })),
    fear: c.fear, characters, revealed,
    ...(isGm ? { inviteCode: c.inviteCode } : {}),
  };
}
