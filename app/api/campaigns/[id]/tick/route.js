import { api } from '@/lib/server/http.js';
import { backend } from '@/lib/server/store.js';

export const dynamic = 'force-dynamic';

// Consulta leve (um único comando no Redis) feita de tempos em tempos por quem está na mesa.
// Devolve só dois contadores: r = novas rolagens, c = mudanças na campanha (-1 = campanha apagada).
// Não revela conteúdo: quando um contador muda, o cliente busca os dados por rotas autenticadas.
export const GET = api(async (req, { params }) => {
  const { id } = await params;
  if (!/^[\w-]{6,32}$/.test(id)) return { r: 0, c: 0 };
  const [r, c] = await backend().tick(id);
  return Response.json({ r: Number(r || 0), c: Number(c || 0) }, { headers: { 'Cache-Control': 'no-store' } });
}, { db: false });
