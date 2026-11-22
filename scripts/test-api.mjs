// Teste de integração: precisa do servidor rodando (npm run dev) em BASE (padrão http://localhost:3000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3000';
const srd = JSON.parse(fs.readFileSync(new URL('../public/data/srd.json', import.meta.url)));

class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async call(method, path, body, expect) {
    const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie: this.cookie, origin: BASE }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie'); if (set) this.cookie = set.split(';')[0];
    const data = await res.json().catch(() => ({}));
    if (expect != null) assert.equal(res.status, expect, `${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
    return data;
  }
}
const sfx = Math.random().toString(36).slice(2, 7);
const gm = new Client('gm'), p1 = new Client('p1'), p2 = new Client('p2');
await gm.call('POST', '/api/auth/register', { username: 'mestre' + sfx, displayName: 'Mestre', password: 'senha-forte-1' }, 200);
await p1.call('POST', '/api/auth/register', { username: 'ana' + sfx, displayName: 'Ana', password: 'senha-forte-2' }, 200);
await p2.call('POST', '/api/auth/register', { username: 'beto' + sfx, displayName: 'Beto', password: 'senha-forte-3' }, 200);
await gm.call('POST', '/api/auth/register', { username: 'mestre' + sfx, password: 'x' }, 400);
await new Client('x').call('GET', '/api/characters', null, 401);
await new Client('x').call('POST', '/api/auth/login', { username: 'mestre' + sfx, password: 'errada!!' }, 401);

const wiz = srd.classes.find(c => c.name === 'Wizard');
const input = {
  name: 'Lyra', pronouns: 'ela', classId: 'Wizard', subclassId: wiz.subclasses[0], ancestry: { a: 'Elf', b: null }, community: 'Loreborne',
  traits: wiz.suggested.traits, experiences: [{ name: 'Bibliotecária' }, { name: 'Curiosa demais' }],
  weapons: { primary: wiz.suggested.primary, secondary: srd.weapons.find(w => w.slot === 'secondary' && w.tier === 1).name }, armor: wiz.suggested.armor,
  domainCards: srd.cards.filter(c => c.level === 1 && wiz.domains.includes(c.domain)).slice(0, 2).map(c => c.name),
  startingChoices: { potion: 'stamina', classItem: wiz.classItems[0] },
};
const prim = srd.weapons.find(w => w.name === input.weapons.primary);
if (prim.burden === 'two') input.weapons.secondary = null;

await p1.call('POST', '/api/characters', { ...input, traits: { ...input.traits, agility: 5 } }, 400);
const { character } = await p1.call('POST', '/api/characters', input, 200);
assert.equal(character.state.hope, 2);
const { character: c2 } = await p2.call('POST', '/api/characters', { ...input, name: 'Outro' }, 200);

const { id: cid } = await gm.call('POST', '/api/campaigns', { name: 'Reino de Cinzas' }, 200);
const view = (await gm.call('GET', `/api/campaigns/${cid}`, null, 200)).campaign;
assert.ok(view.inviteCode && view.isGm);
const join = await new Client('anon').call('GET', `/api/join/${view.inviteCode}`, null, 200);
assert.equal(join.campaign.name, 'Reino de Cinzas');
await new Client('anon').call('GET', '/api/join/ZZZZZZZZ', null, 404);
await p1.call('POST', `/api/join/${view.inviteCode}`, { characterId: character.id }, 200);
await p2.call('POST', `/api/join/${view.inviteCode}`, {}, 200);
await p2.call('POST', `/api/campaigns/${cid}/characters`, { characterId: c2.id }, 200);

// jogador não vê o convite nem o menu do mestre
const pv = (await p1.call('GET', `/api/campaigns/${cid}`, null, 200)).campaign;
assert.equal(pv.isGm, false); assert.equal(pv.inviteCode, undefined); assert.equal(pv.characters.length, 2);
await p1.call('GET', `/api/campaigns/${cid}/gm`, null, 403);
await p1.call('PUT', `/api/campaigns/${cid}/gm`, { notes: 'hack' }, 403);
await p1.call('POST', `/api/campaigns/${cid}/gm/fear`, { set: 12 }, 403);
await p1.call('PATCH', `/api/campaigns/${cid}`, { name: 'hack' }, 403);
await p1.call('DELETE', `/api/campaigns/${cid}`, null, 403);
await p1.call('DELETE', `/api/campaigns/${cid}/members?userId=${(await gm.call('GET', `/api/campaigns/${cid}`)).campaign.gm.id}`, null, 400);
await new Client('anon').call('GET', `/api/campaigns/${cid}`, null, 401);
const outsider = new Client('out'); await outsider.call('POST', '/api/auth/register', { username: 'fora' + sfx, password: 'senha-forte-4' }, 200);
await outsider.call('GET', `/api/campaigns/${cid}`, null, 403);
await outsider.call('GET', `/api/characters/${character.id}`, null, 403);

// contadores de novidades (tick): consulta leve, sem login
const tick = async () => (await fetch(`${BASE}/api/campaigns/${cid}/tick`)).json();
const t0 = await tick();

// rolagens
const r1 = await p1.call('POST', '/api/rolls', { type: 'duality', characterId: character.id, trait: 'knowledge', experiences: ['e1'], difficulty: 12, advantage: 'adv' }, 200);
assert.ok(r1.roll.result.total >= 2 + 2 + 1); assert.equal(r1.roll.effects.hopeSpent, 1);
const r2 = await p1.call('POST', '/api/rolls', { type: 'damage', characterId: character.id, weapon: 'primary', crit: true }, 200);
assert.ok(r2.roll.result.critBonus > 0);
await p1.call('POST', '/api/rolls', { type: 'dice', expression: '2d6+3', characterId: character.id }, 200);
await p1.call('POST', '/api/rolls', { type: 'dice', expression: '99d99' }, 400);
await p1.call('POST', '/api/rolls', { type: 'duality', characterId: c2.id }, 403);
await p1.call('POST', '/api/rolls', { type: 'duality', characterId: character.id, spendHope: 6 }, 400);
await p1.call('POST', '/api/rolls', { type: 'duality', campaignId: cid, hidden: true }, 403);
const hid = await gm.call('POST', '/api/rolls', { type: 'dice', campaignId: cid, hidden: true, expression: '1d20+4', label: 'Ataque secreto' }, 200);
await gm.call('POST', '/api/rolls', { type: 'dice', campaignId: cid, expression: '1d20', label: 'Ataque público' }, 200);
await new Promise(r => setTimeout(r, 500));

const log1 = (await p1.call('GET', `/api/campaigns/${cid}/rolls`, null, 200)).rolls;
const logGm = (await gm.call('GET', `/api/campaigns/${cid}/rolls`, null, 200)).rolls;
assert.ok(logGm.some(r => r.label === 'Ataque secreto')); assert.ok(!log1.some(r => r.label === 'Ataque secreto'), 'rolagem oculta vazou!');
assert.ok(log1.some(r => r.characterName === 'Lyra')); // visível à mesa
const t1 = await tick();
assert.ok(t1.r > t0.r, 'o contador de rolagens deveria subir');
assert.equal(Object.keys(t1).sort().join(), 'c,r'); // só contadores: nada de conteúdo
// busca incremental: só o que veio depois da última rolagem conhecida
const firstId = log1[0].id;
const after = (await p2.call('GET', `/api/campaigns/${cid}/rolls?after=${firstId}`, null, 200)).rolls;
assert.ok(after.length === log1.length - 1 && after.every(r => r.id !== firstId));
assert.ok(!after.some(r => r.label === 'Ataque secreto'), 'rolagem oculta vazou na busca incremental!');
assert.ok((await gm.call('GET', `/api/campaigns/${cid}/rolls?after=${firstId}`, null, 200)).rolls.some(r => r.label === 'Ataque secreto'));

// concorrência: várias rolagens e alterações ao mesmo tempo não podem se perder
const before = (await gm.call('GET', `/api/campaigns/${cid}/rolls?limit=200`, null, 200)).rolls.length;
await Promise.all(Array.from({ length: 12 }, (_, i) => p1.call('POST', '/api/rolls', { type: 'dice', expression: '1d6', characterId: character.id, label: 'paralela ' + i }, 200)));
await Promise.all(Array.from({ length: 6 }, (_, i) => gm.call('PUT', `/api/campaigns/${cid}/gm`, { notes: 'nota ' + i, encounters: [], environment: null }, 200).catch(() => null)));
const afterAll = (await gm.call('GET', `/api/campaigns/${cid}/rolls?limit=200`, null, 200)).rolls;
assert.equal(afterAll.length, before + 12, 'rolagens simultâneas se perderam');
assert.equal(new Set(afterAll.map(r => r.id)).size, afterAll.length);

// Medo gerado pela mesa, descanso e menu do mestre
const fearBefore = (await gm.call('GET', `/api/campaigns/${cid}`)).campaign.fear;
const rest = await gm.call('POST', `/api/campaigns/${cid}/gm/rest`, { kind: 'long' }, 200);
assert.ok(rest.gain >= 3);
await gm.call('POST', `/api/campaigns/${cid}/gm/fear`, { delta: -99 }, 200);
const enc = { notes: 'segredo', encounters: [{ name: 'Emboscada', active: true, adversaries: [{ name: 'Acid Burrower', ref: 'Acid Burrower', hp: 8, hpMax: 8, stress: 0, stressMax: 3, revealed: true, tier: 1, type: 'Solo' }, { name: 'Oculto', hpMax: 5, hp: 5, revealed: false }] }] };
await gm.call('PUT', `/api/campaigns/${cid}/gm`, enc, 200);
const pv2 = (await p1.call('GET', `/api/campaigns/${cid}`)).campaign;
assert.equal(pv2.revealed[0].adversaries.length, 1); assert.ok(!JSON.stringify(pv2).includes('segredo'));

// edição de ficha: só o dono; limites respeitados
await p2.call('PATCH', `/api/characters/${character.id}`, { state: { hp: 1 } }, 403);
const ed = await p1.call('PATCH', `/api/characters/${character.id}`, { state: { hp: 99, stress: 2, hope: 9 } }, 200);
assert.equal(ed.character.state.hope, 6); assert.ok(ed.character.state.hp <= 6);
const ro = await p2.call('GET', `/api/characters/${character.id}`, null, 200); assert.equal(ro.readOnly, true);
// subir de nível
await p1.call('POST', `/api/characters/${character.id}/levelup`, { advancements: [] }, 400);
// remoção de jogador
await gm.call('DELETE', `/api/campaigns/${cid}/members?userId=${(await p2.call('GET', '/api/me')).user.id}`, null, 200);
await p2.call('GET', `/api/campaigns/${cid}`, null, 403);
console.log('OK: API — contas, convite, permissões do mestre, rolagens, rolagem oculta, atualizações em tempo real, concorrência e regras da ficha.');
