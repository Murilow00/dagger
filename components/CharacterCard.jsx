'use client';
import Link from 'next/link';
import { CLASS_PT, readableOn, nameOf } from '@/lib/rules.js';
import { useSrd } from './Providers.jsx';

export default function CharacterCard({ c, href, children }) {
  const { idx } = useSrd();
  const A = (k) => nameOf(idx, 'ancestries', k);
  const { primary, secondary } = c.colors;
  const inner = (
    <>
      <div className="top" style={{ '--c1': primary, '--c2': secondary }} />
      <div className="in">
        <div className="row between"><b style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem' }}>{c.name}</b><span className="chip lvl-pill">Nível {c.level}</span></div>
        <div className="muted small">{CLASS_PT[c.classId]} · {nameOf(idx, 'subclasses', c.subclassId)} · {c.ancestry.b ? `${A(c.ancestry.a)}/${A(c.ancestry.b)}` : A(c.ancestry.a)} · {nameOf(idx, 'communities', c.community)}</div>
        <div className="stat-line" style={{ marginTop: 8 }}>
          <span><b>PV</b> {c.hpMax - c.hp}/{c.hpMax}</span><span><b>Fadiga</b> {c.stressMax - c.stress}/{c.stressMax}</span><span><b>Esperança</b> {c.hope}</span><span><b>Evasão</b> {c.evasion}</span>
        </div>
        {children}
      </div>
    </>
  );
  return <div className="party-card">{href ? <Link href={href} style={{ color: 'inherit', display: 'block' }}>{inner}</Link> : inner}</div>;
}
