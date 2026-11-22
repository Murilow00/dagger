import { db, save, uid, rng } from './db.js';
import { als, backend } from './store.js';
import { HttpError } from './http.js';
import { getIdx } from './srd.js';
import { campaignFor, campaignsOfCharacter, nameOf } from './campaigns.js';
import { publish } from './hub.js';
import { rollDuality, rollDamage, rollExpression, parseExpression } from '../dice.js';
import { derive, TRAIT_KEYS, TRAIT_LABEL } from '../rules.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, parseInt(v, 10) || 0));

// A rolagem vai para a lista da campanha quando a requisição termina com sucesso (ver store.js).
export function recordRoll(campaignIds, roll) {
  const ctx = als.getStore();
  for (const id of campaignIds) ctx.pushes.push({ cid: id, roll: { ...roll, campaignId: id } });
}

export function doRoll(user, b) {
  const idx = getIdx();
  const d = db();
  if (!['duality', 'damage', 'dice'].includes(b.type)) throw new HttpError(400, 'Tipo de rolagem inválido.');

  let char = null, dv = null;
  if (b.characterId) {
    char = d.characters.find(c => c.id === b.characterId);
    if (!char) throw new HttpError(404, 'Personagem não encontrado.');
    if (char.ownerId !== user.id) throw new HttpError(403, 'Você só pode rolar com os seus personagens.');
    dv = derive(char, idx);
  }

  let targets = [];
  const hidden = !!b.hidden;
  if (b.campaignId) {
    const c = campaignFor(user, b.campaignId);
    if (char && !c.characters.some(x => x.characterId === char.id)) throw new HttpError(400, 'Esse personagem não está nesta campanha.');
    if (hidden && (c.ownerId !== user.id || char)) throw new HttpError(403, 'Apenas o mestre pode fazer rolagens ocultas.');
    targets = [c];
  } else if (char && !b.private) {
    targets = campaignsOfCharacter(char.id);
  }
  if (hidden && !b.campaignId) throw new HttpError(400, 'Rolagem oculta precisa de uma campanha.');

  let result, label = String(b.label || '').slice(0, 80);
  let cost = 0;

  if (b.type === 'duality') {
    const trait = TRAIT_KEYS.includes(b.trait) ? b.trait : null;
    const exps = char ? dv.experiences.filter(e => (b.experiences || []).includes(e.id)) : [];
    cost = exps.length + (char ? clamp(b.spendHope, 0, 6) : 0);
    const adv = ['adv', 'dis'].includes(b.advantage) ? b.advantage : null;
    result = rollDuality({
      kind: b.kind, traitBonus: char && trait ? dv.traits[trait] : clamp(b.traitBonus, -10, 10), modifier: clamp(b.modifier, -30, 30),
      experiences: exps.map(e => ({ name: e.name, bonus: e.bonus })), advantage: adv,
      advantageDice: clamp(b.advantageDice, 0, 5), disadvantageDice: clamp(b.disadvantageDice, 0, 5), helpAllies: clamp(b.helpAllies, 0, 5),
      difficulty: b.difficulty === '' || b.difficulty == null ? null : clamp(b.difficulty, 0, 60),
    }, rng);
    result.trait = trait; result.traitLabel = trait ? TRAIT_LABEL[trait] : null;
    if (!label) label = (b.kind === 'reaction' ? 'Teste de reação' : 'Teste') + (trait ? ` de ${TRAIT_LABEL[trait]}` : '');
  } else if (b.type === 'damage') {
    if (!char) throw new HttpError(400, 'Escolha um personagem para rolar dano.');
    const w = b.weapon === 'secondary' ? dv.secondary : dv.primary;
    if (!w) throw new HttpError(400, 'Arma não equipada.');
    const drop = w.features.some(f => /additional damage die.*(drop|discard)|extra damage die.*(drop|discard)/i.test(f.text)) ? 1 : 0;
    let bonusExpression = null;
    if (b.bonusExpression) { try { parseExpression(b.bonusExpression); bonusExpression = String(b.bonusExpression); } catch (e) { throw new HttpError(400, e.message); } }
    result = rollDamage({ count: w.dice, die: w.die, mod: w.mod + clamp(b.bonus, -20, 50), crit: !!b.crit, dropLowest: drop, bonusExpression }, rng);
    result.weapon = w.name; result.damageType = w.type;
    if (!label) label = `Dano · ${w.name}${b.crit ? ' (crítico)' : ''}`;
  } else {
    try { result = rollExpression(b.expression, rng); } catch (e) { throw new HttpError(400, e.message); }
    cost = char ? clamp(b.spendHope, 0, 6) : 0;
    if (!label) label = `Rolagem ${result.expression}`;
  }

  // Efeitos nos recursos (Esperança, Fadiga e Medo).
  const effects = { hopeSpent: cost, hopeGained: 0, stressCleared: 0, fearGained: 0 };
  if (char) {
    if (cost > char.state.hope) throw new HttpError(400, `Esperança insuficiente (você tem ${char.state.hope}, precisa de ${cost}).`);
    char.state.hope -= cost;
    if (b.type === 'duality' && result.generatesResources && b.apply !== false) {
      if (result.withHope && char.state.hope < dv.hopeMax) { char.state.hope += 1; effects.hopeGained = 1; }
      if (result.crit && char.state.stress > 0) { char.state.stress -= 1; effects.stressCleared = 1; }
      if (!result.withHope) effects.fearGained = 1;
    }
  }
  if (effects.fearGained) for (const c of targets) c.fear = Math.min(12, c.fear + 1);

  const roll = {
    id: uid(), ts: Date.now(), userId: user.id, userName: user.displayName,
    characterId: char?.id || null, characterName: char?.name || null, colors: dv?.colors || null, classId: char?.classId || null,
    type: b.type, label, hidden, result, effects,
  };
  if (targets.length) recordRoll(targets.map(c => c.id), roll);
  if (char && (cost || effects.hopeGained || effects.stressCleared || effects.fearGained)) for (const c of targets) publish(c.id, 'refresh', {});
  save();
  return { roll, state: char?.state || null, fear: targets.length === 1 ? targets[0].fear : null };
}

// Rolagens da campanha visíveis para o usuário (as ocultas só aparecem para o mestre). `after`: id da última que ele já tem.
export async function rollsFor(campaign, user, limit = 80, after = '') {
  const all = (await backend().rolls(campaign.id, 300)).map(r => JSON.parse(r)).filter(r => !r.hidden || campaign.ownerId === user.id);
  const i = after ? all.findIndex(r => r.id === after) : -1;
  return (i >= 0 ? all.slice(i + 1) : all).slice(-limit);
}
