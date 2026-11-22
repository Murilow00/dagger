'use client';
import { useMemo, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useSrd } from './Providers.jsx';
import { ADVANCEMENTS, ACHIEVEMENT_LEVELS, CLEAR_MARK_LEVELS, TRAIT_KEYS, TRAIT_LABEL, CLASS_PT, DOMAIN_PT, derive, availableCards, tierOf } from '@/lib/rules.js';
import { DomainCard } from './Cards.jsx';

export default function LevelUp({ char, onClose, onDone }) {
  const { srd, idx } = useSrd();
  const d = useMemo(() => derive(char, idx), [char, idx]);
  const newLevel = d.level + 1, newTier = tierOf(newLevel);
  const hasAch = ACHIEVEMENT_LEVELS.includes(newLevel);
  const marks = CLEAR_MARK_LEVELS.includes(newLevel) ? {} : d.traitMarks;
  const [newExp, setNewExp] = useState('');
  const [picks, setPicks] = useState([]);
  const [card, setCard] = useState(''); const [extra, setExtra] = useState([]);
  const [exOut, setExOut] = useState(''); const [exIn, setExIn] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const cost = picks.reduce((a, p) => a + ADVANCEMENTS[p.id].cost, 0);
  const pendingCount = (tier, id) => picks.filter(p => p.id === id && p.tier === tier).length;
  const options = [];
  for (let t = 2; t <= newTier; t++) for (const [id, opt] of Object.entries(ADVANCEMENTS)) if (opt.minTier <= t) {
    const left = opt.slots - (d.slotsUsed[`${t}:${id}`] || 0) - pendingCount(t, id);
    let blocked = left <= 0 || cost + opt.cost > 2;
    if (id === 'hp' && d.hpMax + picks.filter(p => p.id === 'hp').length >= 12) blocked = true;
    if (id === 'stress' && d.stressMax + picks.filter(p => p.id === 'stress').length >= 12) blocked = true;
    if (id === 'subclass' && d.acc.sub + picks.filter(p => p.id === 'subclass').length >= 2) blocked = true;
    if (id === 'multiclass' && (d.multiclass || picks.some(p => p.id === 'multiclass'))) blocked = true;
    if ((id === 'subclass' && picks.some(p => p.id === 'multiclass' && p.tier === t)) || (id === 'multiclass' && picks.some(p => p.id === 'subclass' && p.tier === t))) blocked = true;
    if ((id === 'subclass' && d.acc.tierFlags[t] === 'multiclass') || (id === 'multiclass' && d.acc.tierFlags[t] === 'subclass')) blocked = true;
    options.push({ id, tier: t, opt, left, blocked });
  }

  const mcPick = picks.find(p => p.id === 'multiclass');
  const avail = useMemo(() => {
    const base = availableCards(char, idx, newLevel);
    if (mcPick?.domain) { const names = new Set(base.map(c => c.name)); const owned = new Set([...char.domainCards.loadout, ...char.domainCards.vault]); for (const c of srd.cards) if (c.domain === mcPick.domain && c.level <= Math.ceil(newLevel / 2) && !names.has(c.name) && !owned.has(c.name)) base.push(c); }
    return base.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [char, idx, newLevel, mcPick?.domain]); // eslint-disable-line
  const extraNeeded = picks.filter(p => p.id === 'domain').length;
  const expList = [...d.experiences, ...(hasAch && newExp.trim() ? [{ id: `e${char.experiences.length + 1}`, name: newExp.trim() }] : [])];
  const ownedCards = [...char.domainCards.loadout, ...char.domainCards.vault];

  const updatePick = (i, patch) => setPicks(picks.map((p, j) => j === i ? { ...p, ...patch } : p));
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const body = { newExperience: hasAch ? newExp : undefined, advancements: picks, domainCard: card, extraCards: extra.slice(0, extraNeeded), exchange: exOut && exIn ? { out: exOut, in: exIn } : undefined };
      const r = await api(`/api/characters/${char.id}/levelup`, { method: 'POST', body });
      onDone(r.character);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const pickLabel = (p) => `${ADVANCEMENTS[p.id].label} (${p.tier}º patamar)`;
  return (
    <section className="panel" style={{ marginBottom: 16, borderColor: 'var(--hope)' }}>
      <div className="row between"><h2 style={{ margin: 0 }}>Subir para o nível {newLevel}</h2><button className="btn sm ghost" onClick={onClose}>Cancelar</button></div>
      <p className="muted">{newLevel}º nível · {newTier}º patamar. Seus limiares de dano sobem +1 automaticamente.</p>

      {hasAch && (
        <div className="panel" style={{ margin: '12px 0' }}>
          <h3>Conquistas do patamar</h3>
          <p className="small">Nova Experiência com +2 e Proficiência +1 (de {d.proficiency} para {d.proficiency + 1}).{CLEAR_MARK_LEVELS.includes(newLevel) ? ' Todas as marcações de atributos são removidas.' : ''}</p>
          <label className="field">Nova Experiência<input value={newExp} maxLength={40} onChange={e => setNewExp(e.target.value)} placeholder="Ex.: Mestre das cordas" /></label>
        </div>)}

      <h3>Avanços: escolha opções que somem 2 pontos <span className="chip">{cost}/2</span></h3>
      <div className="grid g2">
        {options.map(({ id, tier, opt, left, blocked }) => (
          <div key={id + tier} className="mini-card" style={{ opacity: blocked ? .5 : 1 }}>
            <div className="row between"><b>{opt.label}</b><span className="chip">{tier}º patamar · {left} vaga(s){opt.cost === 2 ? ' · vale 2' : ''}</span></div>
            <div className="small muted">{opt.desc}</div>
            <button className="btn sm" style={{ marginTop: 6 }} disabled={blocked} onClick={() => setPicks([...picks, { id, tier }])}>Escolher</button>
          </div>))}
      </div>

      {picks.length > 0 && <div className="stack" style={{ marginTop: 14 }}>
        <h4>Suas escolhas</h4>
        {picks.map((p, i) => (
          <div key={i} className="mini-card">
            <div className="row between"><b>{pickLabel(p)}</b><button className="btn sm danger" onClick={() => setPicks(picks.filter((_, j) => j !== i))}>Remover</button></div>
            {p.id === 'traits' && <div className="rollbar" style={{ marginTop: 6 }}>{TRAIT_KEYS.map(k => (
              <button key={k} disabled={!!marks[k]} className={'chip' + ((p.traits || []).includes(k) ? ' on' : '')} title={marks[k] ? 'Já marcado neste patamar' : ''}
                onClick={() => { const cur = p.traits || []; const nxt = cur.includes(k) ? cur.filter(x => x !== k) : cur.length < 2 ? [...cur, k] : [cur[1], k]; updatePick(i, { traits: nxt }); }}>{TRAIT_LABEL[k]}</button>))}
              <span className="small muted">Escolha 2 atributos desmarcados.</span></div>}
            {p.id === 'experience' && <div className="rollbar" style={{ marginTop: 6 }}>{expList.map(e => (
              <button key={e.id} className={'chip' + ((p.experiences || []).includes(e.id) ? ' on' : '')} onClick={() => { const cur = p.experiences || []; updatePick(i, { experiences: cur.includes(e.id) ? cur.filter(x => x !== e.id) : cur.length < 2 ? [...cur, e.id] : [cur[1], e.id] }); }}>{e.name}</button>))}
              <span className="small muted">Escolha 2 Experiências (+1 cada).</span></div>}
            {p.id === 'multiclass' && <div className="grid g3" style={{ marginTop: 6 }}>
              <label className="field">Classe<select value={p.classId || ''} onChange={e => updatePick(i, { classId: e.target.value, domain: '', subclassId: '' })}><option value="">Escolha…</option>{srd.classes.filter(c => c.name !== char.classId).map(c => <option key={c.id} value={c.name}>{CLASS_PT[c.name]}</option>)}</select></label>
              <label className="field">Domínio<select value={p.domain || ''} disabled={!p.classId} onChange={e => updatePick(i, { domain: e.target.value })}><option value="">Escolha…</option>{p.classId && idx.classes[p.classId].domains.map(x => <option key={x} value={x}>{DOMAIN_PT[x]}</option>)}</select></label>
              <label className="field">Subclasse (fundação)<select value={p.subclassId || ''} disabled={!p.classId} onChange={e => updatePick(i, { subclassId: e.target.value })}><option value="">Escolha…</option>{p.classId && idx.classes[p.classId].subclasses.map(x => <option key={x}>{x}</option>)}</select></label></div>}
          </div>))}
      </div>}

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Nova carta de domínio (nível {newLevel} ou menor)</h3>
        <label className="field">Carta<select value={card} onChange={e => setCard(e.target.value)}><option value="">Escolha…</option>{avail.map(c => <option key={c.id} value={c.name} disabled={extra.includes(c.name)}>Nv {c.level} · {DOMAIN_PT[c.domain]} · {c.name}</option>)}</select></label>
        {card && <div style={{ marginTop: 10 }}><DomainCard card={idx.cards[card]} /></div>}
        {Array.from({ length: extraNeeded }, (_, i) => (
          <label key={i} className="field" style={{ marginTop: 10 }}>Carta extra do avanço {i + 1}<select value={extra[i] || ''} onChange={e => { const n = [...extra]; n[i] = e.target.value; setExtra(n); }}><option value="">Escolha…</option>{avail.map(c => <option key={c.id} value={c.name} disabled={c.name === card || extra.some((x, j) => j !== i && x === c.name)}>Nv {c.level} · {DOMAIN_PT[c.domain]} · {c.name}</option>)}</select></label>))}
        <details className="fold" style={{ marginTop: 12 }}><summary>Trocar uma carta que você já tem (opcional)</summary>
          <div className="grid g2">
            <label className="field">Sai<select value={exOut} onChange={e => { setExOut(e.target.value); setExIn(''); }}><option value="">Nenhuma</option>{ownedCards.map(n => <option key={n}>{n}</option>)}</select></label>
            <label className="field">Entra (mesmo nível ou menor)<select value={exIn} disabled={!exOut} onChange={e => setExIn(e.target.value)}><option value="">Escolha…</option>{avail.filter(c => exOut && c.level <= idx.cards[exOut].level && c.name !== card && !extra.includes(c.name)).map(c => <option key={c.id} value={c.name}>Nv {c.level} · {c.name}</option>)}</select></label>
          </div></details>
      </div>

      {err && <div className="error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy || cost !== 2 || !card || (hasAch && newExp.trim().length < 2)} onClick={submit}>Confirmar nível {newLevel}</button>
        {cost !== 2 && <span className="muted small">Faltam {2 - cost} ponto(s) de avanço.</span>}
      </div>
    </section>
  );
}
