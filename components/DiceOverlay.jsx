'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { headline } from './RollView.jsx';

const SHAPES = {
  4: <polygon points="50,6 95,88 5,88" />,
  6: <rect x="10" y="10" width="80" height="80" rx="16" />,
  8: <polygon points="50,3 93,50 50,97 7,50" />,
  10: <polygon points="50,3 95,40 80,95 20,95 5,40" />,
  12: <polygon points="50,3 96,37 78,93 22,93 4,37" />,
  20: <polygon points="50,3 92,26 92,74 50,97 8,74 8,26" />,
};
const KIND = {
  hope: { a: '#ffe08a', b: '#d99a14', ink: '#2b1d02', glow: '#f4c95d' },
  fear: { a: '#b99bff', b: '#5b34c9', ink: '#fff', glow: '#a77bff' },
  adv: { a: '#8ff0bd', b: '#1d9a62', ink: '#042a18', glow: '#5fd49a' },
  help: { a: '#8ff0bd', b: '#1d9a62', ink: '#042a18', glow: '#5fd49a' },
  dis: { a: '#ff9d9d', b: '#c33232', ink: '#fff', glow: '#ff7b7b' },
  dmg: { a: '#f2f4ff', b: '#8c95c4', ink: '#151a38', glow: '#c9d0ff' },
  gen: { a: '#9fc2ff', b: '#3a62c9', ink: '#fff', glow: '#7fa7ff' },
};

export function diceFor(roll) {
  const r = roll.result; const list = [];
  if (roll.type === 'duality') {
    list.push({ k: 'hope', faces: 12, v: r.hope }, { k: 'fear', faces: 12, v: r.fear });
    if (r.extra) r.extra.rolls.forEach(v => list.push({ k: r.extra.sign > 0 ? 'adv' : 'dis', faces: 6, v, small: true }));
    if (r.help) r.help.rolls.forEach(v => list.push({ k: 'help', faces: 6, v, small: true }));
  } else if (roll.type === 'damage') {
    r.rolls.forEach((v, i) => list.push({ k: 'dmg', faces: r.die, v, drop: !r.kept[i], small: r.rolls.length > 3 }));
    r.bonus?.parts.forEach(p => p.type === 'dice' && p.rolls.forEach(v => list.push({ k: 'gen', faces: p.faces, v, small: true })));
  } else if (roll.type === 'dice') {
    r.parts.forEach(p => p.type === 'dice' && p.rolls.forEach((v, i) => list.push({ k: 'gen', faces: p.faces, v, drop: !p.kept[i], small: true })));
  } else if (roll.type === 'rest') list.push({ k: 'fear', faces: 4, v: r.die });
  return list.slice(0, 16).map(d => ({ ...d, small: d.small || list.length > 4 }));
}

function Die({ d, i, compact, instant }) {
  const c = KIND[d.k] || KIND.gen;
  const dur = compact ? 0.8 : 1.15;
  const style = useMemo(() => {
    const side = Math.random() < 0.5 ? -1 : 1;
    return { '--sx': `${side * (compact ? 140 : 380 + Math.random() * 380)}px`, '--sy': `${(Math.random() - 0.65) * (compact ? 80 : 420)}px`, '--rot': `${side * (360 * (2 + Math.floor(Math.random() * 2)) + Math.random() * 70)}deg`, '--delay': `${i * 0.09}s`, '--dur': `${dur}s`, '--glow': c.glow, '--ink': c.ink };
  }, []); // eslint-disable-line
  const landAt = (dur + i * 0.09) * 1000;
  const [shown, setShown] = useState(instant ? d.v : 1 + Math.floor(Math.random() * d.faces));
  const [landed, setLanded] = useState(!!instant);
  useEffect(() => {
    if (instant) return;
    const tick = setInterval(() => setShown(1 + Math.floor(Math.random() * d.faces)), 60);
    const stop = setTimeout(() => { clearInterval(tick); setShown(d.v); setLanded(true); }, landAt);
    return () => { clearInterval(tick); clearTimeout(stop); };
  }, []); // eslint-disable-line
  const gid = `g${d.k}${i}${d.faces}`;
  return (
    <div className={'die' + (d.small ? ' small' : '') + (landed ? ' landed' : '') + (landed && (d.k === 'hope' || d.k === 'fear') ? ' glow' : '')} style={{ ...style, opacity: d.drop && landed ? 0.45 : undefined }} aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.a} /><stop offset="1" stopColor={c.b} /></linearGradient></defs>
        <g fill={`url(#${gid})`} stroke="rgba(255,255,255,.55)" strokeWidth="2.4" strokeLinejoin="round">{SHAPES[d.faces] || <circle cx="50" cy="50" r="46" />}</g>
        {[12, 20].includes(d.faces) && <g fill="none" stroke="rgba(0,0,0,.2)" strokeWidth="1.6"><path d={d.faces === 12 ? 'M50 3 L50 32 M96 37 L72 45 M78 93 L64 66 M22 93 L36 66 M4 37 L28 45 M28 45 L50 32 L72 45 L64 66 L36 66 Z' : 'M50 3 L50 30 M92 26 L68 40 M92 74 L68 60 M50 97 L50 70 M8 74 L32 60 M8 26 L32 40 M50 30 L68 40 L68 60 L50 70 L32 60 L32 40 Z'}/></g>}
      </svg>
      <div className="num" style={{ textDecoration: d.drop && landed ? 'line-through' : 'none' }}>{shown}</div>
      <div className="shadow" />
    </div>
  );
}

// item: { roll, compact, who }
export default function DiceOverlay({ item, onDone }) {
  const { roll, compact } = item;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const dice = useMemo(() => diceFor(roll), [roll.id]); // eslint-disable-line
  const [showResult, setShowResult] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; setLeaving(true); setTimeout(onDone, 230); };
  useEffect(() => {
    const land = reduce ? 80 : (compact ? 800 : 1150) + dice.length * 90 + 120;
    const t1 = setTimeout(() => setShowResult(true), land);
    const t2 = setTimeout(finish, land + (compact ? 3200 : 2600));
    const key = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', key);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('keydown', key); };
  }, []); // eslint-disable-line
  const h = headline(roll);
  const who = roll.characterName ? `${roll.characterName} · ${roll.label}` : roll.label;
  return (
    <div className={'dice-overlay' + (compact ? ' compact' : '') + (leaving ? ' out' : '')} onClick={compact ? undefined : finish} role="status" aria-live="polite">
      <div className="dice-stage">
        <div className="dice-row">{dice.map((d, i) => <Die key={roll.id + i} d={d} i={i} compact={compact} instant={reduce} />)}</div>
        <div className="dice-result">
          {showResult && (<>
            <div className="who">{who}</div>
            <div className="big">{h.big}</div>
            <div className={'what out ' + h.cls}>{h.what}{h.sub && roll.type === 'duality' ? ` · ${h.sub}` : ''}</div>
          </>)}
        </div>
      </div>
      <div className="hint">Toque para fechar</div>
    </div>
  );
}
