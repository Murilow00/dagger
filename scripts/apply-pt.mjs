// Gera public/data/srd.json (em português) a partir de data-src/srd.en.json + data-src/pt/translations.json.
// Os campos `id` continuam em inglês (chaves estáveis); `name` e os textos viram pt-BR.
import fs from 'node:fs';
import { visitSrd } from './pt-fields.mjs';
const srd = JSON.parse(fs.readFileSync('data-src/srd.en.json', 'utf8'));
const dict = JSON.parse(fs.readFileSync('data-src/pt/translations.json', 'utf8'));
// Habilidades guardam o nome original em `id` (as regras procuram por ele, ex.: "Purposeful Design").
for (const sec of Object.values(srd)) {
  if (!Array.isArray(sec)) continue;
  for (const o of sec) for (const k of ['features', 'classFeatures', 'foundation', 'specialization', 'mastery'])
    for (const f of o[k] || []) if (f && f.name && !f.id) f.id = f.name;
  for (const o of sec) if (o.hopeFeature && !o.hopeFeature.id) o.hopeFeature.id = o.hopeFeature.name;
}
const missing = new Set();
visitSrd(srd, (h, k) => { const s = h[k]; if (dict[s] != null) h[k] = dict[s]; else missing.add(s); });
srd.meta.language = 'pt-BR';
srd.meta.translation = 'Tradução para português do Brasil feita para este projeto (não oficial), a partir do SRD 1.0 em inglês.';
fs.writeFileSync('public/data/srd.json', JSON.stringify(srd));
console.log('srd.json (pt-BR) gerado.', missing.size ? `Sem tradução: ${missing.size}` : 'Todas as strings traduzidas.');
if (missing.size) console.log([...missing].slice(0, 10));
