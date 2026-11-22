// Gera os lotes de tradução a partir de data-src/srd.en.json. Uso: node scripts/extract-pt.mjs <pasta de saída>
import fs from 'node:fs';
import path from 'node:path';
import { visitSrd } from './pt-fields.mjs';
const out = process.argv[2] || 'tr';
const srd = JSON.parse(fs.readFileSync('data-src/srd.en.json', 'utf8'));
const dict = fs.existsSync('data-src/pt/translations.json') ? JSON.parse(fs.readFileSync('data-src/pt/translations.json', 'utf8')) : {};
const labels = new Map(), texts = new Map();
visitSrd(srd, (h, k, b) => { const s = h[k]; if (dict[s] != null) return; (b === 'label' ? labels : texts).set(s, b); });
fs.mkdirSync(out, { recursive: true });
const dump = (name, map) => {
  const arr = [...map.keys()];
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(Object.fromEntries(arr.map((s, i) => ['k' + i, s])), null, 1));
  return arr.length;
};
console.log('rótulos únicos:', labels.size, '| textos únicos:', texts.size);
// rótulos: lotes de ~14k caracteres; textos: ~18k
const batch = (map, prefix, limit) => {
  const arr = [...map.keys()]; let cur = {}, n = 0, size = 0, files = [];
  const flush = () => { if (!Object.keys(cur).length) return; const f = `${prefix}${String(files.length + 1).padStart(2, '0')}.json`; fs.writeFileSync(path.join(out, f), JSON.stringify(cur, null, 1)); files.push([f, Object.keys(cur).length, size]); cur = {}; size = 0; };
  arr.forEach((s, i) => { cur['k' + (n++)] = s; size += s.length; if (size >= limit) flush(); });
  flush(); return files;
};
console.log(batch(labels, 'L', 24000), batch(texts, 'T', 30000));
