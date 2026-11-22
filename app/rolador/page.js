'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/components/Providers.jsx';
import { RollOptions, QuickDice, useRollOptions, useRoller, dualityPayload } from '@/components/RollKit.jsx';
import { RollItem } from '@/components/RollView.jsx';


export default function Roller() {
  const { loading } = useRequireAuth();
  const { o, set, toggleExp } = useRollOptions();
  const [history, setHistory] = useState([]);
  const { run, busy, error } = useRoller({ onResult: (d, phase) => { if (phase === 'end') setHistory(h => [d.roll, ...h].slice(0, 30)); } });
  if (loading) return null;
  return (
    <main className="wrap page">
      <h1>Rolador de dados</h1>
      <p className="muted">Rolagens livres, sem personagem. Para rolar com atributos, Experiências e para a mesa ver, use a ficha do personagem.</p>
      <div className="grid g2">
        <section className="panel stack">
          <h3>Dados de Dualidade</h3>
          <RollOptions o={o} set={set} toggleExp={toggleExp} experiences={[]} showManualBonus />
          <button className="btn primary" disabled={busy} onClick={() => run(dualityPayload(o, { label: 'Teste livre' }))}>Rolar Esperança e Medo</button>
          <h3 style={{ marginTop: 10 }}>Outros dados</h3>
          <QuickDice run={run} busy={busy} />
          {error && <div className="error" role="alert">{error}</div>}
        </section>
        <section className="panel"><h3>Histórico</h3>
          {!history.length && <p className="muted">Suas rolagens aparecem aqui.</p>}
          <div className="log">{history.map(r => <RollItem key={r.id} roll={r} showWho={false} />)}</div></section>
      </div>
    </main>
  );
}
