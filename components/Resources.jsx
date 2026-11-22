'use client';
// Linha de marcadores clicáveis (PV, Fadiga, Esperança, Armadura).
export function Pips({ value, max, color, onChange, shape = 'square', disabled, label }) {
  return (
    <div className="pips" role="group" aria-label={label} style={{ '--pc': color }}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" disabled={disabled} className={'pip ' + (shape === 'round' ? 'round ' : shape === 'diamond' ? 'diamond ' : '') + (i < value ? 'on' : '')}
          aria-label={`${label} ${i + 1}`} aria-pressed={i < value}
          onClick={() => onChange(i + 1 === value ? i : i + 1)} />
      ))}
    </div>
  );
}
