'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useRequireAuth } from '@/components/Providers.jsx';

export default function Campaigns() {
  const { loading } = useRequireAuth();
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', description: '' });
  const load = () => api('/api/campaigns').then(d => setList(d.campaigns)).catch(e => setErr(e.message));
  useEffect(() => { if (!loading) load(); }, [loading]);
  const create = async (e) => { e.preventDefault(); setErr(''); try { const r = await api('/api/campaigns', { method: 'POST', body: f }); window.location.href = '/campanhas/' + r.id; } catch (e2) { setErr(e2.message); } };
  if (loading) return null;
  return (
    <main className="wrap page">
      <h1>Campanhas</h1>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="stack">
          {list && !list.length && <div className="empty">Você ainda não participa de nenhuma campanha. Crie uma ao lado ou abra o link de convite que o mestre te enviou.</div>}
          {list?.map(c => (
            <Link key={c.id} href={'/campanhas/' + c.id} className="panel" style={{ color: 'inherit', display: 'block' }}>
              <div className="row between"><h3 style={{ margin: 0 }}>{c.name}</h3><span className={'chip' + (c.isGm ? ' on' : '')}>{c.isGm ? 'Você é o mestre' : 'Mestre: ' + c.gmName}</span></div>
              {c.description && <p className="muted small" style={{ margin: '6px 0 0' }}>{c.description}</p>}
              <div className="muted small" style={{ marginTop: 6 }}>{c.players} jogador(es){!c.isGm ? ` · ${c.myCharacters} personagem(ns) seu(s)` : ''}</div>
            </Link>))}
        </section>
        <form className="panel stack" onSubmit={create}>
          <h3>Criar campanha</h3>
          <p className="muted small">Você será o mestre. Depois de criar, copie o link de convite no menu do mestre e envie aos jogadores.</p>
          <label className="field">Nome<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required minLength={2} maxLength={60} /></label>
          <label className="field">Descrição (opcional)<textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} maxLength={500} /></label>
          {err && <div className="error" role="alert">{err}</div>}
          <button className="btn primary">Criar campanha</button>
        </form>
      </div>
    </main>
  );
}
