import './globals.css';
import Providers from '@/components/Providers.jsx';
import Nav from '@/components/Nav.jsx';
import { Analytics } from "@vercel/analytics/next"

export const metadata = { title: 'Mesa de Daggerheart', description: 'Fichas, rolagens ao vivo, biblioteca e campanhas de Daggerheart.' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#121832' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <Nav />
          {children}
          <footer className="wrap muted tiny" style={{ padding: '30px 0 50px' }}>
            Este produto inclui materiais do Daggerheart System Reference Document 1.0, © Critical Role, LLC, sob a Darrington Press Community Gaming (DPCGL) License (daggerheart.com). Daggerheart e marcas relacionadas são marcas da Critical Role, LLC. Projeto de fãs, sem afiliação com a Critical Role ou a Darrington Press.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
