'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useDice } from './Providers.jsx';

const LINKS = [['/personagens', 'Personagens'], ['/campanhas', 'Campanhas'], ['/biblioteca', 'Biblioteca'], ['/bestiario', 'Bestiário'], ['/rolador', 'Rolador']];

export default function Nav() {
  const path = usePathname();
  const { user, loading, logout } = useAuth();
  const { anim, setAnim } = useDice();
  return (
    <header className="nav">
      <div className="wrap">
        <Link href="/" className="brand"><span className="pair"><i style={{ background: 'var(--hope)' }} /><i style={{ background: 'var(--fear)' }} /></span>Mesa de Daggerheart</Link>
        <nav className="links" aria-label="Principal">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className={'link' + (path.startsWith(href) ? ' on' : '')}>{label}</Link>)}
        </nav>
        <select aria-label="Animação dos dados" value={anim} onChange={e => setAnim(e.target.value)} style={{ width: 'auto', padding: '5px 8px', fontSize: '.8rem' }} title="Animação dos dados">
          <option value="on">Dados: todas</option><option value="mine">Dados: só as minhas</option><option value="off">Dados: sem animação</option>
        </select>
        {!loading && (user
          ? <button className="btn sm ghost" onClick={async () => { await logout(); window.location.href = '/'; }} title={'Sair de ' + user.displayName}>Sair</button>
          : <Link className="btn sm primary" href="/entrar">Entrar</Link>)}
      </div>
    </header>
  );
}
