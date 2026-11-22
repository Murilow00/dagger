// Valida uma tradução: node scripts/validate-pt.mjs <entrada.json> <saida.json> [--merge]
// Confere chaves, marcação markdown, quebras de linha e números/dados; com --merge grava em data-src/pt/translations.json.
import fs from 'node:fs';
const [inp, outp, flag] = process.argv.slice(2);
const en = JSON.parse(fs.readFileSync(inp, 'utf8'));
let pt;
try { pt = JSON.parse(fs.readFileSync(outp, 'utf8')); } catch (e) { console.log('JSON inválido:', e.message); process.exit(1); }
const count = (s, re) => (s.match(re) || []).length;
// O glossário manda "mark a Stress" → "marque 1 Fadiga": o algarismo 1 isolado não entra na comparação.
const sig = (s) => (s.replace(/\(\d+(?:,\d+)? ?(?:metros|m|km)\)/g, '').replace(/(?<![\d])1(?=d\d)/g, '').replace(/(?<![\dd])1(?![\ddD])/g, '').match(/\d+/g) || []).sort().join(',');
const problems = [];
for (const k of Object.keys(en)) {
  if (!(k in pt)) { problems.push(`${k}: faltando`); continue; }
  const a = en[k], b = pt[k];
  if (typeof b !== 'string' || !b.trim()) { problems.push(`${k}: vazio`); continue; }
  if (count(a, /\*\*/g) !== count(b, /\*\*/g)) problems.push(`${k}: número de ** diferente`);
  if (count(a, /(^|[\s(])_(?=\S)/g) !== count(b, /(^|[\s(])_(?=\S)/g)) problems.push(`${k}: marcação _itálico_ diferente`);
  if (count(a, /\n/g) !== count(b, /\n/g)) problems.push(`${k}: quebras de linha diferentes (${count(a, /\n/g)} vs ${count(b, /\n/g)})`);
  if (count(a, /^#+ /gm) !== count(b, /^#+ /gm)) problems.push(`${k}: títulos # diferentes`);
  if (count(a, /^- /gm) !== count(b, /^- /gm)) problems.push(`${k}: itens de lista diferentes`);
  if (sig(a) !== sig(b)) problems.push(`${k}: números/dados diferentes [${sig(a)}] vs [${sig(b)}]`);
}
for (const k of Object.keys(pt)) if (!(k in en)) problems.push(`${k}: chave extra`);
if (problems.length) { console.log(problems.length + ' problema(s):\n' + problems.slice(0, 60).join('\n')); process.exit(1); }
console.log('OK:', Object.keys(en).length, 'strings');
if (flag === '--merge') {
  const f = 'data-src/pt/translations.json';
  const dict = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  for (const k of Object.keys(en)) dict[en[k]] = pt[k];
  fs.writeFileSync(f, JSON.stringify(dict, null, 1));
  console.log('mesclado; total no dicionário:', Object.keys(dict).length);
}
