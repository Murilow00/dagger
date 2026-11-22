// Define quais campos do SRD são textos traduzíveis. 'label' = nomes e frases curtas; 'text' = texto corrido.
// Usado por extract-pt.mjs (gera os lotes de tradução) e apply-pt.mjs (aplica o dicionário en → pt).
const L = 'label', T = 'text';
export const SPEC = {
  domains: { tagline: L, description: T },
  cards: { name: L, text: T },
  classes: { description: T, classItems: [L], 'suggested.primary': L, 'suggested.secondary': L, 'suggested.armor': L, subclasses: [L],
    'hopeFeature.name': L, 'hopeFeature.text': T, classFeatures: [{ name: L, text: T }], backgroundQuestions: [T], connections: [T] },
  subclasses: { name: L, tagline: T, foundation: [{ name: L, text: T }], specialization: [{ name: L, text: T }], mastery: [{ name: L, text: T }], extra: T },
  ancestries: { name: L, description: T, features: [{ name: L, text: T }] },
  communities: { name: L, description: T, adjectives: T, features: [{ name: L, text: T }] },
  weapons: { name: L, features: [{ name: L, text: T }] },
  armor: { name: L, features: [{ name: L, text: T }] },
  items: { name: L, text: T },
  consumables: { name: L, text: T },
  beastforms: { name: L, examples: L, trait: L, evasion: L, attack: L, advantages: L, features: [{ name: L, text: T }] },
  adversaries: { name: L, desc: T, motives: L, 'attack.name': L, 'attack.detail': L, experience: L, minionNote: T, features: [{ name: L, text: T }] },
  environments: { name: L, desc: T, impulses: L, adversaries: T, features: [{ name: L, text: T }] },
};

// Percorre `obj` segundo `spec` chamando fn(holder, key, bucket) para cada string traduzível (holder[key] é a string).
export function visit(obj, spec, fn) {
  for (const [path, rule] of Object.entries(spec)) {
    const parts = path.split('.');
    let h = obj;
    for (let i = 0; i < parts.length - 1 && h; i++) h = h[parts[i]];
    if (!h) continue;
    const k = parts[parts.length - 1];
    const v = h[k];
    if (v == null) continue;
    if (typeof rule === 'string') { if (typeof v === 'string' && v.trim()) fn(h, k, rule); }
    else if (Array.isArray(rule)) {
      const r = rule[0];
      v.forEach((item, i) => {
        if (typeof r === 'string') { if (typeof item === 'string' && item.trim()) fn(v, i, r); }
        else visit(item, r, fn);
      });
    }
  }
}
export function visitSrd(srd, fn) {
  for (const [sec, spec] of Object.entries(SPEC)) for (const o of srd[sec] || []) visit(o, spec, fn);
}
