'use client';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/client/api.js';
import { useAuth } from '@/components/Providers.jsx';
import { CLASS_PT } from '@/lib/rules.js';

export default function Join({ params }) {
  const { code } = use(params);
  const { user, loading } = useAuth();
  const [info, setInfo] = useState(null); const [err, setErr] = useState('');
  const [chars, setChars] = useState([]); const [pick, setPick] = useState('');
  useEffect(() => { api('/api/join/' + code).then(d => setInfo(d.campaign)).catch(e => setErr(e.message)); }, [code]);
  useEffect(() => { if (user) api('/api/characters').then(d => { setChars(d.characters); if (d.characters[0]) setPick(d.characters[0].id); }).catch(() => {}); }, [user]);
  const join = async (withChar) => {
    try { const r = await api('/api/join/' + code, { method: 'POST', body: withChar && pick ? { characterId: pick } : {} }); window.location.href = '/campanhas/' + r.id; }
    catch (e) { setErr(e.message); }
  };
  const next = encodeURIComponent('/convite/' + code);
  return (
    <main className="wrap page" style={{ maxWidth: 560 }}>
      <h1>Convite para a mesa</h1>
      {err && <div className="error" role="alert">{err}</div>}
      {info && (
        <div className="panel stack">
          <h2 style={{ margin: 0 }}>{info.name}</h2>
          <div className="muted">Mestre: {info.gmName} · {info.players} jogador(es)</div>
          {info.description && <p>{info.description}</p>}
          {!loading && !user && (<><p>Entre ou crie uma conta para aceitar o convite.</p><div className="row"><a className="btn primary" href={'/entrar?next=' + next}>Criar conta</a><a className="btn" href={'/entrar?modo=login&next=' + next}>Já tenho conta</a></div></>)}
          {user && (<>
            {chars.length > 0 ? (<>
              <label className="field">Personagem que vai jogar<select value={pick} onChange={e => setPick(e.target.value)}>{chars.map(c => <option key={c.id} value={c.id}>{c.name} · {CLASS_PT[c.classId]} nível {c.level}</option>)}</select></label>
              <button className="btn primary" onClick={() => join(true)}>Entrar com este personagem</button>
              <button className="btn" onClick={() => join(false)}>Entrar e escolher o personagem depois</button>
            </>) : (<><p className="muted">Você ainda não tem personagens. Entre agora e crie um depois, ou crie primeiro.</p>
              <button className="btn primary" onClick={() => join(false)}>Entrar na campanha</button><a className="btn" href="/personagens/novo">Criar personagem</a></>)}
          </>)}
        </div>)}
    </main>
  );
}
