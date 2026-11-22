// Regras de personagem do Daggerheart (SRD 1.0). Funções puras, usadas no servidor (validação)
// e no navegador (ficha, assistente de criação, subida de nível).

export const TRAIT_KEYS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
export const TRAIT_LABEL = { agility: 'Agilidade', strength: 'Força', finesse: 'Acuidade', instinct: 'Instinto', presence: 'Presença', knowledge: 'Conhecimento' };
export const TRAIT_VERBS = {
  agility: 'Correr, Equilibrar-se, Saltar', strength: 'Agarrar, Levantar, Romper', finesse: 'Esconder-se, Manipular, Manobrar',
  instinct: 'Perceber, Pressentir, Orientar', presence: 'Comover, Convencer, Enganar', knowledge: 'Analisar, Aprender, Lembrar',
};
export const TRAIT_VALUES = [2, 1, 1, 0, 0, -1];
export const RANGE_PT = { 'Melee': 'Corpo a corpo', 'Very Close': 'Muito próximo', 'Close': 'Próximo', 'Far': 'Distante', 'Very Far': 'Muito distante' };
export const CLASS_PT = { Bard: 'Bardo', Druid: 'Druida', Guardian: 'Guardião', Ranger: 'Patrulheiro', Rogue: 'Ladino', Seraph: 'Serafim', Sorcerer: 'Feiticeiro', Warrior: 'Guerreiro', Wizard: 'Mago' };
export const DOMAIN_PT = { Arcana: 'Arcano', Blade: 'Lâmina', Bone: 'Falange', Codex: 'Códice', Grace: 'Graça', Midnight: 'Meia-noite', Sage: 'Sabedoria', Splendor: 'Esplendor', Valor: 'Valor' };
export const ADV_TYPE_PT = { Solo: 'Solo', Minion: 'Lacaio', Leader: 'Líder', Ranged: 'À distância', Horde: 'Horda', Skulk: 'Espreitador', Bruiser: 'Brutamontes', Standard: 'Padrão', Social: 'Social', Support: 'Suporte' };
export const ENV_TYPE_PT = { Exploration: 'Exploração', Event: 'Evento', Social: 'Social', Traversal: 'Travessia' };
// Nome (pt-BR) de uma entrada do SRD a partir do que o personagem guarda (id em inglês ou nome já traduzido).
export const nameOf = (idx, kind, key) => (idx && idx[kind] && idx[kind][key] && idx[kind][key].name) || key;
export const CARD_TYPE_PT = { Ability: 'Habilidade', Spell: 'Feitiço', Grimoire: 'Grimório' };

// Cor da classe (primeira cor da ficha) e cor do antecedente/comunidade (segunda cor da ficha).
export const CLASS_COLORS = {
  Bard: '#d1498d', Druid: '#4aa04a', Guardian: '#a8742a', Ranger: '#1f8f8a', Rogue: '#5b6a86',
  Seraph: '#e6c35c', Sorcerer: '#8b4fd6', Warrior: '#cf3d33', Wizard: '#2f72dd',
};
export const COMMUNITY_COLORS = {
  Highborne: '#c9a227', Loreborne: '#c08a52', Orderborne: '#8d99a6', Ridgeborne: '#a65f3a', Seaborne: '#1f9fb0',
  Slyborne: '#9a4f78', Underborne: '#8a7f6a', Wanderborne: '#d38b3f', Wildborne: '#4c8a4a',
};

export const DOMAIN_COLORS = {
  Arcana: '#8f5bd6', Blade: '#c0453a', Bone: '#a89f86', Codex: '#4a63c9', Grace: '#d86a9a',
  Midnight: '#5f4f9a', Sage: '#4a9a5a', Splendor: '#d8b23c', Valor: '#d9792e',
};

// Cor de texto legível sobre um fundo (para os dois lados da ficha).
export function readableOn(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? '#14182c' : '#ffffff';
}

export const MAX_LEVEL = 10;
export const MAX_LOADOUT = 5;
export const tierOf = (level) => (level <= 1 ? 1 : level <= 4 ? 2 : level <= 7 ? 3 : 4);
export const ACHIEVEMENT_LEVELS = [2, 5, 8]; // nova Experiência +2 e Proficiência +1
export const CLEAR_MARK_LEVELS = [5, 8];     // remove as marcações de atributos

// Avanços por patamar (ficha oficial): slots = quantas vezes cada opção pode ser escolhida no patamar.
// cost = quantos dos dois avanços do nível a opção consome.
export const ADVANCEMENTS = {
  traits: { label: 'Atributos', desc: 'Escolha dois atributos desmarcados, marque-os e receba +1 em cada.', slots: 3, cost: 1, minTier: 2 },
  hp: { label: 'Pontos de Vida', desc: 'Aumente seus PV em 1 permanentemente.', slots: 2, cost: 1, minTier: 2 },
  stress: { label: 'Pontos de Fadiga', desc: 'Aumente seus PF em 1 permanentemente.', slots: 2, cost: 1, minTier: 2 },
  experience: { label: 'Experiências', desc: 'Receba +1 em duas Experiências permanentemente.', slots: 1, cost: 1, minTier: 2 },
  domain: { label: 'Carta de domínio extra', desc: 'Escolha uma nova carta de domínio de nível igual ou menor que o seu.', slots: 1, cost: 1, minTier: 2 },
  evasion: { label: 'Evasão', desc: 'Aumente sua Evasão em +1 permanentemente.', slots: 1, cost: 1, minTier: 2 },
  subclass: { label: 'Subclasse aprimorada', desc: 'Pegue a próxima carta da sua subclasse (especialização ou maestria). Corta a opção de multiclasse deste patamar.', slots: 1, cost: 1, minTier: 3 },
  proficiency: { label: 'Proficiência', desc: 'Aumente sua Proficiência em +1 (gasta os dois avanços do nível).', slots: 1, cost: 2, minTier: 3 },
  multiclass: { label: 'Multiclasse', desc: 'Escolha uma classe adicional (gasta os dois avanços do nível). Só uma vez; corta a subclasse aprimorada deste patamar.', slots: 1, cost: 2, minTier: 3 },
};

const bad = (msg) => { const e = new Error(msg); e.status = 400; return e; };

// ---------- Índices do SRD ----------
export function indexSrd(srd) {
  // Indexa por id (inglês, estável) e por nome (pt-BR): personagens antigos guardam o id, os novos guardam o nome.
  const by = (arr) => Object.fromEntries([...arr.map(x => [x.id || x.name, x]), ...arr.map(x => [x.name, x])]);
  return {
    srd,
    classes: by(srd.classes), subclasses: by(srd.subclasses), ancestries: by(srd.ancestries), communities: by(srd.communities),
    domains: by(srd.domains), cards: by(srd.cards), weapons: by(srd.weapons), armor: by(srd.armor),
  };
}

// ---------- Replay do histórico de níveis ----------
function emptyAcc() {
  return { evasion: 0, hp: 0, stress: 0, prof: 0, achProf: 0, traitBonus: {}, traitMarks: {}, expBonus: {}, sub: 0, multiclass: null, slots: {}, tierFlags: {}, extraCards: 0 };
}

function applyEntry(acc, entry, level, char, idx, expIds) {
  const tier = tierOf(level);
  const cls = idx.classes[char.classId];
  if (ACHIEVEMENT_LEVELS.includes(level)) { acc.achProf += 1; if (CLEAR_MARK_LEVELS.includes(level)) acc.traitMarks = {}; }
  let cost = 0;
  const list = Array.isArray(entry.advancements) ? entry.advancements : [];
  for (const a of list) {
    const opt = ADVANCEMENTS[a.id];
    if (!opt) throw bad('Avanço inválido.');
    if (!Number.isInteger(a.tier) || a.tier < opt.minTier || a.tier > tier) throw bad(`"${opt.label}" não está disponível nesse patamar.`);
    cost += opt.cost;
    const key = `${a.tier}:${a.id}`;
    acc.slots[key] = (acc.slots[key] || 0) + 1;
    if (acc.slots[key] > opt.slots) throw bad(`Você já usou todas as vagas de "${opt.label}" no ${a.tier}º patamar.`);
    switch (a.id) {
      case 'traits': {
        const t = a.traits;
        if (!Array.isArray(t) || t.length !== 2 || t[0] === t[1] || !t.every(k => TRAIT_KEYS.includes(k))) throw bad('Escolha dois atributos diferentes.');
        for (const k of t) {
          if (acc.traitMarks[k]) throw bad(`${TRAIT_LABEL[k]} já está marcado neste patamar.`);
          acc.traitMarks[k] = true; acc.traitBonus[k] = (acc.traitBonus[k] || 0) + 1;
        }
        break;
      }
      case 'hp': acc.hp += 1; if (cls.hp + acc.hp > 12) throw bad('O máximo de PV é 12.'); break;
      case 'stress': acc.stress += 1; if (6 + acc.stress > 12) throw bad('O máximo de PF é 12.'); break;
      case 'evasion': acc.evasion += 1; break;
      case 'domain': acc.extraCards += 1; break;
      case 'experience': {
        const e = a.experiences;
        if (!Array.isArray(e) || e.length !== 2 || e[0] === e[1] || !e.every(id => expIds.has(id))) throw bad('Escolha duas Experiências diferentes.');
        for (const id of e) acc.expBonus[id] = (acc.expBonus[id] || 0) + 1;
        break;
      }
      case 'subclass':
        acc.sub += 1;
        if (acc.sub > 2) throw bad('Sua subclasse já está na maestria.');
        if (acc.tierFlags[a.tier] === 'multiclass') throw bad('Você já escolheu multiclasse neste patamar.');
        acc.tierFlags[a.tier] = 'subclass';
        break;
      case 'proficiency': acc.prof += 1; break;
      case 'multiclass': {
        if (acc.multiclass) throw bad('Você só pode fazer multiclasse uma vez.');
        if (acc.tierFlags[a.tier] === 'subclass') throw bad('Você já escolheu subclasse aprimorada neste patamar.');
        const mc = idx.classes[a.classId];
        if (!mc || mc.name === char.classId) throw bad('Escolha uma classe diferente da sua.');
        if (!mc.domains.includes(a.domain)) throw bad('Domínio inválido para essa classe.');
        if (!mc.subclasses.includes(a.subclassId)) throw bad('Subclasse inválida para essa classe.');
        acc.tierFlags[a.tier] = 'multiclass';
        acc.multiclass = { classId: a.classId, domain: a.domain, subclassId: a.subclassId };
        break;
      }
    }
  }
  if (cost !== 2) throw bad('Escolha avanços que somem exatamente 2 pontos (Proficiência e Multiclasse valem 2).');
}

export function replay(char, idx) {
  const acc = emptyAcc();
  const expIds = new Set((char.experiences || []).map(e => e.id));
  (char.history || []).forEach((entry, i) => applyEntry(acc, entry, i + 2, char, idx, expIds));
  return acc;
}

// ---------- Valores derivados ----------
export function levelOf(char) { return 1 + (char.history || []).length; }

export function derive(char, idx) {
  const cls = idx.classes[char.classId];
  const sub = idx.subclasses[char.subclassId];
  const level = levelOf(char);
  const tier = tierOf(level);
  const acc = replay(char, idx);
  const armor = idx.armor[char.armor];
  const primary = idx.weapons[char.weapons?.primary];
  const secondary = char.weapons?.secondary ? idx.weapons[char.weapons.secondary] : null;
  const wm = { evasion: 0, agility: 0, armorScore: 0 };
  for (const w of [primary, secondary]) if (w) { wm.evasion += w.mods.evasion; wm.agility += w.mods.agility; wm.armorScore += w.mods.armorScore; }
  const traits = {};
  for (const k of TRAIT_KEYS) traits[k] = (char.traits[k] || 0) + (acc.traitBonus[k] || 0);
  traits.agility += (armor?.mods.agility || 0) + wm.agility;
  const proficiency = 1 + acc.achProf + acc.prof;
  const weaponView = (w) => w && {
    name: w.name, trait: w.trait, range: w.range, burden: w.burden, type: w.damage.type, die: w.damage.die, mod: w.damage.mod,
    dice: proficiency, attackBonus: w.mods.attack, features: w.features, slot: w.slot,
    damageText: `${proficiency}d${w.damage.die}${w.damage.mod ? (w.damage.mod > 0 ? '+' : '') + w.damage.mod : ''} ${w.damage.type === 'mag' ? 'mág' : 'fís'}`,
  };
  const multiclass = acc.multiclass ? { ...acc.multiclass, cls: idx.classes[acc.multiclass.classId], sub: idx.subclasses[acc.multiclass.subclassId] } : null;
  const domains = [...cls.domains, ...(multiclass ? [multiclass.domain] : [])];
  const subclassCards = ['foundation', ...(acc.sub >= 1 ? ['specialization'] : []), ...(acc.sub >= 2 ? ['mastery'] : [])];
  const feats = [];
  for (const f of cls.classFeatures) feats.push({ source: 'Classe', ...f });
  if (cls.hopeFeature) feats.push({ source: 'Esperança (3 PE)', ...cls.hopeFeature });
  for (const k of subclassCards) for (const f of sub[k]) feats.push({ source: `Subclasse · ${{ foundation: 'Fundação', specialization: 'Especialização', mastery: 'Maestria' }[k]}`, ...f });
  if (multiclass) {
    for (const f of multiclass.cls.classFeatures) feats.push({ source: `Multiclasse · ${CLASS_PT[multiclass.cls.name]}`, ...f });
    for (const f of multiclass.sub.foundation) feats.push({ source: `Multiclasse · ${multiclass.sub.name}`, ...f });
  }
  const anc = ancestryFeatures(char, idx);
  for (const f of anc) feats.push({ source: 'Ancestralidade', ...f });
  const com = idx.communities[char.community];
  if (com) for (const f of com.features) feats.push({ source: 'Comunidade', ...f });
  return {
    level, tier, cls, sub, acc,
    traits, traitMarks: acc.traitMarks,
    evasion: cls.evasion + acc.evasion + (armor?.mods.evasion || 0) + wm.evasion,
    hpMax: Math.min(12, cls.hp + acc.hp), stressMax: Math.min(12, 6 + acc.stress), hopeMax: 6,
    armorScore: (armor?.score || 0) + wm.armorScore,
    thresholds: armor ? { major: armor.major + level, severe: armor.severe + level } : { major: level, severe: level },
    proficiency,
    experiences: (char.experiences || []).map(e => ({ id: e.id, name: e.name, bonus: 2 + (e.extra || 0) + (acc.expBonus[e.id] || 0) })),
    primary: weaponView(primary), secondary: weaponView(secondary), armor,
    spellcast: sub.spellcast || (multiclass?.sub.spellcast ?? null),
    domains, multiclass, subclassCards, features: feats,
    colors: themeColors(char, idx),
    slotsUsed: acc.slots,
  };
}

export function ancestryFeatures(char, idx) {
  const a = idx.ancestries[char.ancestry?.a];
  if (!a) return [];
  const b = char.ancestry?.b ? idx.ancestries[char.ancestry.b] : null;
  if (!b) return a.features;
  return [a.features[0], b.features[1]].filter(Boolean);
}

export function themeColors(char, idx) {
  const classColor = CLASS_COLORS[char.classId] || '#8b8fa8';
  const comColor = char.theme?.accent && /^#[0-9a-f]{6}$/i.test(char.theme.accent) ? char.theme.accent : (COMMUNITY_COLORS[char.community] || '#d38b3f');
  return { primary: classColor, secondary: comColor };
}

// ---------- Cartas de domínio ----------
export function ownedCards(char) { return [...(char.domainCards?.loadout || []), ...(char.domainCards?.vault || [])]; }

// Cartas que o personagem pode adquirir (considerando domínio, nível e multiclasse).
export function availableCards(char, idx, level) {
  const d = derive(char, idx);
  const owned = new Set(ownedCards(char));
  const mcDomain = d.multiclass?.domain;
  return idx.srd.cards.filter(c => {
    if (owned.has(c.name)) return false;
    if (d.cls.domains.includes(c.domain)) return c.level <= level;
    if (mcDomain && c.domain === mcDomain) return c.level <= Math.ceil(level / 2);
    return false;
  });
}

// ---------- Criação ----------
export const STARTING_ITEMS = ['Tocha', '15 m de corda (50 pés)', 'Suprimentos básicos'];

export function validateEquipment(char, idx, { tierMax, creation }) {
  const p = idx.weapons[char.weapons?.primary];
  if (!p || p.slot !== 'primary') throw bad('Escolha uma arma primária válida.');
  if (p.tier > tierMax || (creation && p.tier !== 1)) throw bad('A arma primária é de um patamar acima do seu.');
  const sName = char.weapons?.secondary;
  if (p.burden === 'two') { if (sName) throw bad('Uma arma de duas mãos não pode ser combinada com arma secundária.'); }
  else if (creation && !sName) throw bad('Com uma arma primária de uma mão, escolha também uma arma secundária.');
  if (sName) {
    const s = idx.weapons[sName];
    if (!s || s.slot !== 'secondary') throw bad('Escolha uma arma secundária válida.');
    if (s.tier > tierMax || (creation && s.tier !== 1)) throw bad('A arma secundária é de um patamar acima do seu.');
  }
  const a = idx.armor[char.armor];
  if (!a) throw bad('Escolha uma armadura válida.');
  if (a.tier > tierMax || (creation && a.tier !== 1)) throw bad('A armadura é de um patamar acima do seu.');
}

const cleanText = (v, max = 400) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max);
const cleanName = (v, max = 60) => cleanText(v, max).trim();

// Constrói o personagem inicial a partir das escolhas do assistente (descarta qualquer campo não permitido).
export function buildNewCharacter(input, idx) {
  const cls = idx.classes[input.classId];
  if (!cls) throw bad('Escolha uma classe.');
  if (!cls.subclasses.includes(input.subclassId)) throw bad('A subclasse não pertence à classe escolhida.');
  const a = input.ancestry?.a, b = input.ancestry?.b || null;
  if (!idx.ancestries[a]) throw bad('Escolha uma ancestralidade.');
  if (b && (!idx.ancestries[b] || b === a)) throw bad('Para ancestralidade mista, escolha duas ancestralidades diferentes.');
  if (!idx.communities[input.community]) throw bad('Escolha uma comunidade.');

  const vals = TRAIT_KEYS.map(k => parseInt(input.traits?.[k], 10));
  if (vals.some(Number.isNaN) || [...vals].sort((x, y) => y - x).join() !== [...TRAIT_VALUES].sort((x, y) => y - x).join())
    throw bad('Distribua exatamente os valores +2, +1, +1, 0, 0 e −1 entre os seis atributos.');
  const traits = Object.fromEntries(TRAIT_KEYS.map((k, i) => [k, vals[i]]));

  const draftChar = { ancestry: { a, b } };
  const hasExtra = ancestryFeatures(draftChar, idx).some(f => (f.id || f.name) === 'Purposeful Design');
  const exps = Array.isArray(input.experiences) ? input.experiences : [];
  if (exps.length !== 2) throw bad('Crie exatamente duas Experiências.');
  const names = exps.map(e => cleanName(e.name, 40));
  if (names.some(n => n.length < 2)) throw bad('Dê um nome a cada Experiência (mínimo 2 letras).');
  if (new Set(names.map(n => n.toLowerCase())).size !== 2) throw bad('As duas Experiências devem ser diferentes.');
  const extras = exps.map(e => Math.max(0, Math.min(1, parseInt(e.extra, 10) || 0)));
  if (extras.reduce((x, y) => x + y, 0) > (hasExtra ? 1 : 0)) throw bad('Bônus extra de Experiência só é permitido pela característica Projeto Intencional (Clank).');

  const char = {
    name: cleanName(input.name) || 'Sem nome', pronouns: cleanName(input.pronouns, 30), description: cleanText(input.description, 600),
    classId: cls.name, subclassId: input.subclassId,
    ancestry: { a, b }, community: input.community,
    traits, experiences: names.map((n, i) => ({ id: `e${i + 1}`, name: n, extra: extras[i] })),
    weapons: { primary: input.weapons?.primary, secondary: input.weapons?.secondary || null },
    armor: input.armor,
    history: [],
  };
  validateEquipment(char, idx, { tierMax: 1, creation: true });

  const picks = Array.isArray(input.domainCards) ? input.domainCards : [];
  if (picks.length !== 2 || picks[0] === picks[1]) throw bad('Escolha duas cartas de domínio diferentes.');
  for (const n of picks) {
    const c = idx.cards[n];
    if (!c || c.level !== 1 || !cls.domains.includes(c.domain)) throw bad(`A carta "${n}" não é de 1º nível dos domínios da sua classe.`);
  }
  char.domainCards = { loadout: [...picks], vault: [] };

  const potion = input.startingChoices?.potion === 'stamina' ? 'stamina' : 'health';
  const classItem = cls.classItems.includes(input.startingChoices?.classItem) ? input.startingChoices.classItem : null;
  if (!classItem) throw bad('Escolha um item de classe.');
  char.startingChoices = { potion, classItem };
  char.inventory = [
    ...STARTING_ITEMS.map(n => ({ name: n, qty: 1 })),
    { name: potion === 'health' ? 'Poção de Vida Menor (recupera 1d4 PV)' : 'Poção de Vigor Menor (recupera 1d4 PF)', qty: 1 },
    { name: classItem, qty: 1 },
  ];
  char.gold = { handfuls: 1, bags: 0, chests: 0 };
  char.background = (cls.backgroundQuestions || []).map((q, i) => ({ q, a: cleanText(input.background?.[i]?.a, 600) }));
  char.connections = (cls.connections || []).map((q, i) => ({ q, a: cleanText(input.connections?.[i]?.a, 600) }));
  char.state = { hp: 0, stress: 0, hope: 2, armor: 0, conditions: [], notes: '' };
  char.theme = { accent: /^#[0-9a-f]{6}$/i.test(input.theme?.accent || '') ? input.theme.accent : null };
  return char;
}

// ---------- Subida de nível ----------
export function buildLevelUp(char, input, idx) {
  const level = levelOf(char);
  if (level >= MAX_LEVEL) throw bad('O personagem já está no nível máximo.');
  const newLevel = level + 1;
  const entry = { level: newLevel, newExperience: null, advancements: [], domainCard: null, extraCards: [], exchange: null };

  const expIds = new Set(char.experiences.map(e => e.id));
  if (ACHIEVEMENT_LEVELS.includes(newLevel)) {
    const name = cleanName(input.newExperience, 40);
    if (name.length < 2) throw bad('Crie a nova Experiência do patamar (+2).');
    if (char.experiences.some(e => e.name.toLowerCase() === name.toLowerCase())) throw bad('Já existe uma Experiência com esse nome.');
    const id = `e${char.experiences.length + 1}`;
    entry.newExperience = { id, name };
    expIds.add(id);
  }

  entry.advancements = (Array.isArray(input.advancements) ? input.advancements : []).map(a => ({
    id: String(a.id), tier: parseInt(a.tier, 10),
    ...(a.traits ? { traits: a.traits.map(String) } : {}),
    ...(a.experiences ? { experiences: a.experiences.map(String) } : {}),
    ...(a.classId ? { classId: String(a.classId), domain: String(a.domain), subclassId: String(a.subclassId) } : {}),
  }));

  // Valida o avanço no estado atual + este nível (lança erro se algo violar as regras).
  const trial = { ...char, experiences: entry.newExperience ? [...char.experiences, { id: entry.newExperience.id, name: entry.newExperience.name, extra: 0 }] : char.experiences, history: [...char.history, entry] };
  const acc = replay({ ...trial, history: trial.history.slice(0, -1) }, idx);
  applyEntry(acc, entry, newLevel, trial, idx, expIds);

  // Cartas de domínio: uma nova obrigatória + uma por avanço "domain".
  const cardsAfter = { ...trial, history: trial.history };
  const avail = new Map(availableCards(cardsAfter, idx, newLevel).map(c => [c.name, c]));
  // Se o avanço de multiclasse foi escolhido agora, o domínio novo já vale para as cartas (nível ≤ metade).
  const mcNow = entry.advancements.find(a => a.id === 'multiclass');
  if (mcNow) for (const c of idx.srd.cards) if (c.domain === mcNow.domain && c.level <= Math.ceil(newLevel / 2) && !ownedCards(char).includes(c.name)) avail.set(c.name, c);
  const need = 1 + entry.advancements.filter(a => a.id === 'domain').length;
  const wanted = [input.domainCard, ...(Array.isArray(input.extraCards) ? input.extraCards : [])].map(String);
  if (wanted.length !== need || new Set(wanted).size !== need) throw bad(`Escolha ${need} carta(s) de domínio nova(s), todas diferentes.`);
  for (const n of wanted) if (!avail.has(n)) throw bad(`A carta "${n}" não está disponível para o seu nível/domínios.`);
  entry.domainCard = wanted[0];
  entry.extraCards = wanted.slice(1);

  if (input.exchange && input.exchange.out) {
    const out = ownedCards(char).includes(input.exchange.out) ? idx.cards[input.exchange.out] : null;
    const inn = avail.get(String(input.exchange.in));
    if (!out || !inn || inn.name === out.name || inn.level > out.level || wanted.includes(inn.name)) throw bad('Troca de carta inválida (a nova deve ter nível igual ou menor que a antiga).');
    entry.exchange = { out: out.name, in: inn.name };
  }
  return entry;
}

// Aplica a entrada validada ao personagem (retorna uma cópia).
export function applyLevelUp(char, entry) {
  const next = JSON.parse(JSON.stringify(char));
  next.history.push(entry);
  if (entry.newExperience) next.experiences.push({ id: entry.newExperience.id, name: entry.newExperience.name, extra: 0 });
  const dc = next.domainCards;
  if (entry.exchange) {
    for (const k of ['loadout', 'vault']) dc[k] = dc[k].filter(n => n !== entry.exchange.out);
    dc.vault.push(entry.exchange.in); // a troca entra na reserva; o jogador reorganiza depois
  }
  for (const n of [entry.domainCard, ...entry.extraCards]) (dc.loadout.length < MAX_LOADOUT ? dc.loadout : dc.vault).push(n);
  return next;
}

// ---------- Estado e edição ----------
export function clampState(char, idx) {
  const d = derive(char, idx);
  const s = char.state || {};
  const n = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));
  return {
    hp: n(s.hp, d.hpMax), stress: n(s.stress, d.stressMax), hope: n(s.hope, d.hopeMax), armor: n(s.armor, d.armorScore),
    conditions: (Array.isArray(s.conditions) ? s.conditions : []).slice(0, 12).map(c => cleanName(c, 30)).filter(Boolean),
    notes: cleanText(s.notes, 4000),
  };
}

// Aplica uma edição do jogador, aceitando somente campos permitidos.
export function applyEdit(char, patch, idx) {
  const next = JSON.parse(JSON.stringify(char));
  if ('name' in patch) next.name = cleanName(patch.name) || next.name;
  if ('pronouns' in patch) next.pronouns = cleanName(patch.pronouns, 30);
  if ('description' in patch) next.description = cleanText(patch.description, 600);
  if ('background' in patch && Array.isArray(patch.background)) next.background = next.background.map((b, i) => ({ q: b.q, a: cleanText(patch.background[i]?.a ?? b.a, 600) }));
  if ('connections' in patch && Array.isArray(patch.connections)) next.connections = next.connections.map((b, i) => ({ q: b.q, a: cleanText(patch.connections[i]?.a ?? b.a, 600) }));
  if ('experienceNames' in patch && patch.experienceNames) next.experiences = next.experiences.map(e => ({ ...e, name: cleanName(patch.experienceNames[e.id], 40) || e.name }));
  if ('inventory' in patch && Array.isArray(patch.inventory)) next.inventory = patch.inventory.slice(0, 60).map(i => ({ name: cleanName(i.name, 80), qty: Math.max(0, Math.min(999, parseInt(i.qty, 10) || 1)) })).filter(i => i.name);
  if ('gold' in patch && patch.gold) {
    const g = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));
    next.gold = { handfuls: g(patch.gold.handfuls, 9), bags: g(patch.gold.bags, 9), chests: g(patch.gold.chests, 999) };
  }
  if ('theme' in patch && patch.theme) next.theme = { accent: /^#[0-9a-f]{6}$/i.test(patch.theme.accent || '') ? patch.theme.accent : null };
  if ('weapons' in patch || 'armor' in patch) {
    if (patch.weapons) next.weapons = { primary: patch.weapons.primary, secondary: patch.weapons.secondary || null };
    if (patch.armor) next.armor = patch.armor;
    validateEquipment(next, idx, { tierMax: tierOf(levelOf(next)), creation: false });
  }
  if ('domainCards' in patch && patch.domainCards) {
    const owned = ownedCards(next).slice().sort().join('|');
    const l = patch.domainCards.loadout || [], v = patch.domainCards.vault || [];
    if ([...l, ...v].slice().sort().join('|') !== owned) throw bad('As cartas do loadout e da reserva devem ser exatamente as que você possui.');
    if (l.length > MAX_LOADOUT) throw bad(`O loadout comporta no máximo ${MAX_LOADOUT} cartas.`);
    next.domainCards = { loadout: l, vault: v };
  }
  if ('state' in patch && patch.state) next.state = { ...next.state, ...patch.state };
  next.state = clampState(next, idx);
  return next;
}

// ---------- Resumo público (para a mesa) ----------
export function publicSummary(char, idx) {
  const d = derive(char, idx);
  return {
    id: char.id, name: char.name, pronouns: char.pronouns, classId: char.classId, subclassId: char.subclassId,
    community: char.community, ancestry: char.ancestry, level: d.level,
    hp: char.state.hp, hpMax: d.hpMax, stress: char.state.stress, stressMax: d.stressMax, hope: char.state.hope,
    armor: char.state.armor, armorScore: d.armorScore, evasion: d.evasion, thresholds: d.thresholds, conditions: char.state.conditions,
    colors: d.colors,
  };
}
