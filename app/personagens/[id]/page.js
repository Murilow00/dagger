'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client/api.js';
import { useRequireAuth, useSrd } from '@/components/Providers.jsx';
import { derive, readableOn, CLASS_PT, DOMAIN_PT, TRAIT_KEYS, TRAIT_LABEL, TRAIT_VERBS, RANGE_PT, MAX_LOADOUT, MAX_LEVEL, tierOf, nameOf } from '@/lib/rules.js';
import { Pips } from '@/components/Resources.jsx';
import { Features, DomainCard } from '@/components/Cards.jsx';
import { RollOptions, QuickDice, useRollOptions, useRoller, dualityPayload } from '@/components/RollKit.jsx';
import { RollItem } from '@/components/RollView.jsx';
import LevelUp from '@/components/LevelUp.jsx';
import Md from '@/components/Md.jsx';

const sgn = (n) => (n >= 0 ? '+' + n : '−' + Math.abs(n));
const CONDITIONS = ['Vulnerável', 'Imobilizado', 'Escondido', 'Oculto', 'Envenenado'];

export default function SheetPage({ params }) {
  const { id } = use(params);
  const { loading } = useRequireAuth();
  const { srd, idx } = useSrd();
  const [char, setChar] = useState(null);
  const [meta, setMeta] = useState({ readOnly: false, campaigns: [] });
  const [err, setErr] = useState('');
  const [levelOpen, setLevelOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [bonusExpr, setBonusExpr] = useState('');
  const { o, set, toggleExp, reset } = useRollOptions();

  const load = useCallback(() => api('/api/characters/' + id).then(d => { setChar(d.character); setMeta({ readOnly: d.readOnly, campaigns: d.campaigns }); }).catch(e => setErr(e.message)), [id]);
  useEffect(() => { if (!loading) load(); }, [loading, load]);

  const onResult = useCallback((data, phase) => {
    if (phase !== 'end') return;
    setHistory(h => [data.roll, ...h].slice(0, 12));
    if (data.state) setChar(c => c && { ...c, state: data.state });
    reset();
  }, []); // eslint-disable-line
  const { run, busy, error: rollErr } = useRoller({ characterId: id, onResult });

  const d = useMemo(() => (char && idx ? derive(char, idx) : null), [char, idx]);
  const patch = async (p) => {
    const prev = char;
    setChar(c => ({ ...c, ...(p.state ? { state: { ...c.state, ...p.state } } : {}) }));
    try { const r = await api('/api/characters/' + id, { method: 'PATCH', body: p }); setChar(r.character); setErr(''); }
    catch (e) { setErr(e.message); setChar(prev); }
  };

  if (loading || !idx) return null;
  if (err && !char) return <main className="wrap page"><div className="error">{err}</div><p><Link href="/personagens">Voltar</Link></p></main>;
  if (!char || !d) return null;

  const ro = meta.readOnly;
  const st = char.state;
  const { primary: c1, secondary: c2 } = d.colors;
  const cls = d.cls;
  const hopeUsable = st.hope;
  const duality = (extra, mod = 0) => run(dualityPayload({ ...o, modifier: o.modifier + mod }, extra));
  const rollTrait = (k) => duality({ trait: k, label: `Teste de ${TRAIT_LABEL[k]}` });
  const spend = (n) => patch({ state: { hope: Math.max(0, st.hope - n) } });

  const rest = async (kind) => {
    const heal = async (key, label) => {
      const r = await run({ type: 'dice', expression: `1d4+${d.tier}`, label });
      if (r) { const amount = r.roll.result.total; await patch({ state: { [key]: Math.max(0, st[key] - amount) } }); }
    };
    if (kind === 'wounds') return heal('hp', 'Tratar feridas');
    if (kind === 'stress') return heal('stress', 'Reduzir fadiga');
    if (kind === 'armor') return heal('armor', 'Reparar armadura');
    if (kind === 'allwounds') return patch({ state: { hp: 0 } });
    if (kind === 'allstress') return patch({ state: { stress: 0 } });
    if (kind === 'allarmor') return patch({ state: { armor: 0 } });
    if (kind === 'prepare') return patch({ state: { hope: Math.min(d.hopeMax, st.hope + 1) } });
  };

  const weaponRow = (w, slot) => w && (
    <div className="mini-card" key={slot} style={{ '--cc': c1 }}>
      <div className="row between"><b>{w.name}</b><span className="chip">{slot === 'primary' ? 'Primária' : 'Secundária'}</span></div>
      <div className="stat-line"><span><b>Atributo</b> {TRAIT_LABEL[w.trait]}</span><span><b>Alcance</b> {RANGE_PT[w.range] || w.range}</span><span><b>Dano</b> {w.damageText}</span><span>{w.burden === 'two' ? 'Duas mãos' : 'Uma mão'}</span></div>
      {w.features.map((f, i) => <div key={i} className="small"><b>{f.name}:</b> {f.text}</div>)}
      {!ro && <div className="row" style={{ marginTop: 8 }}>
        <button className="btn sm accent" disabled={busy} onClick={() => duality({ trait: w.trait, label: `Ataque · ${w.name}` }, w.attackBonus)}>Atacar ({sgn(d.traits[w.trait] + w.attackBonus + o.modifier)})</button>
        <button className="btn sm" disabled={busy} onClick={() => run({ type: 'damage', weapon: slot, bonusExpression: bonusExpr || undefined })}>Dano {w.damageText.split(' ')[0]}</button>
        <button className="btn sm" disabled={busy} onClick={() => run({ type: 'damage', weapon: slot, crit: true, bonusExpression: bonusExpr || undefined })}>Dano crítico</button>
      </div>}
    </div>);

  const moveCard = (name, to) => {
    const dc = char.domainCards;
    if (to === 'loadout' && dc.loadout.length >= MAX_LOADOUT) { setErr(`O loadout comporta no máximo ${MAX_LOADOUT} cartas. Mande uma para a reserva primeiro.`); return; }
    patch({ domainCards: {
      loadout: to === 'loadout' ? [...dc.loadout, name] : dc.loadout.filter(n => n !== name),
      vault: to === 'vault' ? [...dc.vault, name] : dc.vault.filter(n => n !== name),
    } });
  };

  const eligibleW = (slot) => srd.weapons.filter(w => w.slot === slot && w.tier <= d.tier);
  const weaponOptions = (slot) => [['Armas comuns', false], ['Armas mágicas', true]].map(([title, mg]) => <optgroup key={title} label={title}>{eligibleW(slot).filter(w => !!w.magic === mg).map(w => <option key={w.id}>{w.name}</option>)}</optgroup>);

  return (
    <main className="wrap page sheet" style={{ '--c1': c1, '--c2': c2, '--on1': readableOn(c1), '--on2': readableOn(c2) }}>
      <div className="sheet-bg" aria-hidden="true" />
      <div className="hero">
        <div className="l">
          <h1>{char.name}</h1>
          <div className="sub">{char.pronouns ? char.pronouns + ' · ' : ''}{CLASS_PT[char.classId]} · {nameOf(idx, 'subclasses', char.subclassId)}</div>
          <div className="row" style={{ marginTop: 10 }}><span className="big">Nível {d.level}</span><span className="sub">{d.tier}º patamar · Proficiência {d.proficiency}</span></div>
        </div>
        <div className="r">
          <div className="sub" style={{ fontSize: '.85rem', opacity: .85 }}>Antecedente</div>
          <div className="big" style={{ fontSize: '1.7rem' }}>{nameOf(idx, 'communities', char.community)}</div>
          <div className="sub">{char.ancestry.b ? `${nameOf(idx, 'ancestries', char.ancestry.a)} + ${nameOf(idx, 'ancestries', char.ancestry.b)} (mista)` : nameOf(idx, 'ancestries', char.ancestry.a)}</div>
        </div>
      </div>
      {err && <div className="error" role="alert" style={{ marginBottom: 12 }} onClick={() => setErr('')}>{err}</div>}
      {ro && <div className="ok" style={{ marginBottom: 12 }}>Você está vendo esta ficha em modo leitura (personagem de outro jogador na mesma campanha).</div>}
      {char.description && <p className="muted" style={{ maxWidth: '90ch' }}>{char.description}</p>}
      <div className="row" style={{ marginBottom: 14 }}>
        {!ro && d.level < MAX_LEVEL && <button className="btn primary" onClick={() => setLevelOpen(true)}>Subir para o nível {d.level + 1}</button>}
        {meta.campaigns.map(c => <Link key={c.id} href={'/campanhas/' + c.id} className="chip" title="As suas rolagens aparecem para esta mesa">Mesa: {c.name}</Link>)}
        {!ro && !meta.campaigns.length && <span className="muted small">Sem campanha: entre em uma pelo link do mestre para que a mesa veja suas rolagens.</span>}
      </div>
      {levelOpen && !ro && <LevelUp char={char} onClose={() => setLevelOpen(false)} onDone={(c) => { setChar(c); setLevelOpen(false); window.scrollTo(0, 0); }} />}

      <div className="sheet-grid">
        {/* Coluna 1: classe e combate */}
        <div className="stack">
          <section className="panel sec1">
            <h3>Saúde e recursos</h3>
            <div className="stack">
              <div><div className="row between"><b>Pontos de Vida (PV)</b><span className="muted small">{d.hpMax - st.hp}/{d.hpMax} restantes</span></div>
                <Pips label="PV marcados" value={st.hp} max={d.hpMax} color="#ff7b7b" disabled={ro} onChange={v => patch({ state: { hp: v } })} /></div>
              <div><div className="row between"><b>Fadiga (PF)</b><span className="muted small">{d.stressMax - st.stress}/{d.stressMax} livres</span></div>
                <Pips label="PF marcados" value={st.stress} max={d.stressMax} color="#ffb35c" disabled={ro} onChange={v => patch({ state: { stress: v } })} /></div>
              <div><div className="row between"><b>Esperança</b><span className="muted small">gasta para Experiências, ajuda e traços de Esperança</span></div>
                <Pips label="Esperança" value={st.hope} max={d.hopeMax} color="var(--hope)" shape="diamond" disabled={ro} onChange={v => patch({ state: { hope: v } })} /></div>
              <div><div className="row between"><b>Armadura</b><span className="muted small">{d.armorScore - st.armor} pontos disponíveis</span></div>
                <Pips label="Armadura marcada" value={st.armor} max={d.armorScore} color="#9fb4ff" shape="round" disabled={ro} onChange={v => patch({ state: { armor: v } })} /></div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
              <div className="stat-box"><div className="n">{d.evasion}</div><div className="l">Evasão</div></div>
              <div className="stat-box"><div className="n">{d.armorScore}</div><div className="l">Armadura</div></div>
            </div>
            <div className="stat-box" style={{ marginTop: 10 }}>
              <div className="thr"><span className="tiny muted">Dano menor<br />1 PV</span><span className="n">{d.thresholds.major}</span><span className="tiny muted">Maior<br />2 PV</span><span className="n">{d.thresholds.severe}</span><span className="tiny muted">Grave<br />3 PV</span></div>
              <div className="l" style={{ marginTop: 6 }}>Limiares de dano ({d.armor?.name} + nível {d.level})</div>
            </div>
            <div className="rollbar" style={{ marginTop: 10 }}>{CONDITIONS.map(cn => <button key={cn} disabled={ro} className={'chip' + (st.conditions.includes(cn) ? ' on' : '')} onClick={() => patch({ state: { conditions: st.conditions.includes(cn) ? st.conditions.filter(x => x !== cn) : [...st.conditions, cn] } })}>{cn}</button>)}</div>
          </section>

          <section className="panel sec1">
            <h3>Atributos</h3>
            <p className="small muted" style={{ marginTop: -6 }}>{ro ? 'Valores do personagem.' : 'Toque em um atributo para rolar o teste.'}</p>
            <div className="stack" style={{ gap: 8 }}>
              {TRAIT_KEYS.map(k => (
                <button key={k} className={'trait' + (d.traitMarks[k] ? ' marked' : '')} disabled={ro || busy} onClick={() => rollTrait(k)} title={d.traitMarks[k] ? 'Marcado neste patamar (já recebeu +1)' : ''}>
                  <b>{TRAIT_LABEL[k]}{d.traitMarks[k] ? ' ●' : ''}</b><span className="v">{sgn(d.traits[k])}</span>
                  <span className="muted tiny">{TRAIT_VERBS[k]}</span>
                </button>))}
            </div>
            {d.spellcast && !ro && <button className="btn accent" style={{ marginTop: 10, width: '100%' }} disabled={busy} onClick={() => duality({ trait: d.spellcast, label: 'Teste de conjuração' })}>Teste de conjuração ({TRAIT_LABEL[d.spellcast]} {sgn(d.traits[d.spellcast] + o.modifier)})</button>}
          </section>

          {!ro && <section className="panel sec1">
            <h3>Descanso</h3>
            <details className="fold"><summary>Descanso curto (o mestre ganha 1d4 de Medo)</summary>
              <div className="stack"><p className="small muted">Faça dois movimentos (ou o mesmo duas vezes).</p>
                <button className="btn sm" disabled={busy} onClick={() => rest('wounds')}>Tratar feridas: 1d4 + patamar PV</button>
                <button className="btn sm" disabled={busy} onClick={() => rest('stress')}>Reduzir fadiga: 1d4 + patamar PF</button>
                <button className="btn sm" disabled={busy} onClick={() => rest('armor')}>Reparar armadura: 1d4 + patamar PA</button></div></details>
            <details className="fold"><summary>Descanso longo (o mestre ganha Medo)</summary>
              <div className="stack"><p className="small muted">Faça dois movimentos (ou o mesmo duas vezes).</p>
                <button className="btn sm" onClick={() => rest('allwounds')}>Cuidar de todas as feridas</button>
                <button className="btn sm" onClick={() => rest('allstress')}>Zerar fadiga</button>
                <button className="btn sm" onClick={() => rest('allarmor')}>Reparar armadura por completo</button>
                <button className="btn sm" onClick={() => rest('prepare')}>Preparar-se: +1 Esperança</button></div></details>
          </section>}
        </div>

        {/* Coluna 2: armas, habilidades, cartas */}
        <div className="stack">
          <section className="panel sec1">
            <h3>Armas e armadura</h3>
            <div className="stack">{weaponRow(d.primary, 'primary')}{weaponRow(d.secondary, 'secondary')}
              <div className="mini-card" style={{ '--cc': c1 }}><b>{d.armor?.name}</b> <span className="muted small">Limiares base {d.armor?.major}/{d.armor?.severe} · Armadura base {d.armor?.score}</span>
                {d.armor?.features.map((f, i) => <div key={i} className="small"><b>{f.name}:</b> {f.text}</div>)}</div>
              {!ro && <label className="field row small" style={{ gap: 8 }}>Dano extra (opcional, ex.: 2d6):<input style={{ width: 110 }} value={bonusExpr} onChange={e => setBonusExpr(e.target.value)} placeholder="2d6" /></label>}
              {!ro && <details className="fold"><summary>Trocar equipamento</summary>
                <div className="stack">
                  <label className="field">Arma primária<select value={char.weapons.primary} onChange={e => { const w = idx.weapons[e.target.value]; patch({ weapons: { primary: w.name, secondary: w.burden === 'two' ? null : char.weapons.secondary }, armor: char.armor }); }}>{weaponOptions('primary')}</select></label>
                  <label className="field">Arma secundária<select disabled={d.primary?.burden === 'two'} value={char.weapons.secondary || ''} onChange={e => patch({ weapons: { primary: char.weapons.primary, secondary: e.target.value || null }, armor: char.armor })}><option value="">Nenhuma</option>{weaponOptions('secondary')}</select></label>
                  <label className="field">Armadura<select value={char.armor} onChange={e => patch({ weapons: char.weapons, armor: e.target.value })}>{srd.armor.filter(a => a.tier <= d.tier).map(a => <option key={a.id}>{a.name}</option>)}</select></label>
                </div></details>}
            </div>
          </section>

          <section className="panel sec1">
            <h3>Habilidades de classe e subclasse</h3>
            <Features list={d.features.filter(f => !['Ancestralidade', 'Comunidade'].includes(f.source))} />
          </section>

          <section className="panel sec1">
            <h3>Cartas de domínio</h3>
            <p className="small muted" style={{ marginTop: -6 }}>Loadout ({char.domainCards.loadout.length}/{MAX_LOADOUT}): cartas ativas. Reserva: cartas guardadas, sem efeito. Domínios: {d.domains.map(x => DOMAIN_PT[x]).join(', ')}.</p>
            <div className="stack">
              {char.domainCards.loadout.map(n => <DomainCard key={n} card={idx.cards[n]} actions={!ro && <div className="row" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => moveCard(n, 'vault')}>Enviar à reserva</button></div>} />)}
              {char.domainCards.vault.length > 0 && <h4>Reserva</h4>}
              {char.domainCards.vault.map(n => <DomainCard key={n} card={idx.cards[n]} compact actions={!ro && <div className="row" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => moveCard(n, 'loadout')}>Pôr no loadout</button></div>} />)}
            </div>
          </section>
        </div>

        {/* Coluna 3: rolagens e antecedente */}
        <div className="stack dock-col">
          {!ro && <section className="panel sec1 dock">
            <h3>Rolagem</h3>
            <RollOptions o={o} set={set} toggleExp={toggleExp} experiences={d.experiences} hope={hopeUsable} />
            {rollErr && <div className="error" role="alert" style={{ marginTop: 10 }}>{rollErr}</div>}
            <div style={{ marginTop: 12 }}><button className="btn primary" style={{ width: '100%' }} disabled={busy} onClick={() => duality({ label: 'Teste' })}>Rolar Dados de Dualidade</button></div>
            <details className="fold" style={{ marginTop: 12 }}><summary>Outros dados</summary><QuickDice run={run} busy={busy} label={char.name} /></details>
            {history.length > 0 && <div className="log" style={{ marginTop: 12, maxHeight: 360 }}>{history.map(r => <RollItem key={r.id} roll={r} showWho={false} />)}</div>}
          </section>}

          <section className="panel sec2">
            <h3>Experiências</h3>
            <div className="stack" style={{ gap: 8 }}>{d.experiences.map(e => (
              <div key={e.id} className={'exp' + (o.experiences.includes(e.id) ? ' on' : '')}><b className="grow">{e.name}</b><span className="chip">{sgn(e.bonus)}</span></div>))}</div>
          </section>

          <section className="panel sec2">
            <h3>Herança</h3>
            <Features list={d.features.filter(f => ['Ancestralidade', 'Comunidade'].includes(f.source))} />
          </section>

          <section className="panel sec2">
            <h3>Origem e vínculos</h3>
            {char.background.map((b, i) => <div key={i} className="feat"><b>{b.q}</b><div className="muted">{b.a || '—'}</div></div>)}
            {char.connections.map((b, i) => <div key={'c' + i} className="feat"><b>{b.q}</b><div className="muted">{b.a || '—'}</div></div>)}
            {!ro && <Edit char={char} patch={patch} />}
          </section>

          <section className="panel sec2">
            <h3>Inventário</h3>
            <Inventory char={char} patch={patch} ro={ro} />
          </section>

          <section className="panel sec2">
            <h3>Anotações</h3>
            <Notes value={st.notes} ro={ro} onSave={(v) => patch({ state: { notes: v } })} />
          </section>

          {!ro && <section className="panel">
            <h3>Cor do antecedente</h3>
            <div className="row"><input type="color" value={c2} onChange={e => patch({ theme: { accent: e.target.value } })} style={{ width: 60, padding: 2 }} aria-label="Cor do antecedente" />
              <button className="btn sm ghost" onClick={() => patch({ theme: { accent: null } })}>Usar a cor da comunidade</button></div>
            <hr style={{ borderColor: 'var(--line)', margin: '14px 0' }} />
            <button className="btn danger sm" onClick={async () => { if (confirm(`Excluir ${char.name} para sempre?`)) { await api('/api/characters/' + id, { method: 'DELETE' }); window.location.href = '/personagens'; } }}>Excluir personagem</button>
          </section>}
        </div>
      </div>
    </main>
  );
}

function Notes({ value, ro, onSave }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return ro ? <Md text={value || '—'} /> : <textarea value={v} onChange={e => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} placeholder="Notas da sessão, nomes, pistas…" style={{ minHeight: 120 }} />;
}

function Edit({ char, patch }) {
  const [open, setOpen] = useState(false);
  const [bg, setBg] = useState(char.background); const [cn, setCn] = useState(char.connections);
  const [f, setF] = useState({ name: char.name, pronouns: char.pronouns, description: char.description });
  return (
    <details className="fold" open={open} onToggle={e => setOpen(e.target.open)}><summary>Editar nome, descrição e respostas</summary>
      <div className="stack">
        <label className="field">Nome<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="field">Pronomes<input value={f.pronouns} onChange={e => setF({ ...f, pronouns: e.target.value })} /></label>
        <label className="field">Descrição<textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
        {bg.map((b, i) => <label key={i} className="field">{b.q}<textarea value={b.a} onChange={e => setBg(bg.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} /></label>)}
        {cn.map((b, i) => <label key={i} className="field">{b.q}<textarea value={b.a} onChange={e => setCn(cn.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} /></label>)}
        <button className="btn primary" onClick={() => { patch({ ...f, background: bg, connections: cn }); setOpen(false); }}>Salvar</button>
      </div></details>
  );
}

function Inventory({ char, patch, ro }) {
  const [name, setName] = useState('');
  const set = (inv) => patch({ inventory: inv });
  const g = char.gold;
  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[['handfuls', 'Punhados'], ['bags', 'Bolsas'], ['chests', 'Baús']].map(([k, l]) => (
          <div key={k} className="stat-box"><div className="row" style={{ justifyContent: 'center', gap: 6 }}>
            {!ro && <button className="btn sm" aria-label={`menos ${l}`} onClick={() => patch({ gold: { ...g, [k]: Math.max(0, g[k] - 1) } })}>−</button>}
            <span className="n">{g[k]}</span>
            {!ro && <button className="btn sm" aria-label={`mais ${l}`} onClick={() => patch({ gold: { ...g, [k]: Math.min(k === 'chests' ? 999 : 9, g[k] + 1) } })}>+</button>}</div><div className="l">Ouro: {l}</div></div>))}
      </div>
      {char.inventory.map((it, i) => (
        <div key={i} className="row between"><span>{it.name}{it.qty > 1 ? ` ×${it.qty}` : ''}</span>
          {!ro && <span className="row" style={{ gap: 4 }}><button className="btn sm" aria-label="menos" onClick={() => set(char.inventory.map((x, j) => j === i ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0))}>−</button><button className="btn sm" aria-label="mais" onClick={() => set(char.inventory.map((x, j) => j === i ? { ...x, qty: x.qty + 1 } : x))}>+</button><button className="btn sm danger" aria-label={'remover ' + it.name} onClick={() => set(char.inventory.filter((_, j) => j !== i))}>×</button></span>}</div>))}
      {!ro && <form className="row" onSubmit={e => { e.preventDefault(); if (name.trim()) { set([...char.inventory, { name: name.trim(), qty: 1 }]); setName(''); } }}><input placeholder="Adicionar item" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} /><button className="btn">Adicionar</button></form>}
    </div>
  );
}
