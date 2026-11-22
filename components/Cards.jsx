'use client';
import Md from './Md.jsx';
import { DOMAIN_COLORS, DOMAIN_PT, CARD_TYPE_PT, CLASS_PT, RANGE_PT, ADV_TYPE_PT, ENV_TYPE_PT, TRAIT_LABEL, readableOn } from '@/lib/rules.js';

export function Features({ list }) {
  return list.map((f, i) => (
    <div className="feat" key={i}>
      <b>{f.name}</b>{f.kind && <span className="kind">{{ Passive: 'Passiva', Action: 'Ação', Reaction: 'Reação' }[f.kind] || f.kind}</span>}{f.source && <span className="kind">{f.source}</span>}
      <Md text={f.text} />
    </div>
  ));
}

export function DomainCard({ card, onClick, selected, actions, compact }) {
  const c = DOMAIN_COLORS[card.domain] || '#888';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="card" onClick={onClick} style={{ '--cc': c, '--on': readableOn(c), textAlign: 'left', font: 'inherit', color: 'inherit', cursor: onClick ? 'pointer' : 'default', outline: selected ? '3px solid var(--hope)' : undefined, width: '100%' }}>
      <div className="row between" style={{ gap: 8 }}>
        <span className="lvl" title={`Nível ${card.level}`}>{card.level}</span>
        <span className="chip">{DOMAIN_PT[card.domain] || card.domain} · {CARD_TYPE_PT[card.type] || card.type}</span>
      </div>
      <h4>{card.name}</h4>
      <div className="meta"><span className="chip" title="Custo de recordação">Recordar: {card.recall}</span></div>
      {!compact && <Md text={card.text} />}
      {actions}
    </Tag>
  );
}

export function WeaponLine({ w }) {
  return (
    <tr><td><b>{w.name}</b></td><td>{TRAIT_LABEL[w.trait]}</td><td>{RANGE_PT[w.range] || w.range}</td><td>{w.damageRaw.replace('phy', 'fís').replace('mag', 'mág')}</td><td>{w.burden === 'two' ? 'Duas mãos' : 'Uma mão'}</td><td className="small">{w.features.map(f => `${f.name}: ${f.text}`).join(' ') || '—'}</td></tr>
  );
}

export function AdversaryBlock({ a, actions }) {
  const c = ['#5fd49a', '#f4c95d', '#ff9d5c', '#ff6b6b'][(a.tier || 1) - 1];
  return (
    <div className="card" style={{ '--cc': c }}>
      <div className="row between"><span className="chip">Patamar {a.tier} · {ADV_TYPE_PT[a.type] || a.type}{a.horde ? ` (${a.horde})` : ''}</span><span className="chip">Dificuldade {a.difficulty}</span></div>
      <h4>{a.name}</h4>
      <p className="muted small" style={{ margin: '0 0 6px' }}><em>{a.desc}</em></p>
      <div className="stat-line"><span><b>PV</b> {a.hp}</span><span><b>Fadiga</b> {a.stress}</span>{a.thresholds ? <span><b>Limiares</b> {a.thresholds.major ?? '—'}/{a.thresholds.severe ?? '—'}</span> : <span><b>Limiares</b> nenhum</span>}</div>
      {a.attack && <div className="stat-line"><span><b>ATQ</b> {a.attack.bonus}</span><span><b>{a.attack.name}</b> {a.attack.detail.replace('phy', 'fís').replace('mag', 'mág')}</span></div>}
      {a.experience && <div className="stat-line"><span><b>Experiência</b> {a.experience}</span></div>}
      <div className="stat-line"><span><b>Motivos e táticas</b> {a.motives}</span></div>
      <Features list={a.features} />
      {a.minionNote && !a.features.some(f => /Minion/.test(f.name)) && <Md text={a.minionNote} />}
      {actions}
    </div>
  );
}

export function EnvironmentBlock({ e, actions }) {
  const c = ['#5fd49a', '#f4c95d', '#ff9d5c', '#ff6b6b'][(e.tier || 1) - 1];
  return (
    <div className="card" style={{ '--cc': c }}>
      <div className="row between"><span className="chip">Patamar {e.tier} · {ENV_TYPE_PT[e.type] || e.type}</span><span className="chip">Dificuldade {e.difficulty ?? e.difficultyText}</span></div>
      <h4>{e.name}</h4>
      <p className="muted small" style={{ margin: '0 0 6px' }}><em>{e.desc}</em></p>
      <div className="stat-line"><span><b>Impulsos</b> {e.impulses}</span></div>
      <div className="stat-line"><span><b>Adversários possíveis</b> {e.adversaries}</span></div>
      <Features list={e.features} />
      {actions}
    </div>
  );
}

export const classLabel = (id) => CLASS_PT[id] || id;
