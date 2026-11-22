'use client';
import { TRAIT_LABEL } from '@/lib/rules.js';

export const OUT = {
  crit: { label: 'Sucesso crítico!', cls: 'crit' }, success_hope: { label: 'Sucesso com Esperança', cls: 'hope' }, success_fear: { label: 'Sucesso com Medo', cls: 'fear' },
  fail_hope: { label: 'Falha com Esperança', cls: 'hope' }, fail_fear: { label: 'Falha com Medo', cls: 'fear' }, hope: { label: 'Com Esperança', cls: 'hope' }, fear: { label: 'Com Medo', cls: 'fear' },
};
const sgn = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export function headline(roll) {
  const r = roll.result;
  if (roll.type === 'duality') return { big: r.total, what: OUT[r.outcome].label, cls: OUT[r.outcome].cls + (r.success === false ? ' fail' : ''), sub: r.difficulty != null ? `Dificuldade ${r.difficulty}` : (r.kind === 'reaction' ? 'Teste de reação' : '') };
  if (roll.type === 'rest') return { big: `+${r.gain}`, what: 'Medo para o mestre', cls: 'fear', sub: roll.label };
  return { big: r.total, what: roll.type === 'damage' ? (r.crit ? 'Dano crítico' : 'Dano') : 'Resultado', cls: '', sub: '' };
}

export function Dice({ roll }) {
  const r = roll.result;
  if (roll.type === 'duality') {
    return (
      <div className="rollbar" aria-label="dados">
        <span className="dieface hope" title="Dado de Esperança">{r.hope}</span>
        <span className="dieface fear" title="Dado de Medo">{r.fear}</span>
        {r.extra && r.extra.rolls.map((v, i) => <span key={i} className={'dieface ' + (r.extra.sign > 0 ? 'good' : 'bad')} title={r.extra.sign > 0 ? 'Vantagem' : 'Desvantagem'}>{r.extra.sign > 0 ? '+' : '−'}{v}</span>)}
        {r.help && <span className="dieface good" title="Prestar ajuda (maior resultado)">+{Math.max(...r.help.rolls)}</span>}
        {r.traitBonus !== 0 && <span className="dieface" title={r.traitLabel || 'Modificador'}>{sgn(r.traitBonus)}</span>}
        {r.experiences.map((e, i) => <span key={i} className="dieface" title={'Experiência: ' + e.name}>{sgn(e.bonus)}</span>)}
        {r.modifier !== 0 && <span className="dieface">{sgn(r.modifier)}</span>}
      </div>
    );
  }
  if (roll.type === 'damage') {
    return (
      <div className="rollbar">
        {r.rolls.map((v, i) => <span key={i} className={'dieface' + (r.kept[i] ? '' : ' drop')}>{v}</span>)}
        {r.mod !== 0 && <span className="dieface">{sgn(r.mod)}</span>}
        {r.critBonus > 0 && <span className="dieface good" title="Bônus de crítico">+{r.critBonus}</span>}
        {r.bonus && <span className="dieface good" title={r.bonus.expression}>+{r.bonus.total}</span>}
      </div>
    );
  }
  if (roll.type === 'rest') return <div className="rollbar"><span className="dieface fear">d4: {r.die}</span>{r.kind === 'long' && <span className="dieface">+{r.chars} PJs</span>}</div>;
  return (
    <div className="rollbar">
      {r.parts.map((p, i) => p.type === 'flat' ? <span key={i} className="dieface">{sgn(p.value)}</span>
        : p.rolls.map((v, j) => <span key={i + '-' + j} className={'dieface' + (p.kept[j] ? '' : ' drop')} title={'d' + p.faces}>{v}</span>))}
    </div>
  );
}

export function RollItem({ roll, showWho = true }) {
  const h = headline(roll);
  const e = roll.effects || {};
  const time = new Date(roll.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="roll-item" style={{ '--rc': roll.colors?.primary || (roll.hidden ? 'var(--fear)' : 'var(--line)') }}>
      <div className="row between" style={{ gap: 8 }}>
        <div>
          {showWho && <b>{roll.characterName || roll.userName}</b>}{showWho && roll.characterName && <span className="muted small"> · {roll.userName}</span>}
          <div className="muted small">{roll.label}{roll.hidden ? ' · oculta (só o mestre vê)' : ''} · {time}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="total">{h.big}</div>
          <div className={'out ' + h.cls + ' small'}>{h.what}</div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}><Dice roll={roll} /></div>
      {roll.type === 'duality' && (e.hopeGained || e.fearGained || e.stressCleared || e.hopeSpent) ? (
        <div className="tiny muted" style={{ marginTop: 6 }}>
          {e.hopeSpent ? `Gastou ${e.hopeSpent} Esperança. ` : ''}{e.hopeGained ? 'Ganhou 1 Esperança. ' : ''}{e.stressCleared ? 'Limpou 1 Fadiga. ' : ''}{e.fearGained ? 'O mestre ganhou 1 Medo.' : ''}
        </div>
      ) : null}
      {h.sub && roll.type === 'duality' && <div className="tiny muted">{h.sub}</div>}
    </div>
  );
}
