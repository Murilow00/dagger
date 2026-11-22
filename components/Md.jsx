// Renderizador mínimo de markdown (negrito, itálico, listas, citações). Sem HTML bruto: seguro por construção.
import { Fragment } from 'react';

function inline(text, key = 'i') {
  const parts = String(text).split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*\n]+\*)/g).filter(p => p !== '');
  return parts.map((p, i) => {
    const k = key + i;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k}>{inline(p.slice(2, -2), k)}</strong>;
    if (p.startsWith('_') && p.endsWith('_') && p.length > 2) return <em key={k}>{inline(p.slice(1, -1), k)}</em>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    return <Fragment key={k}>{p}</Fragment>;
  });
}

export default function Md({ text, className = '' }) {
  if (!text) return null;
  const blocks = [];
  let list = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.trimEnd();
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (b) { if (!list) { list = []; blocks.push({ t: 'ul', items: list }); } list.push(b[1]); continue; }
    list = null;
    if (!line.trim()) continue;
    const q = line.match(/^>\s?(.*)$/);
    if (q) { blocks.push({ t: 'q', text: q[1] }); continue; }
    const h = line.match(/^#{3,6}\s+(.*)$/);
    if (h) { blocks.push({ t: 'h', text: h[1] }); continue; }
    if (/^\|/.test(line)) continue;
    blocks.push({ t: 'p', text: line });
  }
  return (
    <div className={'md ' + className}>
      {blocks.map((b, i) => b.t === 'ul' ? <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>
        : b.t === 'q' ? <blockquote key={i}>{inline(b.text)}</blockquote>
        : b.t === 'h' ? <h4 key={i}>{inline(b.text)}</h4>
        : <p key={i}>{inline(b.text)}</p>)}
    </div>
  );
}
