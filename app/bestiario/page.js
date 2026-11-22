'use client';
import { useMemo, useState } from 'react';
import { useSrd } from '@/components/Providers.jsx';
import { ADV_TYPE_PT, ENV_TYPE_PT } from '@/lib/rules.js';
import { AdversaryBlock, EnvironmentBlock } from '@/components/Cards.jsx';

export default function Bestiary() {
  const { srd } = useSrd();
  const [tab, setTab] = useState('adv'); const [q, setQ] = useState(''); const [tier, setTier] = useState(''); const [type, setType] = useState('');
  const list = useMemo(() => {
    if (!srd) return [];
    const src = tab === 'adv' ? srd.adversaries : srd.environments;
    return src.filter(x => (!tier || x.tier === +tier) && (!type || x.type === type) && (!q || (x.name + ' ' + x.desc + ' ' + x.features.map(f => f.name + f.text).join(' ')).toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  }, [srd, tab, q, tier, type]);
  if (!srd) return null;
  const types = [...new Set((tab === 'adv' ? srd.adversaries : srd.environments).map(x => x.type))].sort();
  return (
    <main className="wrap page">
      <h1>Bestiário</h1>
      <div className="tabs"><button className={tab === 'adv' ? 'on' : ''} onClick={() => { setTab('adv'); setType(''); }}>Adversários ({srd.adversaries.length})</button><button className={tab === 'env' ? 'on' : ''} onClick={() => { setTab('env'); setType(''); }}>Ambientes ({srd.environments.length})</button></div>
      <div className="row" style={{ marginBottom: 16 }}>
        <input aria-label="Buscar" placeholder="Buscar por nome, descrição ou habilidade…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 340 }} />
        <select aria-label="Patamar" value={tier} onChange={e => setTier(e.target.value)} style={{ width: 'auto' }}><option value="">Todos os patamares</option>{[1, 2, 3, 4].map(t => <option key={t} value={t}>Patamar {t}</option>)}</select>
        <select aria-label="Tipo" value={type} onChange={e => setType(e.target.value)} style={{ width: 'auto' }}><option value="">Todos os tipos</option>{types.map(t => <option key={t} value={t}>{(tab === 'adv' ? ADV_TYPE_PT : ENV_TYPE_PT)[t] || t}</option>)}</select>
        <span className="muted small">{list.length} resultado(s)</span>
      </div>
      {!list.length && <div className="empty">Nenhum resultado com esses filtros.</div>}
      <div className="grid g2">{list.map(x => tab === 'adv' ? <AdversaryBlock key={x.id} a={x} /> : <EnvironmentBlock key={x.id} e={x} />)}</div>
    </main>
  );
}
