'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { ADV_TYPE_PT } from '@/lib/rules.js';
import { useSrd } from './Providers.jsx';
import { Pips } from './Resources.jsx';
import { QuickDice } from './RollKit.jsx';
import { AdversaryBlock, EnvironmentBlock } from './Cards.jsx';

const uid = () => Math.random().toString(36).slice(2, 10);

export default function GmPanel({ campaign, run, busy, reload }) {
  const { srd } = useSrd();
  const [gm, setGm] = useState(null); const [err, setErr] = useState(''); const [saved, setSaved] = useState('');
  const timer = useRef(null);
  useEffect(() => { api(`/api/campaigns/${campaign.id}/gm`).then(d => setGm(d.gm)).catch(e => setErr(e.message)); }, [campaign.id]);

  const save = (next) => {
    setGm(next); setSaved('');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { try { await api(`/api/campaigns/${campaign.id}/gm`, { method: 'PUT', body: next }); setSaved('Salvo'); } catch (e) { setErr(e.message); } }, 600);
  };
  const fear = (body) => api(`/api/campaigns/${campaign.id}/gm/fear`, { method: 'POST', body }).then(reload).catch(e => setErr(e.message));
  const rest = (kind) => api(`/api/campaigns/${campaign.id}/gm/rest`, { method: 'POST', body: { kind } }).then(reload).catch(e => setErr(e.message));
  const link = typeof window !== 'undefined' ? `${window.location.origin}/convite/${campaign.inviteCode}` : '';
  const [copied, setCopied] = useState(false);
  if (!gm || !srd) return err ? <div className="error">{err}</div> : null;

  const setEnc = (id, patch) => save({ ...gm, encounters: gm.encounters.map(e => e.id === id ? { ...e, ...patch } : e) });
  const setAdv = (eid, aid, patch) => save({ ...gm, encounters: gm.encounters.map(e => e.id === eid ? { ...e, adversaries: e.adversaries.map(a => a.id === aid ? { ...a, ...patch } : a) } : e) });

  const attack = (a, hidden) => {
    const ref = srd.adversaries.find(x => x.name === a.ref || x.id === a.ref);
    const bonus = ref ? parseInt(ref.atkBonus, 10) || 0 : 0;
    run({ type: 'dice', campaignId: campaign.id, hidden, expression: `1d20${bonus >= 0 ? '+' : ''}${bonus}`, label: `${a.name}: ataque${hidden ? ' (oculto)' : ''}` });
  };
  const damage = (a, hidden) => {
    const ref = srd.adversaries.find(x => x.name === a.ref || x.id === a.ref);
    const m = ref?.attack?.detail.match(/(\d+d\d+(?:[+-]\d+)?|\d+)\s*(phy|mag)/i);
    if (!m) return;
    run({ type: 'dice', campaignId: campaign.id, hidden, expression: m[1], label: `${a.name}: dano ${m[2].toLowerCase() === 'mag' ? 'mágico' : 'físico'}${hidden ? ' (oculto)' : ''}` });
  };

  return (
    <div className="stack">
      {err && <div className="error" role="alert" onClick={() => setErr('')}>{err}</div>}
      <div className="grid g2">
        <section className="panel stack">
          <h3>Medo</h3>
          <div className="fearbar" aria-label={`Medo: ${campaign.fear} de 12`}>{Array.from({ length: 12 }, (_, i) => <i key={i} className={i < campaign.fear ? 'on' : ''} />)}</div>
          <div className="row"><button className="btn sm" onClick={() => fear({ delta: -1 })}>−1</button><button className="btn sm fear" onClick={() => fear({ delta: 1 })}>+1</button><button className="btn sm ghost" onClick={() => fear({ set: 0 })}>Zerar</button><span className="muted small">{campaign.fear}/12. Sobe sozinho quando alguém rola com Medo.</span></div>
          <div className="row"><button className="btn sm" onClick={() => rest('short')}>Descanso curto (+1d4 Medo)</button><button className="btn sm" onClick={() => rest('long')}>Descanso longo (+ nº de PJs + 1d4)</button></div>
        </section>
        <section className="panel stack">
          <h3>Convite</h3>
          <p className="muted small" style={{ margin: 0 }}>Quem abrir este link entra na campanha e escolhe o personagem. Gere um novo link para invalidar o antigo.</p>
          <div className="row"><input readOnly value={link} aria-label="Link de convite" onFocus={e => e.target.select()} style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? 'Copiado' : 'Copiar'}</button></div>
          <button className="btn sm ghost" onClick={async () => { if (confirm('O link atual deixará de funcionar. Continuar?')) { await api(`/api/campaigns/${campaign.id}`, { method: 'PATCH', body: { regenerateInvite: true } }); reload(); } }}>Gerar novo link</button>
        </section>
      </div>

      <section className="panel stack">
        <div className="row between"><h3 style={{ margin: 0 }}>Encontros</h3><span className="muted small">{saved}</span></div>
        <p className="muted small" style={{ margin: 0 }}>Monte encontros com adversários e ambientes do SRD. Só o que você marcar como visível aparece para os jogadores (nome e vida). Rolagens ocultas só o mestre vê.</p>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => save({ ...gm, encounters: [...gm.encounters, { id: uid(), name: 'Novo encontro', active: false, environment: null, revealEnvironment: false, notes: '', adversaries: [] }] })}>Novo encontro</button>
        {gm.encounters.map(e => (
          <details key={e.id} className="fold" open={e.active}>
            <summary>{e.name} {e.active && <span className="chip on">visível aos jogadores</span>} <span className="muted small">· {e.adversaries.length} adversário(s)</span></summary>
            <div className="stack">
              <div className="row"><input aria-label="Nome do encontro" value={e.name} onChange={ev => setEnc(e.id, { name: ev.target.value })} style={{ flex: 1, minWidth: 160 }} />
                <label className="row small"><input type="checkbox" checked={e.active} onChange={ev => setEnc(e.id, { active: ev.target.checked })} /> Mostrar aos jogadores</label>
                <button className="btn sm danger" onClick={() => confirm('Excluir este encontro?') && save({ ...gm, encounters: gm.encounters.filter(x => x.id !== e.id) })}>Excluir</button></div>
              <div className="row"><select aria-label="Ambiente" value={e.environment || ''} onChange={ev => setEnc(e.id, { environment: ev.target.value || null })} style={{ maxWidth: 300 }}><option value="">Sem ambiente</option>{srd.environments.map(x => <option key={x.id} value={x.name}>P{x.tier} · {x.name}</option>)}</select>
                {e.environment && <label className="row small"><input type="checkbox" checked={e.revealEnvironment} onChange={ev => setEnc(e.id, { revealEnvironment: ev.target.checked })} /> Revelar nome do ambiente</label>}</div>
              {e.environment && <EnvironmentBlock e={srd.environments.find(x => x.name === e.environment || x.id === e.environment)} />}
              {e.adversaries.map(a => (
                <div key={a.id} className="mini-card" style={{ '--cc': a.revealed ? 'var(--good)' : 'var(--fear)' }}>
                  <div className="row between"><b>{a.name}</b><span className="muted small">P{a.tier} {ADV_TYPE_PT[a.type] || a.type} · Dif. {a.difficulty}</span></div>
                  <div className="row" style={{ gap: 18 }}>
                    <div><div className="tiny muted">PV {a.hpMax - a.hp}/{a.hpMax}</div><Pips label="PV" value={a.hp} max={Math.min(a.hpMax, 16)} color="#ff7b7b" onChange={v => setAdv(e.id, a.id, { hp: v })} /></div>
                    <div><div className="tiny muted">Fadiga {a.stressMax - a.stress}/{a.stressMax}</div><Pips label="Fadiga" value={a.stress} max={a.stressMax} color="#ffb35c" onChange={v => setAdv(e.id, a.id, { stress: v })} /></div>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn sm" disabled={busy} onClick={() => attack(a, false)}>Atacar</button><button className="btn sm" disabled={busy} onClick={() => attack(a, true)}>Atacar (oculto)</button>
                    <button className="btn sm" disabled={busy} onClick={() => damage(a, false)}>Dano</button>
                    <label className="row small"><input type="checkbox" checked={a.revealed} onChange={ev => setAdv(e.id, a.id, { revealed: ev.target.checked })} /> Visível</label>
                    <button className="btn sm danger" onClick={() => setEnc(e.id, { adversaries: e.adversaries.filter(x => x.id !== a.id) })}>Remover</button>
                  </div>
                  <details className="fold" style={{ marginTop: 8 }}><summary>Ficha do adversário</summary><AdversaryBlock a={srd.adversaries.find(x => x.name === a.ref || x.id === a.ref) || { name: a.name, features: [], desc: '' }} /></details>
                </div>))}
              <AddAdversary srd={srd} onAdd={(ref) => setEnc(e.id, { adversaries: [...e.adversaries, { id: uid(), ref: ref.name, name: ref.name, tier: ref.tier, type: ref.type, difficulty: ref.difficulty || 0, hp: 0, hpMax: ref.hp || 0, stress: 0, stressMax: ref.stress || 0, revealed: false, notes: '' }] })} />
            </div>
          </details>))}
      </section>

      <div className="grid g2">
        <section className="panel stack"><h3>Rolagem oculta</h3><p className="muted small" style={{ margin: 0 }}>Só você vê o resultado.</p>
          <QuickDice run={(p) => run({ ...p, campaignId: campaign.id, hidden: true })} busy={busy} label="Mestre (oculto)" /></section>
        <section className="panel stack"><h3>Notas do mestre</h3><p className="muted small" style={{ margin: 0 }}>Privadas: nenhum jogador consegue ler.</p>
          <textarea value={gm.notes} onChange={e => save({ ...gm, notes: e.target.value })} style={{ minHeight: 200 }} maxLength={20000} /></section>
      </div>

      <section className="panel stack">
        <h3>Jogadores</h3>
        {campaign.members.map(m => (<div key={m.id} className="row between"><span>{m.name}{m.isGm ? ' (mestre)' : ''}</span>
          {!m.isGm && <button className="btn sm danger" onClick={async () => { if (confirm(`Remover ${m.name} da campanha?`)) { await api(`/api/campaigns/${campaign.id}/members?userId=${m.id}`, { method: 'DELETE' }); reload(); } }}>Remover</button>}</div>))}
        <hr style={{ borderColor: 'var(--line)', width: '100%' }} />
        <div className="row"><RenameCampaign campaign={campaign} reload={reload} />
          <button className="btn danger" onClick={async () => { if (confirm('Excluir a campanha e todo o histórico de rolagens? Isso não pode ser desfeito.')) { await api('/api/campaigns/' + campaign.id, { method: 'DELETE' }); window.location.href = '/campanhas'; } }}>Excluir campanha</button></div>
      </section>
    </div>
  );
}

function AddAdversary({ srd, onAdd }) {
  const [tier, setTier] = useState('1'); const [name, setName] = useState('');
  const opts = srd.adversaries.filter(a => a.tier === +tier);
  return (
    <div className="row"><select aria-label="Patamar" value={tier} onChange={e => { setTier(e.target.value); setName(''); }} style={{ width: 'auto' }}>{[1, 2, 3, 4].map(t => <option key={t} value={t}>Patamar {t}</option>)}</select>
      <select aria-label="Adversário" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: 180 }}><option value="">Escolha um adversário…</option>{opts.map(a => <option key={a.id} value={a.name}>{a.name} ({a.type})</option>)}</select>
      <button className="btn" disabled={!name} onClick={() => { onAdd(srd.adversaries.find(a => a.name === name)); setName(''); }}>Adicionar</button></div>
  );
}

function RenameCampaign({ campaign, reload }) {
  const [n, setN] = useState(campaign.name);
  return <form className="row" onSubmit={async e => { e.preventDefault(); await api('/api/campaigns/' + campaign.id, { method: 'PATCH', body: { name: n } }); reload(); }}><input aria-label="Nome da campanha" value={n} onChange={e => setN(e.target.value)} maxLength={60} /><button className="btn sm">Renomear</button></form>;
}
