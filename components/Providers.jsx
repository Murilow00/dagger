'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { indexSrd } from '@/lib/rules.js';
import { api } from '@/lib/client/api.js';
import DiceOverlay from './DiceOverlay.jsx';

const AuthCtx = createContext(null);
const SrdCtx = createContext(null);
const DiceCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
export const useSrd = () => useContext(SrdCtx);
export const useDice = () => useContext(DiceCtx);

export default function Providers({ children }) {
  const [user, setUser] = useState(undefined);
  const [srd, setSrd] = useState(null);
  const [anim, setAnimState] = useState('on'); // on | mine | off
  const [slots, setSlots] = useState({ full: null, compact: null });
  const resolvers = useRef({});

  useEffect(() => { api('/api/me').then(d => setUser(d.user)).catch(() => setUser(null)); }, []);
  useEffect(() => {
    fetch('/data/srd.json').then(r => r.json()).then(s => setSrd({ srd: s, idx: indexSrd(s) }));
    try { const a = localStorage.getItem('dh_anim'); if (a) setAnimState(a); } catch { /* sem storage */ }
  }, []);

  const setAnim = useCallback((v) => { setAnimState(v); try { localStorage.setItem('dh_anim', v); } catch { /* ok */ } }, []);
  const animRef = useRef(anim); animRef.current = anim;

  // Mostra a animação de uma rolagem por cima da tela. Resolve quando termina (ou na hora, se desativada).
  const play = useCallback((roll, { compact = false } = {}) => new Promise((resolve) => {
    const mode = animRef.current;
    if (mode === 'off' || (mode === 'mine' && compact)) return resolve();
    const slot = compact ? 'compact' : 'full';
    resolvers.current[slot]?.();
    resolvers.current[slot] = resolve;
    setSlots(s => ({ ...s, [slot]: { roll, compact } }));
  }), []);
  const finish = (slot) => { resolvers.current[slot]?.(); resolvers.current[slot] = null; setSlots(s => ({ ...s, [slot]: null })); };

  const auth = useMemo(() => ({
    user, loading: user === undefined,
    setUser, logout: async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); },
  }), [user]);
  const srdValue = useMemo(() => srd || { srd: null, idx: null }, [srd]);
  const dice = useMemo(() => ({ play, anim, setAnim }), [play, anim, setAnim]);

  return (
    <AuthCtx.Provider value={auth}><SrdCtx.Provider value={srdValue}><DiceCtx.Provider value={dice}>
      {children}
      {slots.full && <DiceOverlay key={slots.full.roll.id + 'f'} item={slots.full} onDone={() => finish('full')} />}
      {slots.compact && <DiceOverlay key={slots.compact.roll.id + 'c'} item={slots.compact} onDone={() => finish('compact')} />}
    </DiceCtx.Provider></SrdCtx.Provider></AuthCtx.Provider>
  );
}

// Redireciona para o login quando não há sessão.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.replace('/entrar?next=' + encodeURIComponent(window.location.pathname));
  }, [loading, user]);
  return { user, loading: loading || !user };
}
