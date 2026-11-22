'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client/api.js';
import { useAuth } from '@/components/Providers.jsx';

function Form() {
  const params = useSearchParams();
  const next = params.get('next') || '/personagens';
  const { setUser } = useAuth();
  const [mode, setMode] = useState(params.get('modo') === 'login' ? 'login' : 'register');
  const [f, setF] = useState({ username: '', displayName: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: f });
      setUser(d.user); window.location.href = next.startsWith('/') ? next : '/personagens';
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return (
    <main className="wrap page" style={{ maxWidth: 460 }}>
      <h1>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
      <div className="tabs"><button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Criar conta</button><button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Já tenho conta</button></div>
      <form className="stack panel" onSubmit={submit}>
        <label className="field">Usuário<input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoComplete="username" required minLength={3} maxLength={24} placeholder="letras minúsculas, números, _ . -" /></label>
        {mode === 'register' && <label className="field">Nome na mesa<input value={f.displayName} onChange={e => setF({ ...f, displayName: e.target.value })} maxLength={30} placeholder="Como os outros jogadores vão te ver" /></label>}
        <label className="field">Senha<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} placeholder="mínimo de 8 caracteres" /></label>
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn primary" disabled={busy}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      </form>
    </main>
  );
}
export default function Page() { return <Suspense><Form /></Suspense>; }
