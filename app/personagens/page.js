'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useRequireAuth } from '@/components/Providers.jsx';
import CharacterCard from '@/components/CharacterCard.jsx';

export default function Page() {
  const { loading } = useRequireAuth();
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { if (!loading) api('/api/characters').then(d => setList(d.characters)).catch(e => setErr(e.message)); }, [loading]);
  if (loading) return null;
  return (
    <main className="wrap page">
      <div className="row between"><h1>Meus personagens</h1><Link className="btn primary" href="/personagens/novo">Novo personagem</Link></div>
      {err && <div className="error">{err}</div>}
      {list && !list.length && <div className="empty"><p>Você ainda não tem personagens.</p><Link className="btn primary" href="/personagens/novo">Criar meu primeiro personagem</Link></div>}
      <div className="grid g2">
        {list?.map(c => (
          <CharacterCard key={c.id} c={c} href={`/personagens/${c.id}`}>
            <div className="muted tiny" style={{ marginTop: 6 }}>{c.campaigns.length ? 'Na mesa: ' + c.campaigns.map(x => x.name).join(', ') : 'Fora de campanhas'}</div>
          </CharacterCard>
        ))}
      </div>
    </main>
  );
}
