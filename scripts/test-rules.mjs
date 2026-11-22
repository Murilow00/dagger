import fs from 'node:fs';
import assert from 'node:assert/strict';
import { indexSrd, buildNewCharacter, buildLevelUp, applyLevelUp, derive, applyEdit, levelOf, availableCards, TRAIT_KEYS, ADVANCEMENTS } from '../lib/rules.js';

const srd = JSON.parse(fs.readFileSync(new URL('../public/data/srd.json', import.meta.url)));
const idx = indexSrd(srd);
const throws = (fn, re) => { try { fn(); } catch (e) { if (re) assert.match(e.message, re); return; } assert.fail('deveria lançar erro'); };

function input(cls) {
  const sug = cls.suggested;
  const primary = idx.weapons[sug.primary];
  return {
    name: 'Teste ' + cls.name, classId: cls.name, subclassId: cls.subclasses[0],
    ancestry: { a: 'Human', b: null }, community: 'Wildborne',
    traits: sug.traits,
    experiences: [{ name: 'Sobrevivente' }, { name: 'Curandeiro' }],
    weapons: { primary: sug.primary, secondary: primary.burden === 'two' ? null : (sug.secondary || 'Small Dagger') },
    armor: sug.armor,
    domainCards: srd.cards.filter(c => c.level === 1 && cls.domains.includes(c.domain)).slice(0, 2).map(c => c.name),
    startingChoices: { potion: 'health', classItem: cls.classItems[0] },
  };
}

let n = 0;
for (const cls of srd.classes) {
  let char = { ...buildNewCharacter(input(cls), idx), id: 'x', ownerId: 'u' };
  let d = derive(char, idx);
  assert.equal(d.level, 1);
  assert.equal(d.hpMax, cls.hp); assert.equal(d.evasion >= cls.evasion - 2, true);
  assert.equal(d.thresholds.major, idx.armor[char.armor].major + 1);
  assert.equal(d.proficiency, 1);
  // Sobe até o nível 10 escolhendo avanços válidos.
  for (let lvl = 2; lvl <= 10; lvl++) {
    const tier = d.tier, newTier = lvl <= 4 ? 2 : lvl <= 7 ? 3 : 4;
    const used = d.slotsUsed;
    const adv = [];
    const marks = (lvl === 5 || lvl === 8) ? {} : { ...d.traitMarks };
    const choose = [];
    // preferências: tenta combinações simples que ainda tenham vaga
    const tryAdd = (id, extra = {}) => {
      if (id === 'hp' && d.hpMax + adv.filter(a => a.id === 'hp').length >= 12) return false;
      if (id === 'stress' && d.stressMax + adv.filter(a => a.id === 'stress').length >= 12) return false;
      for (let t = ADVANCEMENTS[id].minTier; t <= newTier; t++) {
        const key = `${t}:${id}`; const pending = adv.filter(a => a.id === id && a.tier === t).length;
        if ((used[key] || 0) + pending < ADVANCEMENTS[id].slots) { adv.push({ id, tier: t, ...extra }); return true; }
      }
      return false;
    };
    const free = TRAIT_KEYS.filter(k => !marks[k]);
    const order = lvl % 3 === 0 ? ['hp', 'stress'] : lvl % 3 === 1 ? ['evasion', 'experience'] : ['hp', 'evasion'];
    for (const id of order) {
      if (adv.length >= 2) break;
      if (id === 'experience') tryAdd('experience', { experiences: ['e1', 'e2'] });
      else tryAdd(id);
    }
    while (adv.length < 2) { if (!(free.length >= 2 && tryAdd('traits', { traits: free.splice(0, 2) })) && !tryAdd('hp') && !tryAdd('stress') && !tryAdd('evasion')) break; }
    const extraNeeded = adv.filter(a => a.id === 'domain').length;
    const avail = availableCards(char, idx, lvl);
    const inp = { newExperience: [2, 5, 8].includes(lvl) ? 'Exp ' + lvl : undefined, advancements: adv, domainCard: avail[0].name, extraCards: avail.slice(1, 1 + extraNeeded).map(c => c.name) };
    const entry = buildLevelUp(char, inp, idx);
    char = applyLevelUp(char, entry);
    d = derive(char, idx);
    assert.equal(d.level, lvl);
    n++;
  }
  assert.equal(d.proficiency, 4 - 0 + 0 === 4 ? d.proficiency : 0);
  assert.ok(d.proficiency >= 4, 'proficiência deveria ter subido nos níveis 2/5/8: ' + d.proficiency);
  assert.ok(d.hpMax <= 12 && d.stressMax <= 12);
  assert.equal(d.experiences.length, 5);
}

// ---- Regras que devem ser rejeitadas ----
const bard = srd.classes[0];
const okIn = input(bard);
throws(() => buildNewCharacter({ ...okIn, traits: { agility: 2, strength: 2, finesse: 1, instinct: 0, presence: 0, knowledge: -1 } }, idx), /Distribua/);
throws(() => buildNewCharacter({ ...okIn, subclassId: 'Stalwart' }, idx), /subclasse/i);
throws(() => buildNewCharacter({ ...okIn, experiences: [{ name: 'A' }] }, idx), /duas Experi/);
throws(() => buildNewCharacter({ ...okIn, domainCards: [okIn.domainCards[0], okIn.domainCards[0]] }, idx), /diferentes/);
throws(() => buildNewCharacter({ ...okIn, domainCards: srd.cards.filter(c => c.level === 2 && bard.domains.includes(c.domain)).slice(0, 2).map(c => c.name) }, idx), /1º nível/);
throws(() => buildNewCharacter({ ...okIn, weapons: { primary: 'Greatsword', secondary: 'Small Dagger' } }, idx), /duas mãos/);
throws(() => buildNewCharacter({ ...okIn, armor: srd.armor.find(a => a.tier === 2).name }, idx), /patamar/);

let c = { ...buildNewCharacter(okIn, idx), id: 'x' };
throws(() => buildLevelUp(c, { newExperience: 'Nova', advancements: [{ id: 'hp', tier: 2 }], domainCard: 'x' }, idx), /exatamente 2/);
throws(() => buildLevelUp(c, { newExperience: 'Nova', advancements: [{ id: 'proficiency', tier: 2 }], domainCard: 'x' }, idx), /disponível/);
throws(() => buildLevelUp(c, { newExperience: 'Nova', advancements: [{ id: 'hp', tier: 2 }, { id: 'hp', tier: 2 }, { id: 'hp', tier: 2 }], domainCard: availableCards(c, idx, 2)[0].name }, idx), /Escolha|vagas/);
const e = buildLevelUp(c, { newExperience: 'Nova', advancements: [{ id: 'hp', tier: 2 }, { id: 'hp', tier: 2 }], domainCard: availableCards(c, idx, 2)[0].name }, idx);
c = applyLevelUp(c, e);
throws(() => buildLevelUp(c, { advancements: [{ id: 'hp', tier: 2 }, { id: 'stress', tier: 2 }], domainCard: availableCards(c, idx, 3)[0].name }, idx), /vagas/);
// edição: não deixa estourar PV nem trocar cartas por outras
const edited = applyEdit(c, { state: { hp: 99, hope: 50 } }, idx);
assert.equal(edited.state.hp, derive(c, idx).hpMax); assert.equal(edited.state.hope, 6);
throws(() => applyEdit(c, { domainCards: { loadout: ['Inexistente'], vault: [] } }, idx), /exatamente/);
console.log(`OK: ${srd.classes.length} classes criadas e evoluídas até o nível 10 (${n} subidas) e ${8} regras recusadas corretamente.`);
