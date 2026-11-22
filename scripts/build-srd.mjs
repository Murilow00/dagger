// Converte o SRD 1.0 do Daggerheart (markdown) para um único JSON.
// Uso: node scripts/build-srd.mjs /caminho/para/daggerheart-srd  [saida.json]
// Conteúdo do SRD: © Critical Role LLC, sob a Darrington Press Community Gaming License.
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'data-src', 'srd.en.json');
if (!SRC) { console.error('Informe a pasta do SRD.'); process.exit(1); }

const warn = [];
const read = (dir) => fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith('.md')).sort().map(f => {
  const raw = fs.readFileSync(path.join(SRC, dir, f), 'utf8').replace(/\r/g, '');
  const m = raw.match(/^#\s+(.+)$/m);
  const name = (m ? m[1] : f.replace(/\.md$/, '')).trim();
  const body = raw.replace(/^#\s+.+\n/, '').trim();
  return { file: f, name, body };
});

const unlink = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
const clean = (s) => unlink(s).replace(/ /g, ' ').trim();
const num = (s) => { const m = String(s ?? '').match(/-?\d+/); return m ? parseInt(m[0], 10) : null; };

// Divide o corpo em seções "### TÍTULO".
function sections(body) {
  const out = { _intro: '' };
  let cur = '_intro';
  for (const line of body.split('\n')) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) { cur = m[1].toUpperCase(); out[cur] = ''; continue; }
    out[cur] += line + '\n';
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

// Extrai "**_Nome - Tipo:_** texto" (e parágrafos/listas seguintes) como lista de features.
function features(text) {
  const feats = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\*\*_(.+?):?_\*\*:?\s*(.*)$/);
    if (m) {
      if (cur) feats.push(cur);
      let name = m[1].replace(/:$/, '').trim();
      let kind = null;
      const k = name.match(/^(.*?)\s+-\s+(Passive|Action|Reaction)$/i);
      if (k) { name = k[1].trim(); kind = k[2][0].toUpperCase() + k[2].slice(1).toLowerCase(); }
      cur = { name, kind, text: m[2] };
    } else if (cur) cur.text += '\n' + line;
  }
  if (cur) feats.push(cur);
  return feats.map(f => ({ ...f, text: clean(f.text).replace(/\n{3,}/g, '\n\n') }));
}

function bullets(text) {
  return text.split('\n').filter(l => /^\s*[-*]\s+/.test(l)).map(l => clean(l.replace(/^\s*[-*]\s+/, '')));
}

const TRAITS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
const traitKey = (s) => { const k = s.trim().toLowerCase(); return TRAITS.includes(k) ? k : null; };

// ---------- Domínios ----------
const domains = read('domains').map(d => {
  const s = sections(d.body);
  const cls = (d.body.match(/accessed by the\s+\*\*(.+?)\*\*\s+and\s+\*\*(.+?)\*\*\s+classes/i) || []).slice(1, 3);
  const tagline = (d.body.match(/is the domain of\s+\*\*(.+?)\.?\*\*/i) || [])[1] || '';
  return { id: d.name, name: d.name, tagline, description: clean(s._intro), classes: cls };
});

// ---------- Cartas de domínio ----------
const cards = read('abilities').map(a => {
  const m = a.body.match(/^\*\*_Level\s+(\d+)_\*\*\s+_(.+?)\._\s+\*\*_Recall Cost_\*\*\s+_(\d+)\._/);
  if (!m) warn.push('carta sem cabeçalho padrão: ' + a.name);
  const head = m ? m[2] : '';
  const parts = head.split(/\s+/);
  const type = parts.pop() || '';
  const domain = parts.join(' ');
  return {
    id: a.name, name: a.name, level: m ? +m[1] : null, domain, type,
    recall: m ? +m[3] : null,
    text: clean(a.body.replace(/^\*\*_Level.*\n+/, '')),
  };
});

// ---------- Subclasses ----------
const subclasses = read('subclasses').map(sc => {
  const s = sections(sc.body);
  const tag = clean(s._intro).split('\n')[0];
  const spell = s['SPELLCAST TRAIT'] ? traitKey(s['SPELLCAST TRAIT'].split('\n')[0]) : null;
  const find = (p) => s[Object.keys(s).find(k => k.startsWith(p))] || '';
  const extraKeys = Object.keys(s).filter(k => !['_intro', 'SPELLCAST TRAIT'].includes(k) && !/^(FOUNDATION|SPECIALIZATION|MASTERY)/.test(k));
  const extra = extraKeys.map(k => `### ${k}\n\n${s[k]}`).join('\n\n');
  return {
    id: sc.name, name: sc.name, tagline: tag, spellcast: spell,
    foundation: features(find('FOUNDATION')),
    specialization: features(find('SPECIALIZATION')),
    mastery: features(find('MASTERY')),
    extra: clean(extra),
  };
});

// ---------- Classes ----------
const classes = read('classes').map(c => {
  const s = sections(c.body);
  const head = s._intro;
  const [descPart] = head.split(/\n---\n/);
  const get = (label) => { const m = head.match(new RegExp('\\*\\*' + label + '\\s*-\\*\\*\\s*(.+)')); return m ? clean(m[1]) : ''; };
  const domainsLine = (head.match(/\*\*DOMAINS\s*-\*\*\s*(.+)/) || [])[1] || '';
  const doms = clean(domainsLine).split('&').map(x => x.trim()).filter(Boolean);
  const traitsSug = get('SUGGESTED TRAITS').split(',').map(x => parseInt(x.trim(), 10));
  const suggestedTraits = {};
  TRAITS.forEach((t, i) => suggestedTraits[t] = traitsSug[i]);
  const subs = (s.SUBCLASSES || '').match(/\*\*\[(.+?)\]/g)?.map(x => x.replace(/\*\*\[|\]/g, '')) || [];
  const qOf = (k) => bullets(s[k] || '');
  return {
    id: c.name, name: c.name, description: clean(descPart),
    domains: doms,
    evasion: num(get('STARTING EVASION')), hp: num(get('STARTING HIT POINTS')),
    classItems: get('CLASS ITEMS').split(/\s+or\s+/i).map(x => x.replace(/\.$/, '').trim()).filter(Boolean),
    suggested: { traits: suggestedTraits, primary: get('SUGGESTED PRIMARY'), secondary: get('SUGGESTED SECONDARY') || null, armor: get('SUGGESTED ARMOR') },
    hopeFeature: features(s['HOPE FEATURE'] || '')[0] || null,
    classFeatures: features(s['CLASS FEATURE'] || s['CLASS FEATURES'] || ''),
    subclasses: subs,
    backgroundQuestions: qOf('BACKGROUND QUESTIONS'),
    connections: qOf('CONNECTIONS'),
  };
});

// ---------- Ancestralidades / Comunidades ----------
const ancestries = read('ancestries').map(a => {
  const s = sections(a.body);
  return { id: a.name, name: a.name, description: clean(s._intro), features: features(s['ANCESTRY FEATURES'] || '') };
});
const communities = read('communities').map(a => {
  const s = sections(a.body);
  const intro = s._intro.split('\n\n');
  const adj = intro.filter(p => /^_.+_$/.test(p.trim())).pop() || '';
  const desc = intro.filter(p => p.trim() !== adj.trim()).join('\n\n');
  return { id: a.name, name: a.name, description: clean(desc), adjectives: clean(adj).replace(/^_|_$/g, ''), features: features(s['COMMUNITY FEATURE'] || '') };
});

// ---------- Armas / armaduras ----------
const parseDamage = (s) => {
  const m = String(s || '').match(/d(\d+)(?:\s*([+-])\s*(\d+))?\s*(phy|mag)?/i);
  if (!m) return null;
  return { die: +m[1], mod: m[3] ? (m[2] === '-' ? -1 : 1) * +m[3] : 0, type: (m[4] || 'phy').toLowerCase() };
};
const kv = (body) => { const o = {}; for (const l of body.split('\n')) { const m = l.match(/^\s*-\s+\*\*(.+?):\*\*\s*(.*)$/); if (m) o[m[1].toLowerCase()] = clean(m[2]); } return o; };

const weapons = read('weapons').map(w => {
  const head = (w.body.match(/^\*\*_Tier\s+(\d)_\*\*\s+(.+)$/m) || []);
  const words = (head[2] || '').replace(/_/g, '').trim().split(/\s+/);
  const o = kv(w.body);
  const s = sections(w.body);
  return {
    id: w.name, name: w.name, tier: +head[1] || null,
    slot: /Secondary/i.test(head[2] || '') ? 'secondary' : 'primary',
    magic: /Magic/i.test(head[2] || ''),
    trait: traitKey(o.trait || '') , range: o.range || '', damageRaw: o.damage || '',
    damage: parseDamage(o.damage), burden: /Two/i.test(o.burden || '') ? 'two' : 'one',
    features: features(s.FEATURE || s.FEATURES || ''),
  };
});

const armor = read('armor').map(a => {
  const head = (a.body.match(/^\*\*_Tier\s+(\d)_\*\*/m) || []);
  const o = kv(a.body);
  const s = sections(a.body);
  const th = (o['base thresholds'] || '').match(/(\d+)\s*\/\s*(\d+)/);
  const feats = features(s.FEATURE || s.FEATURES || '');
  // Bônus mecânicos simples a partir do texto da característica.
  const mods = { evasion: 0, agility: 0, armorScore: 0 };
  for (const f of feats) {
    const t = f.text;
    let m;
    if ((m = t.match(/([+-]\d+)\s+to Evasion/i))) mods.evasion += +m[1];
    if ((m = t.match(/([+-]\d+)\s+to Agility/i))) mods.agility += +m[1];
  }
  return {
    id: a.name, name: a.name, tier: +head[1] || null,
    major: th ? +th[1] : null, severe: th ? +th[2] : null, score: num(o['base score']),
    features: feats, mods,
  };
});

// Bônus mecânicos das armas (ex.: "Pesada: -1 Evasão", "+1 em ataques").
for (const w of weapons) {
  w.mods = { evasion: 0, attack: 0, armorScore: 0, agility: 0 };
  for (const f of w.features) {
    let m;
    if ((m = f.text.match(/([+-]\d+)\s+to Evasion/i))) w.mods.evasion += +m[1];
    if ((m = f.text.match(/([+-]\d+)\s+to attack rolls/i))) w.mods.attack += +m[1];
    if ((m = f.text.match(/([+-]\d+)\s+to Agility/i))) w.mods.agility += +m[1];
    if ((m = f.text.match(/([+-]\d+)\s+(?:bonus\s+)?to (?:your )?Armor Score/i))) w.mods.armorScore += +m[1];
  }
}

// ---------- Itens / consumíveis / formas de fera ----------
const simple = (dir) => read(dir).map(i => ({ id: i.name, name: i.name, text: clean(i.body.replace(/^\*\*_.+?_\*\*\s*\n+/, '')) }));
const items = simple('items');
const consumables = simple('consumables');

const beastforms = read('beastforms').map(b => {
  const head = b.body.match(/^\*\*_Tier\s+(\d)_\*\*\s+_(.*)_/m) || [];
  const o = kv(b.body);
  const s = sections(b.body);
  return {
    id: b.name, name: b.name, tier: +head[1] || null, examples: head[2] || '',
    trait: o['trait bonus'] || '', evasion: o['evasion bonus'] || '', attack: o.attack || '', advantages: o.advantages || '',
    features: features(s.FEATURES || s.FEATURE || ''),
  };
});

// ---------- Adversários ----------
function parseStatBlock(body, kind) {
  const m = body.match(/^\*\*_Tier\s+(\d+)\s+([^_.]+?)\._\*\*\s*(?:_(.*)_)?\s*$/m) || body.match(/^\*\*_Tier\s+(\d+)\s+([^_.]+?)\._\*\*\s+_(.*)_/m);
  const tier = m ? +m[1] : null;
  const type = m ? m[2].trim() : '';
  const desc = m && m[3] ? clean(m[3]) : '';
  const stats = {};
  const lines = body.split('\n').filter(l => /^\s*[->]\s*-?\s*\*\*/.test(l));
  for (const raw of lines) {
    const l = raw.replace(/^\s*[->]\s*-?\s*/, '');
    // "**Difficulty:** 14 | **Thresholds:** 8/15 | **HP:** 8 | **Stress:** 3"
    const chunks = l.split(/\s\|\s(?=\*\*)/);
    for (const ch of chunks) {
      const mm = ch.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      if (mm) stats[mm[1].toLowerCase()] = clean(mm[2]);
    }
  }
  return { tier, type, desc, stats };
}

// O repositório tem uma cópia duplicada e com grafia errada (Corrupter); ficamos com Corruptor.
const adversaries = read('adversaries').filter(a => a.file !== 'Outer Realms Corrupter.md').map(a => {
  const { tier, type, desc, stats } = parseStatBlock(a.body, 'adv');
  const s = sections(a.body);
  const th = (stats.thresholds || '').match(/(\d+|None)\s*\/\s*(\d+|None)/i);
  let atk = null;
  const atkKey = Object.keys(stats).find(k => k === 'atk');
  if (atkKey) {
    // stats.atk = "+3"; o nome do ataque vem como chave extra: "claws" => "Very Close | 1d12+2 phy"
    const other = Object.keys(stats).find(k => !['motives & tactics', 'difficulty', 'thresholds', 'hp', 'stress', 'atk', 'experience'].includes(k));
    if (other) atk = { bonus: stats.atk, name: other.replace(/\b\w/g, c => c.toUpperCase()), detail: stats[other] };
  }
  const hordeM = type.match(/Horde\s*\((.+?)\)/i);
  const minion = /Minion/i.test(type) ? (a.body.match(/Minion\s*\((\d+)\)/i) || [])[1] : null;
  return {
    id: a.name, name: a.name, tier, type: type.replace(/\s*\(.+\)/, ''), typeRaw: type, desc,
    motives: stats['motives & tactics'] || '',
    difficulty: num(stats.difficulty),
    thresholds: th ? { major: num(th[1]), severe: num(th[2]) } : null,
    hp: num(stats.hp), stress: num(stats.stress),
    atkBonus: stats.atk || '', attack: atk, experience: stats.experience || '',
    horde: hordeM ? hordeM[1] : null, minion: minion ? +minion : null,
    features: features(s.FEATURES || ''),
    extra: clean(Object.keys(s).filter(k => !['_intro', 'FEATURES'].includes(k)).map(k => `### ${k}\n\n${s[k]}`).join('\n\n')),
    minionNote: /Minion/i.test(type) ? clean((a.body.match(/Minion[^\n]*/g) || []).join('\n')) : '',
  };
});

const environments = read('environments').map(e => {
  const { tier, type, desc, stats } = parseStatBlock(e.body, 'env');
  const s = sections(e.body);
  return {
    id: e.name, name: e.name, tier, type, desc,
    impulses: stats.impulses || '', difficulty: num(stats.difficulty), difficultyText: stats.difficulty || '',
    adversaries: stats['potential adversaries'] || '',
    features: features(s.FEATURES || ''),
  };
});

// ---------- Validações ----------
for (const a of adversaries) {
  if (!a.tier || !a.difficulty || a.hp == null) warn.push('adversário incompleto: ' + a.name);
  if (!a.features.length) warn.push('adversário sem features: ' + a.name);
}
for (const e of environments) if (!e.tier || !e.difficultyText) warn.push('ambiente incompleto: ' + e.name);
for (const c of classes) {
  if (!c.evasion || !c.hp || !c.hopeFeature || c.subclasses.length !== 2 || c.domains.length !== 2) warn.push('classe incompleta: ' + c.name);
}
for (const w of weapons) if (!w.damage || !w.trait || !w.tier) warn.push('arma incompleta: ' + w.name);
for (const a of armor) if (!a.major || !a.score) warn.push('armadura incompleta: ' + a.name);
for (const s of subclasses) if (!s.foundation.length || !s.specialization.length || !s.mastery.length) warn.push('subclasse incompleta: ' + s.name);
for (const a of ancestries) if (a.features.length !== 2) warn.push('ancestralidade sem 2 features: ' + a.name);
for (const c of cards) if (!c.domain || !c.level) warn.push('carta incompleta: ' + c.name);

const data = {
  meta: {
    source: 'Daggerheart System Reference Document 1.0',
    license: 'Este produto inclui materiais do Daggerheart System Reference Document 1.0, © Critical Role, LLC, sob os termos da Darrington Press Community Gaming (DPCGL) License. Mais informações em https://www.daggerheart.com/. Daggerheart e todas as marcas relacionadas são marcas registradas da Critical Role, LLC e usadas com permissão. Este projeto não é afiliado, endossado ou patrocinado pela Critical Role ou pela Darrington Press.',
    generatedAt: new Date().toISOString(),
  },
  traits: TRAITS,
  domains, cards, classes, subclasses, ancestries, communities, weapons, armor, items, consumables, beastforms, adversaries, environments,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data));
console.log('Gerado', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB');
for (const k of ['domains', 'cards', 'classes', 'subclasses', 'ancestries', 'communities', 'weapons', 'armor', 'items', 'consumables', 'beastforms', 'adversaries', 'environments']) console.log(k.padEnd(14), data[k].length);
console.log('Avisos:', warn.length); warn.slice(0, 60).forEach(w => console.log(' -', w));
