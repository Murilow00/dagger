'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth, useDice } from '@/components/Providers.jsx';
import { rollDuality } from '@/lib/dice.js';

const rng = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % n) + 1; };

export default function Home() {
  const { user, loading } = useAuth();
  const { play } = useDice();
  const [last, setLast] = useState(null);
  const demo = async () => {
    const result = rollDuality({ kind: 'action', traitBonus: 0 }, rng);
    const roll = { id: 'demo' + Date.now(), ts: Date.now(), type: 'duality', label: 'Teste de demonstração', userName: 'Você', result, effects: {} };
    await play(roll); setLast(result);
  };
  return (
    <main className="wrap page">
      <section className="hero-home">
        <div>
          <h1>Sua mesa de Daggerheart, onde todo mundo está.</h1>
          <p className="muted" style={{ fontSize: '1.1rem' }}>Crie sua ficha seguindo as regras, role os Dados de Dualidade e acompanhe cada rolagem da mesa em tempo real. O mestre cria a campanha, manda um link e os jogadores trazem seus personagens.</p>
          <div className="row" style={{ marginTop: 20 }}>
            {!loading && (user
              ? (<><Link className="btn primary" href="/personagens/novo">Criar personagem</Link><Link className="btn" href="/campanhas">Minhas campanhas</Link></>)
              : (<><Link className="btn primary" href="/entrar">Criar conta e começar</Link><Link className="btn" href="/biblioteca">Explorar a biblioteca</Link></>))}
          </div>
        </div>
        <div>
          <button className="hero-dice" onClick={demo} aria-label="Rolar os Dados de Dualidade de demonstração" style={{ width: '100%', font: 'inherit', color: 'inherit' }}>
            <svg width="108" height="108" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="hh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#d99a14" /></linearGradient></defs><polygon points="50,3 96,37 78,93 22,93 4,37" fill="url(#hh)" stroke="rgba(255,255,255,.6)" strokeWidth="2.4" strokeLinejoin="round" /><text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="800" fontFamily="serif" fill="#2b1d02">12</text></svg>
            <svg width="108" height="108" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="hf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b99bff" /><stop offset="1" stopColor="#5b34c9" /></linearGradient></defs><polygon points="50,3 96,37 78,93 22,93 4,37" fill="url(#hf)" stroke="rgba(255,255,255,.6)" strokeWidth="2.4" strokeLinejoin="round" /><text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="800" fontFamily="serif" fill="#fff">12</text></svg>
          </button>
          <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>{last ? `Último teste: Esperança ${last.hope} e Medo ${last.fear}. Clique para rolar de novo.` : 'Clique nos dados para ver como é rolar Esperança e Medo.'}</p>
        </div>
      </section>
      <section className="grid g3" style={{ marginTop: 34 }}>
        {[['Ficha que respeita as regras', 'Atributos, equipamento inicial, Experiências e cartas de domínio validados pelo SRD, com subida de nível até o 10.', '/personagens'],
          ['Rolagens que a mesa vê', 'Vantagem, Experiências, ajuda de aliados e dano com crítico. Cada rolagem aparece para todos, e o Medo do mestre sobe sozinho.', '/rolador'],
          ['Biblioteca e bestiário', 'Todas as cartas, classes, armas, adversários e ambientes do SRD, com filtros e busca.', '/biblioteca']].map(([t, d, h]) => (
          <Link key={h} href={h} className="panel" style={{ color: 'inherit' }}><h3>{t}</h3><p className="muted" style={{ margin: 0 }}>{d}</p></Link>))}
      </section>
    </main>
  );
}
