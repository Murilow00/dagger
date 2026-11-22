'use client';
import { useMemo, useState } from 'react';
import { useSrd } from '@/components/Providers.jsx';
import { DomainCard, Features, WeaponLine } from '@/components/Cards.jsx';
import Md from '@/components/Md.jsx';
import { CLASS_PT, DOMAIN_PT, CLASS_COLORS, COMMUNITY_COLORS, DOMAIN_COLORS, TRAIT_LABEL, RANGE_PT, readableOn } from '@/lib/rules.js';

const TABS = [['cards', 'Cartas de domínio'], ['classes', 'Classes'], ['subclasses', 'Subclasses'], ['ancestries', 'Ancestralidades'], ['communities', 'Comunidades'], ['weapons', 'Armas'], ['armor', 'Armaduras'], ['items', 'Itens'], ['consumables', 'Consumíveis'], ['beastforms', 'Formas de fera']];

export default function Library() {
  const { srd } = useSrd();
  const [tab, setTab] = useState('cards');
  const [q, setQ] = useState(''); const [domain, setDomain] = useState(''); const [level, setLevel] = useState(''); const [tier, setTier] = useState('');
  const match = (x) => !q || (x.name + ' ' + (x.text || '') + ' ' + (x.description || '')).toLowerCase().includes(q.toLowerCase());
  const data = useMemo(() => {
    if (!srd) return [];
    if (tab === 'cards') return srd.cards.filter(c => match(c) && (!domain || c.domain === domain) && (!level || c.level === +level)).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    if (['weapons', 'armor', 'beastforms'].includes(tab)) return srd[tab].filter(x => match(x) && (!tier || x.tier === +tier));
    return srd[tab].filter(match);
  }, [srd, tab, q, domain, level, tier]); // eslint-disable-line
  if (!srd) return null;
  return (
    <main className="wrap page">
      <h1>Biblioteca</h1>
      <p className="muted">Conteúdo do SRD 1.0 do Daggerheart, traduzido para o português do Brasil. {data.length} resultado(s).</p>
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="row" style={{ marginBottom: 16 }}>
        <input aria-label="Buscar" placeholder="Buscar por nome ou texto…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        {tab === 'cards' && <><select aria-label="Domínio" value={domain} onChange={e => setDomain(e.target.value)} style={{ width: 'auto' }}><option value="">Todos os domínios</option>{srd.domains.map(d => <option key={d.id} value={d.id}>{DOMAIN_PT[d.id]}</option>)}</select>
          <select aria-label="Nível" value={level} onChange={e => setLevel(e.target.value)} style={{ width: 'auto' }}><option value="">Todos os níveis</option>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>Nível {i + 1}</option>)}</select></>}
        {['weapons', 'armor', 'beastforms'].includes(tab) && <select aria-label="Patamar" value={tier} onChange={e => setTier(e.target.value)} style={{ width: 'auto' }}><option value="">Todos os patamares</option>{[1, 2, 3, 4].map(t => <option key={t} value={t}>Patamar {t}</option>)}</select>}
      </div>
      {!data.length && <div className="empty">Nada encontrado. Tente outra busca ou limpe os filtros.</div>}
      {tab === 'cards' && <div className="grid g3">{data.map(c => <DomainCard key={c.id} card={c} />)}</div>}
      {tab === 'classes' && <div className="grid g2">{data.map(c => (
        <div key={c.id} className="card" style={{ '--cc': CLASS_COLORS[c.id] }}>
          <h4>{CLASS_PT[c.id]} <span className="muted small">({c.name})</span></h4>
          <div className="meta"><span className="chip">{c.domains.map(d => DOMAIN_PT[d]).join(' & ')}</span><span className="chip">Evasão {c.evasion}</span><span className="chip">PV {c.hp}</span></div>
          <p className="small">{c.description}</p>
          <Features list={[...(c.hopeFeature ? [{ ...c.hopeFeature, source: 'Esperança (3 PE)' }] : []), ...c.classFeatures]} />
          <div className="small muted">Subclasses: {c.subclasses.join(', ')}. Sugestão: {c.suggested.primary}{c.suggested.secondary ? ' + ' + c.suggested.secondary : ''}, {c.suggested.armor}.</div>
        </div>))}</div>}
      {tab === 'subclasses' && <div className="grid g2">{data.map(s => {
        const cl = srd.classes.find(c => c.subclasses.includes(s.name));
        return (<div key={s.id} className="card" style={{ '--cc': CLASS_COLORS[cl?.id] }}>
          <h4>{s.name}</h4><div className="meta"><span className="chip">{CLASS_PT[cl?.id]}</span>{s.spellcast && <span className="chip">Conjuração: {TRAIT_LABEL[s.spellcast]}</span>}</div>
          <p className="small muted"><em>{s.tagline}</em></p>
          <h4>Fundação</h4><Features list={s.foundation} /><h4>Especialização</h4><Features list={s.specialization} /><h4>Maestria</h4><Features list={s.mastery} />
          {s.extra && <details className="fold"><summary>Regras extras</summary><Md text={s.extra} /></details>}
        </div>); })}</div>}
      {tab === 'ancestries' && <div className="grid g3">{data.map(a => <div key={a.id} className="card" style={{ '--cc': '#8d99a6' }}><h4>{a.name}</h4><p className="small muted">{a.description}</p><Features list={a.features} /></div>)}</div>}
      {tab === 'communities' && <div className="grid g3">{data.map(a => <div key={a.id} className="card" style={{ '--cc': COMMUNITY_COLORS[a.id] }}><h4>{a.name}</h4><p className="small muted">{a.description}</p><p className="small"><em>{a.adjectives}</em></p><Features list={a.features} /></div>)}</div>}
      {tab === 'weapons' && [['Armas comuns', false], ['Armas mágicas', true]].map(([title, mg]) => { const list = data.filter(w => !!w.magic === mg); return (
        <div key={title} className="panel" style={{ overflowX: 'auto' }}><h3 style={{ color: mg ? 'var(--fear)' : 'var(--hope)' }}>{title} <span className="muted small">({list.length})</span></h3>
          {list.length ? <table className="t"><thead><tr><th>Nome</th><th>Atributo</th><th>Alcance</th><th>Dano</th><th>Empunhadura</th><th>Habilidade</th></tr></thead><tbody>
            {[1, 2, 3, 4].map(t => { const rows = list.filter(w => w.tier === t); return rows.length ? [<tr key={'h' + t}><th colSpan={6} style={{ color: 'var(--muted)' }}>Patamar {t}</th></tr>, ...['primary', 'secondary'].flatMap(s => rows.filter(w => w.slot === s).map(w => <WeaponLine key={w.id} w={w} />))] : null; })}</tbody></table> : <p className="muted">Nenhuma arma com esses filtros.</p>}</div>); })}
      {tab === 'armor' && <div className="panel" style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Nome</th><th>Patamar</th><th>Limiares base</th><th>Armadura base</th><th>Habilidade</th></tr></thead><tbody>
        {data.map(a => <tr key={a.id}><td><b>{a.name}</b></td><td>{a.tier}</td><td>{a.major}/{a.severe}</td><td>{a.score}</td><td className="small">{a.features.map(f => `${f.name}: ${f.text}`).join(' ') || '—'}</td></tr>)}</tbody></table></div>}
      {['items', 'consumables'].includes(tab) && <div className="grid g3">{data.map(i => <div key={i.id} className="card" style={{ '--cc': tab === 'items' ? '#8d99a6' : '#5fd49a' }}><h4>{i.name}</h4><Md text={i.text} /></div>)}</div>}
      {tab === 'beastforms' && <div className="grid g2">{data.map(b => <div key={b.id} className="card" style={{ '--cc': '#4aa04a' }}><div className="meta"><span className="chip">Patamar {b.tier}</span></div><h4>{b.name}</h4><p className="small muted">{b.examples}</p>
        <div className="stat-line"><span><b>Atributo</b> {b.trait}</span><span><b>Evasão</b> {b.evasion}</span></div><div className="stat-line"><span><b>Ataque</b> {b.attack}</span></div><div className="stat-line"><span><b>Vantagem em</b> {b.advantages}</span></div><Features list={b.features} /></div>)}</div>}
    </main>
  );
}
