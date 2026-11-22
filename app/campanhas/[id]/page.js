'use client';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client/api.js';
import { useAuth, useDice, useRequireAuth } from '@/components/Providers.jsx';
import CharacterCard from '@/components/CharacterCard.jsx';
import { RollItem } from '@/components/RollView.jsx';
import { QuickDice, useRoller } from '@/components/RollKit.jsx';
import GmPanel from '@/components/GmPanel.jsx';
import { CLASS_PT } from '@/lib/rules.js';

export default function CampaignPage({ params }) {
  const { id } = use(params);
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const { play, anim } = useDice();
  const [c, setC] = useState(null); const [rolls, setRolls] = useState([]); const [err, setErr] = useState('');
  const [tab, setTab] = useState('mesa'); const [live, setLive] = useState(false);
  const [mine, setMine] = useState([]); const [pick, setPick] = useState('');
  const seen = useRef(new Set()); const animRef = useRef(anim); animRef.current = anim;

  const reload = useCallback(() => api('/api/campaigns/' + id).then(d => setC(d.campaign)).catch(e => { setErr(e.message); }), [id]);
  const addRoll = useCallback((r, delay = 0) => {
    if (seen.current.has(r.id + r.campaignId)) return;
    seen.current.add(r.id + r.campaignId);
    const put = () => setRolls(list => [...list, r].slice(-150));
    delay ? setTimeout(put, delay) : put();
  }, []);

  useEffect(() => {
    if (loading) return;
    reload();
    api(`/api/campaigns/${id}/rolls`).then(d => d.rolls.forEach(r => { addRoll(r); lastId.current = r.id; }));
    api('/api/characters').then(d => setMine(d.characters)).catch(() => {});
  }, [loading, id, reload, addRoll]);

  // Tempo real por consulta leve: um contador de rolagens (r) e um de mudanças na campanha (c).
  // Quando r muda, busca só as rolagens novas; quando c muda, recarrega a campanha.
  const lastId = useRef('');
  useEffect(() => {
    if (loading || !user) return;
    let stop = false, timer = null, busy = false, last = null;
    const onRoll = (r) => {
      lastId.current = r.id;
      if (seen.current.has(r.id + r.campaignId)) return;
      const age = Math.max(0, Date.now() - r.ts), stale = age > 15000;
      const own = r.userId === user.id;
      if (stale || animRef.current === 'off') return addRoll(r);
      if (own) return addRoll(r, Math.max(0, 3200 - age));     // a animação já está rodando: revela o resultado depois
      if (animRef.current === 'mine') return addRoll(r);
      play(r, { compact: true }); addRoll(r, Math.max(0, 1700 - age));
    };
    const tick = async () => {
      if (stop || busy) return; busy = true;
      try {
        const t = await api(`/api/campaigns/${id}/tick`);
        setLive(true);
        if (t.c === -1) { window.location.href = '/campanhas'; return; }
        if (!last || t.r !== last.r) {
          const d = await api(`/api/campaigns/${id}/rolls?after=${encodeURIComponent(lastId.current)}`);
          d.rolls.forEach(onRoll);
        }
        if (!last || t.c !== last.c) reload();
        last = t;
      } catch { setLive(false); } finally { busy = false; }
    };
    const loop = async () => { await tick(); if (!stop) timer = setTimeout(loop, document.hidden ? 8000 : 2500); };
    const kick = () => { clearTimeout(timer); loop(); };
    window.addEventListener('dh:sync', kick);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    loop();
    return () => { stop = true; clearTimeout(timer); window.removeEventListener('dh:sync', kick); };
  }, [loading, user, id, reload, addRoll, play]);

  const { run, busy, error } = useRoller({ campaignId: id });
  if (loading) return null;
  if (err && !c) return <main className="wrap page"><div className="error">{err}</div><p><Link href="/campanhas">Voltar às campanhas</Link></p></main>;
  if (!c) return null;

  const inTable = new Set(c.characters.map(x => x.id));
  const available = mine.filter(m => !inTable.has(m.id));
  const myChars = c.characters.filter(x => x.ownerId === user?.id);
  const addChar = async () => { try { await api(`/api/campaigns/${id}/characters`, { method: 'POST', body: { characterId: pick } }); setPick(''); reload(); api('/api/characters').then(d => setMine(d.characters)); } catch (e) { setErr(e.message); } };

  return (
    <main className="wrap page">
      <div className="row between">
        <div><h1 style={{ marginBottom: 4 }}>{c.name}</h1><div className="muted">Mestre: {c.gm.name} · {c.members.length - 1} jogador(es) · <span title={live ? 'Recebendo rolagens ao vivo' : 'Reconectando…'}>{live ? '● ao vivo' : '○ reconectando…'}</span></div></div>
        <div style={{ textAlign: 'right' }}><div className="tiny muted">Medo do mestre</div><div className="fearbar" aria-label={`Medo: ${c.fear} de 12`}>{Array.from({ length: 12 }, (_, i) => <i key={i} className={i < c.fear ? 'on' : ''} />)}</div></div>
      </div>
      {c.description && <p className="muted">{c.description}</p>}
      {err && <div className="error" role="alert" onClick={() => setErr('')}>{err}</div>}
      <div className="tabs" role="tablist" style={{ marginTop: 14 }}>
        <button role="tab" aria-selected={tab === 'mesa'} className={tab === 'mesa' ? 'on' : ''} onClick={() => setTab('mesa')}>Mesa</button>
        {c.isGm && <button role="tab" aria-selected={tab === 'gm'} className={tab === 'gm' ? 'on' : ''} onClick={() => setTab('gm')}>Menu do mestre</button>}
      </div>

      {tab === 'mesa' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,.9fr)', alignItems: 'start' }}>
          <div className="stack">
            <section className="stack">
              <h2>Grupo</h2>
              {!c.characters.length && <div className="empty">Nenhum personagem na mesa ainda.{!c.isGm && ' Adicione o seu abaixo.'}</div>}
              <div className="grid g2">{c.characters.map(ch => (
                <CharacterCard key={ch.id} c={ch} href={`/personagens/${ch.id}`}>
                  <div className="muted tiny" style={{ marginTop: 6 }}>Jogador: {ch.ownerName}{ch.conditions.length ? ' · ' + ch.conditions.join(', ') : ''}</div>
                  {ch.ownerId === user?.id && <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={async (e) => { e.preventDefault(); if (confirm(`Tirar ${ch.name} desta campanha?`)) { await api(`/api/campaigns/${id}/characters?characterId=${ch.id}`, { method: 'DELETE' }); reload(); } }}>Tirar da campanha</button>}
                </CharacterCard>))}</div>
            </section>
            {!c.isGm && (
              <section className="panel stack"><h3>Meus personagens nesta mesa</h3>
                <p className="muted small" style={{ margin: 0 }}>{myChars.length ? 'Role pela ficha do personagem: todas as rolagens aparecem para a mesa.' : 'Adicione um personagem para que as suas rolagens apareçam para todos.'}</p>
                {myChars.map(ch => <Link key={ch.id} className="btn" href={`/personagens/${ch.id}`}>Abrir ficha de {ch.name}</Link>)}
                {available.length > 0 ? <div className="row"><select aria-label="Personagem" value={pick} onChange={e => setPick(e.target.value)} style={{ flex: 1 }}><option value="">Escolha um personagem…</option>{available.map(m => <option key={m.id} value={m.id}>{m.name} · {CLASS_PT[m.classId]} nv {m.level}</option>)}</select><button className="btn primary" disabled={!pick} onClick={addChar}>Adicionar à mesa</button></div>
                  : <Link className="btn" href="/personagens/novo">Criar outro personagem</Link>}
              </section>)}
            {c.revealed.length > 0 && (
              <section className="stack"><h2>Em cena</h2>
                {c.revealed.map(e => <div key={e.id} className="panel stack"><h3 style={{ margin: 0 }}>{e.name}{e.environment ? ` · ${e.environment}` : ''}</h3>
                  {e.adversaries.map(a => <div key={a.id}><div className="row between"><b>{a.name}</b><span className="muted small">PV {a.hpMax - a.hp}/{a.hpMax}</span></div><div className="bar" aria-hidden="true"><i style={{ width: `${a.hpMax ? 100 * (a.hpMax - a.hp) / a.hpMax : 0}%`, '--bc': '#ff7b7b' }} /></div></div>)}</div>)}
              </section>)}
          </div>

          <section className="panel stack">
            <h2 style={{ margin: 0 }}>Rolagens da mesa</h2>
            <div className="log" aria-live="polite">
              {!rolls.length && <p className="muted">As rolagens de todos aparecem aqui, em tempo real.</p>}
              {[...rolls].reverse().map(r => r.type === 'rest' ? <div key={r.id} className="roll-item"><b>{r.label}</b>: o mestre ganhou {r.result.gain} de Medo.</div> : <RollItem key={r.id + r.campaignId} roll={r} />)}
            </div>
            <details className="fold"><summary>Rolar dados soltos na mesa</summary><QuickDice run={(p) => run({ ...p, campaignId: id })} busy={busy} label={user?.displayName} />{error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}</details>
          </section>
        </div>)}

      {tab === 'gm' && c.isGm && <GmPanel campaign={c} run={run} busy={busy} reload={reload} />}
    </main>
  );
}
