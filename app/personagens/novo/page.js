'use client';
import { useMemo, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useRequireAuth, useSrd } from '@/components/Providers.jsx';
import { DomainCard, Features } from '@/components/Cards.jsx';
import Md from '@/components/Md.jsx';
import { CLASS_PT, DOMAIN_PT, CLASS_COLORS, COMMUNITY_COLORS, TRAIT_KEYS, TRAIT_LABEL, TRAIT_VERBS, TRAIT_VALUES, RANGE_PT, ancestryFeatures, buildNewCharacter } from '@/lib/rules.js';

const STEPS = ['Classe', 'Herança', 'Atributos', 'Equipamento', 'Experiências e cartas', 'Origem e nome'];
const fmt = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');

// Lista de armas dividida em comuns e mágicas, com um cabeçalho para cada grupo.
function WeaponRows({ list, name, picked, onPick }) {
  return [['Armas comuns', false], ['Armas mágicas', true]].map(([title, mg]) => {
    const rows = list.filter(w => !!w.magic === mg);
    if (!rows.length) return null;
    return [<tr key={'h' + title}><th colSpan={2} style={{ textAlign: 'left', color: mg ? 'var(--fear)' : 'var(--hope)' }}>{title}</th></tr>,
      ...rows.map(w => (
        <tr key={w.id}><td><input type="radio" name={name} checked={picked === w.name} onChange={() => onPick(w)} aria-label={w.name} /></td>
          <td><b>{w.name}</b><div className="muted tiny">{TRAIT_LABEL[w.trait]} · {RANGE_PT[w.range]} · {w.damageRaw.replace('phy', 'fís').replace('mag', 'mág')} · {w.burden === 'two' ? '2 mãos' : '1 mão'}</div>{w.features.map((f, i) => <div key={i} className="tiny"><b>{f.name}:</b> {f.text}</div>)}</td></tr>))];
  });
}

export default function Wizard() {
  const { loading } = useRequireAuth();
  const { srd, idx } = useSrd();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [d, setD] = useState({
    classId: '', subclassId: '', ancestry: { a: '', b: null }, mixed: false, community: '',
    traits: Object.fromEntries(TRAIT_KEYS.map(k => [k, null])),
    weapons: { primary: '', secondary: null }, armor: '', startingChoices: { potion: 'health', classItem: '' },
    experiences: [{ name: '', extra: 0 }, { name: '', extra: 0 }], domainCards: [], background: [], connections: [],
    name: '', pronouns: '', description: '', theme: { accent: null },
  });
  const set = (patch) => setD(prev => ({ ...prev, ...patch }));
  const cls = idx?.classes[d.classId];
  if (loading || !srd) return null;

  const pick = (id) => {
    const c = idx.classes[id];
    set({ classId: id, subclassId: '', domainCards: [], startingChoices: { potion: d.startingChoices.potion, classItem: c.classItems[0] }, background: c.backgroundQuestions.map(q => ({ q, a: '' })), connections: c.connections.map(q => ({ q, a: '' })) });
  };

  const used = Object.values(d.traits).filter(v => v !== null);
  const remaining = [...TRAIT_VALUES]; used.forEach(v => { const i = remaining.indexOf(v); if (i >= 0) remaining.splice(i, 1); });
  const traitsOk = used.length === 6 && remaining.length === 0;
  const prim = idx.weapons[d.weapons.primary];
  const hasExtra = d.classId && d.ancestry.a && ancestryFeatures({ ancestry: { a: d.ancestry.a, b: d.mixed ? d.ancestry.b : null } }, idx).some(f => (f.id || f.name) === 'Purposeful Design');

  const checks = [
    () => !!d.subclassId || 'Escolha uma classe e uma subclasse.',
    () => !!(d.ancestry.a && (!d.mixed || d.ancestry.b) && d.community) || 'Escolha ancestralidade (ou duas, se for mista) e comunidade.',
    () => traitsOk || 'Distribua os seis valores (+2, +1, +1, 0, 0, −1) entre os atributos, sem repetir além do permitido.',
    () => !!(d.weapons.primary && d.armor && prim && (prim.burden === 'two' || d.weapons.secondary)) || 'Escolha armadura e arma(s): uma de duas mãos, ou uma primária de uma mão com uma secundária.',
    () => !!(d.experiences.every(e => e.name.trim().length >= 2) && d.domainCards.length === 2) || 'Crie duas Experiências e escolha duas cartas de domínio.',
    () => d.name.trim().length >= 1 || 'Dê um nome ao personagem.',
  ];
  const next = () => { const r = checks[step](); if (r !== true) { setErr(r); return; } setErr(''); setStep(step + 1); window.scrollTo(0, 0); };

  const create = async () => {
    setErr(''); setBusy(true);
    try {
      const body = { ...d, ancestry: { a: d.ancestry.a, b: d.mixed ? d.ancestry.b : null } };
      buildNewCharacter(body, idx); // mesma validação do servidor, para mostrar o erro antes
      const r = await api('/api/characters', { method: 'POST', body });
      window.location.href = `/personagens/${r.character.id}`;
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const weapons = srd.weapons.filter(w => w.tier === 1);
  const cardsPool = cls ? srd.cards.filter(c => c.level === 1 && cls.domains.includes(c.domain)) : [];

  return (
    <main className="wrap page" style={{ maxWidth: 980 }}>
      <h1>Novo personagem</h1>
      <div className="wiz-steps">{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>{i + 1}. {s}</span>)}</div>

      {step === 0 && (
        <div className="stack">
          <div className="grid g3">
            {srd.classes.map(c => (
              <button key={c.id} className={'choice' + (d.classId === c.id ? ' on' : '')} style={{ '--cc': CLASS_COLORS[c.id] }} onClick={() => pick(c.id)}>
                <div className="tt">{CLASS_PT[c.id]}</div>
                <div className="muted small">{c.domains.map(x => DOMAIN_PT[x]).join(' & ')} · Evasão {c.evasion} · PV {c.hp}</div>
              </button>))}
          </div>
          {cls && (
            <div className="panel" style={{ borderTop: `3px solid ${CLASS_COLORS[cls.id]}` }}>
              <h3>{CLASS_PT[cls.id]}</h3><p>{cls.description}</p>
              <Features list={[...(cls.hopeFeature ? [{ ...cls.hopeFeature, source: 'Esperança (3 PE)' }] : []), ...cls.classFeatures.map(f => ({ ...f, source: 'Classe' }))]} />
              <h4>Subclasse</h4>
              <div className="grid g2">{cls.subclasses.map(s => { const sc = idx.subclasses[s]; return (
                <button key={s} className={'choice' + (d.subclassId === s ? ' on' : '')} style={{ '--cc': CLASS_COLORS[cls.id] }} onClick={() => set({ subclassId: s })}>
                  <div className="tt">{s}</div><div className="muted small">{sc.tagline}{sc.spellcast ? ` · Conjuração: ${TRAIT_LABEL[sc.spellcast]}` : ''}</div>
                  <div className="small" style={{ marginTop: 6 }}><Features list={sc.foundation} /></div>
                </button>); })}</div>
            </div>)}
        </div>)}

      {step === 1 && (
        <div className="stack">
          <h3>Ancestralidade</h3>
          <label className="row"><input type="checkbox" checked={d.mixed} onChange={e => set({ mixed: e.target.checked, ancestry: { ...d.ancestry, b: null } })} /> Ancestralidade mista (primeira característica de uma, segunda de outra)</label>
          <div className="grid g3">
            {srd.ancestries.map(a => {
              const sel = d.ancestry.a === a.id || (d.mixed && d.ancestry.b === a.id);
              return (
                <div key={a.id} className={'choice' + (sel ? ' on' : '')} style={{ cursor: 'default' }}>
                  <div className="tt">{a.name}</div>
                  <Features list={a.features} />
                  <div className="row" style={{ gap: 6 }}>
                    <button className={'btn sm' + (d.ancestry.a === a.id ? ' primary' : '')} onClick={() => set({ ancestry: { ...d.ancestry, a: a.id } })}>{d.mixed ? 'Usar a 1ª' : 'Escolher'}</button>
                    {d.mixed && <button className={'btn sm' + (d.ancestry.b === a.id ? ' primary' : '')} onClick={() => set({ ancestry: { ...d.ancestry, b: a.id } })}>Usar a 2ª</button>}
                  </div>
                </div>);
            })}
          </div>
          <h3>Comunidade</h3>
          <div className="grid g3">
            {srd.communities.map(c => (
              <button key={c.id} className={'choice' + (d.community === c.id ? ' on' : '')} style={{ '--cc': COMMUNITY_COLORS[c.id] }} onClick={() => set({ community: c.id })}>
                <div className="tt">{c.name}</div><div className="muted small">{c.adjectives}</div><Features list={c.features} />
              </button>))}
          </div>
        </div>)}

      {step === 2 && (
        <div className="stack">
          <p>Distribua os modificadores <b>+2, +1, +1, 0, 0 e −1</b> entre os seis atributos, em qualquer ordem.</p>
          <div className="row"><span className="muted">Faltam:</span>{remaining.length ? remaining.map((v, i) => <span key={i} className="chip">{fmt(v)}</span>) : <span className="chip on">tudo distribuído</span>}
            {cls && <button className="btn sm" onClick={() => set({ traits: { ...cls.suggested.traits } })}>Usar os sugeridos da classe</button>}
            <button className="btn sm ghost" onClick={() => set({ traits: Object.fromEntries(TRAIT_KEYS.map(k => [k, null])) })}>Limpar</button></div>
          <div className="grid g2">
            {TRAIT_KEYS.map(k => (
              <div key={k} className="panel row between">
                <div><b>{TRAIT_LABEL[k]}</b><div className="muted small">{TRAIT_VERBS[k]}</div></div>
                <select style={{ width: 90 }} value={d.traits[k] ?? ''} onChange={e => set({ traits: { ...d.traits, [k]: e.target.value === '' ? null : parseInt(e.target.value, 10) } })} aria-label={TRAIT_LABEL[k]}>
                  <option value="">—</option>
                  {[...new Set(TRAIT_VALUES)].sort((a, b) => b - a).map(v => <option key={v} value={v} disabled={d.traits[k] !== v && !remaining.includes(v)}>{fmt(v)}</option>)}
                </select>
              </div>))}
          </div>
        </div>)}

      {step === 3 && (
        <div className="stack">
          <p>Escolha <b>uma arma primária de duas mãos</b>, ou <b>uma primária de uma mão e uma secundária</b>. Todas de 1º patamar.</p>
          {cls && <p className="muted small">Sugestão da classe: {cls.suggested.primary}{cls.suggested.secondary ? ` + ${cls.suggested.secondary}` : ''}, {cls.suggested.armor}. <button className="btn sm" onClick={() => { const p = idx.weapons[cls.suggested.primary]; set({ weapons: { primary: p.name, secondary: p.burden === 'two' ? null : (cls.suggested.secondary || d.weapons.secondary) }, armor: cls.suggested.armor }); }}>Usar sugestão</button></p>}
          <div className="grid g2">
            <div className="panel"><h3>Arma primária</h3>
              <table className="t"><tbody><WeaponRows list={weapons.filter(w => w.slot === 'primary')} name="p" picked={d.weapons.primary} onPick={w => set({ weapons: { primary: w.name, secondary: w.burden === 'two' ? null : d.weapons.secondary } })} /></tbody></table></div>
            <div className="stack">
              <div className="panel"><h3>Arma secundária</h3>
                {prim?.burden === 'two' ? <p className="muted">Não se aplica: a arma primária usa as duas mãos.</p> :
                  <table className="t"><tbody><WeaponRows list={weapons.filter(w => w.slot === 'secondary')} name="s" picked={d.weapons.secondary} onPick={w => set({ weapons: { ...d.weapons, secondary: w.name } })} /></tbody></table>}</div>
              <div className="panel"><h3>Armadura</h3>
                <table className="t"><tbody>{srd.armor.filter(a => a.tier === 1).map(a => (
                  <tr key={a.id}><td><input type="radio" name="a" checked={d.armor === a.name} onChange={() => set({ armor: a.name })} aria-label={a.name} /></td>
                    <td><b>{a.name}</b><div className="muted tiny">Limiares {a.major}/{a.severe} · Armadura {a.score}</div>{a.features.map((f, i) => <div key={i} className="tiny">{f.name}: {f.text}</div>)}</td></tr>))}</tbody></table></div>
              <div className="panel"><h3>Inventário inicial</h3>
                <p className="small muted">Tocha, 15 m de corda, suprimentos básicos e um punhado de ouro, mais:</p>
                <div className="row"><label className="row"><input type="radio" checked={d.startingChoices.potion === 'health'} onChange={() => set({ startingChoices: { ...d.startingChoices, potion: 'health' } })} /> Poção de Vida Menor</label>
                  <label className="row"><input type="radio" checked={d.startingChoices.potion === 'stamina'} onChange={() => set({ startingChoices: { ...d.startingChoices, potion: 'stamina' } })} /> Poção de Vigor Menor</label></div>
                {cls && <label className="field" style={{ marginTop: 8 }}>Item de classe<select value={d.startingChoices.classItem} onChange={e => set({ startingChoices: { ...d.startingChoices, classItem: e.target.value } })}>{cls.classItems.map(i => <option key={i}>{i}</option>)}</select></label>}</div>
            </div>
          </div>
        </div>)}

      {step === 4 && (
        <div className="stack">
          <div className="panel"><h3>Duas Experiências (+2 cada)</h3>
            <p className="small muted">Uma Experiência é uma frase curta sobre o que seu personagem sabe ou viveu (ex.: “Curandeiro de campo”, “Nunca mais”). Não pode ser ampla demais (“Sortudo”) nem dar poderes (“Voo”). Ao gastar 1 Esperança, ela soma ao teste.</p>
            <div className="grid g2">{d.experiences.map((e, i) => (
              <div key={i} className="row"><input aria-label={`Experiência ${i + 1}`} placeholder={`Experiência ${i + 1}`} maxLength={40} value={e.name} onChange={ev => set({ experiences: d.experiences.map((x, j) => j === i ? { ...x, name: ev.target.value } : x) })} style={{ flex: 1 }} />
                {hasExtra && <label className="row small"><input type="checkbox" checked={!!e.extra} onChange={ev => set({ experiences: d.experiences.map((x, j) => ({ ...x, extra: j === i && ev.target.checked ? 1 : 0 })) })} /> +1 (Projeto Intencional)</label>}</div>))}</div></div>
          <div className="panel"><h3>Duas cartas de domínio de 1º nível</h3>
            <p className="small muted">Domínios da sua classe: {cls?.domains.map(x => DOMAIN_PT[x]).join(' e ')}. Pode ser uma de cada ou duas do mesmo. Selecionadas: {d.domainCards.length}/2.</p>
            <div className="grid g3">{cardsPool.map(c => (
              <DomainCard key={c.id} card={c} selected={d.domainCards.includes(c.name)} onClick={() => {
                const has = d.domainCards.includes(c.name);
                set({ domainCards: has ? d.domainCards.filter(n => n !== c.name) : d.domainCards.length < 2 ? [...d.domainCards, c.name] : [d.domainCards[1], c.name] });
              }} />))}</div></div>
        </div>)}

      {step === 5 && (
        <div className="stack">
          <div className="grid g2">
            <label className="field">Nome do personagem<input value={d.name} onChange={e => set({ name: e.target.value })} maxLength={60} /></label>
            <label className="field">Pronomes<input value={d.pronouns} onChange={e => set({ pronouns: e.target.value })} maxLength={30} placeholder="ela/dela, ele/dele…" /></label>
          </div>
          <label className="field">Descrição (aparência, postura)<textarea value={d.description} onChange={e => set({ description: e.target.value })} maxLength={600} /></label>
          <label className="field" style={{ maxWidth: 320 }}>Cor do antecedente (opcional)
            <div className="row"><input type="color" value={d.theme.accent || COMMUNITY_COLORS[d.community] || '#d38b3f'} onChange={e => set({ theme: { accent: e.target.value } })} style={{ width: 60, padding: 2 }} /><span className="muted small">Padrão: cor da comunidade {d.community}</span>{d.theme.accent && <button className="btn sm ghost" onClick={() => set({ theme: { accent: null } })}>Restaurar</button>}</div></label>
          <div className="panel"><h3>Perguntas de origem</h3><p className="small muted">Responda as que quiser (não têm efeito mecânico, mas ajudam o mestre).</p>
            {d.background.map((b, i) => <label key={i} className="field" style={{ marginTop: 10 }}>{b.q}<textarea value={b.a} onChange={e => set({ background: d.background.map((x, j) => j === i ? { ...x, a: e.target.value } : x) })} /></label>)}</div>
          <div className="panel"><h3>Vínculos</h3><p className="small muted">Perguntas para fazer aos outros jogadores; você pode responder agora ou na mesa.</p>
            {d.connections.map((b, i) => <label key={i} className="field" style={{ marginTop: 10 }}>{b.q}<textarea value={b.a} onChange={e => set({ connections: d.connections.map((x, j) => j === i ? { ...x, a: e.target.value } : x) })} /></label>)}</div>
        </div>)}

      {err && <div className="error" role="alert" style={{ marginTop: 14 }}>{err}</div>}
      <div className="row between" style={{ marginTop: 18 }}>
        <button className="btn" disabled={step === 0} onClick={() => { setStep(step - 1); setErr(''); }}>Voltar</button>
        {step < STEPS.length - 1 ? <button className="btn primary" onClick={next}>Próximo</button> : <button className="btn primary" disabled={busy} onClick={create}>Criar personagem</button>}
      </div>
    </main>
  );
}
