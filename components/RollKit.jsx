'use client';
import { useCallback, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useDice } from './Providers.jsx';

export function useRollOptions() {
  const [o, setO] = useState({ kind: 'action', advantage: null, helpAllies: 0, modifier: 0, difficulty: '', experiences: [], traitBonus: 0 });
  const set = (patch) => setO(prev => ({ ...prev, ...patch }));
  const toggleExp = (id) => setO(prev => ({ ...prev, experiences: prev.experiences.includes(id) ? prev.experiences.filter(x => x !== id) : [...prev.experiences, id] }));
  const reset = () => setO(prev => ({ ...prev, advantage: null, helpAllies: 0, modifier: 0, experiences: [] }));
  return { o, set, toggleExp, reset };
}

// Envia a rolagem ao servidor (que rola os dados), anima por cima da tela e entrega o resultado.
export function useRoller({ characterId, campaignId, onResult } = {}) {
  const { play } = useDice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (payload) => {
    if (busy) return null;
    setBusy(true); setError('');
    try {
      const data = await api('/api/rolls', { method: 'POST', body: { characterId, campaignId, ...payload } });
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('dh:sync'));   // a mesa consulta as novidades já
      onResult?.(data, 'start');
      await play(data.roll);
      onResult?.(data, 'end');
      return data;
    } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  }, [busy, characterId, campaignId, onResult, play]);
  return { run, busy, error, setError };
}

export function dualityPayload(o, extra = {}) {
  return { type: 'duality', kind: o.kind, advantage: o.advantage, helpAllies: o.helpAllies, modifier: o.modifier, difficulty: o.difficulty, experiences: o.experiences, traitBonus: o.traitBonus, ...extra };
}

export function RollOptions({ o, set, toggleExp, experiences, hope, showManualBonus }) {
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        <div className="rollbar" role="group" aria-label="Tipo de teste">
          {[['action', 'Teste'], ['reaction', 'Reação']].map(([v, l]) => <button key={v} className={'chip' + (o.kind === v ? ' on' : '')} onClick={() => set({ kind: v })} title={v === 'reaction' ? 'Não gera Esperança nem Medo' : ''}>{l}</button>)}
        </div>
        <div className="rollbar" role="group" aria-label="Vantagem">
          {[[null, 'Normal'], ['adv', 'Vantagem'], ['dis', 'Desvantagem']].map(([v, l]) => <button key={String(v)} className={'chip' + (o.advantage === v ? ' on' : '')} onClick={() => set({ advantage: v })}>{l}</button>)}
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <label className="field grow">Dificuldade<input type="number" min="0" max="60" inputMode="numeric" placeholder="—" value={o.difficulty} onChange={e => set({ difficulty: e.target.value })} /></label>
        <label className="field grow">Modificador<input type="number" min="-30" max="30" inputMode="numeric" value={o.modifier} onChange={e => set({ modifier: parseInt(e.target.value, 10) || 0 })} /></label>
        <label className="field grow" title="Cada aliado que presta ajuda rola 1d6; só o maior é somado">Ajuda de aliados<input type="number" min="0" max="5" inputMode="numeric" value={o.helpAllies} onChange={e => set({ helpAllies: Math.max(0, Math.min(5, parseInt(e.target.value, 10) || 0)) })} /></label>
        {showManualBonus && <label className="field grow">Bônus do atributo<input type="number" min="-10" max="10" inputMode="numeric" value={o.traitBonus} onChange={e => set({ traitBonus: parseInt(e.target.value, 10) || 0 })} /></label>}
      </div>
      {experiences && experiences.length > 0 && (
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>Usar Experiência (gasta 1 Esperança cada{hope != null ? ` · você tem ${hope}` : ''})</div>
          <div className="rollbar">{experiences.map(e => <button key={e.id} className={'chip' + (o.experiences.includes(e.id) ? ' on' : '')} onClick={() => toggleExp(e.id)}>{e.name} {e.bonus >= 0 ? '+' : '−'}{Math.abs(e.bonus)}</button>)}</div>
        </div>
      )}
    </div>
  );
}

export function QuickDice({ run, busy, campaignId, label = 'Rolagem livre' }) {
  const [expr, setExpr] = useState('1d20');
  return (
    <div className="stack">
      <div className="rollbar">{['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(d => <button key={d} className="btn sm" disabled={busy} onClick={() => run({ type: 'dice', expression: '1' + d, label: label + ' · ' + d })}>{d}</button>)}</div>
      <form className="row" onSubmit={e => { e.preventDefault(); run({ type: 'dice', expression: expr, label: `${label} · ${expr}` }); }}>
        <input aria-label="Expressão de dados" value={expr} onChange={e => setExpr(e.target.value)} placeholder="2d6+3, 4d6kh3…" style={{ flex: 1, minWidth: 120 }} />
        <button className="btn primary" disabled={busy}>Rolar</button>
      </form>
    </div>
  );
}
