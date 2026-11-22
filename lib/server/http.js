import { headers } from 'next/headers';
import { als, newCtx, commit } from './store.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Envolve um handler: valida a origem, carrega os dados da requisição, roda o handler e grava só o que mudou.
// Se outro pedido alterou o mesmo registro no meio do caminho, repete tudo (até 5 vezes).
// Com { db: false } o handler não usa os dados (ex.: consulta leve de atualização).
export const api = (fn, opts = {}) => async (req, ctx) => {
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.get('origin');
      const host = (await headers()).get('host');
      if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Origem não permitida.');
    }
    const asResponse = (res) => (res instanceof Response ? res : Response.json(res ?? { ok: true }));
    if (opts.db === false) return asResponse(await fn(req, ctx));
    for (let attempt = 0; ; attempt++) {
      const store = await newCtx();
      const res = await als.run(store, () => fn(req.method === 'GET' ? req : req.clone(), ctx));
      const out = res instanceof Response ? res : Response.json(res ?? { ok: true });
      if (await commit(store)) return out;
      if (attempt >= 4) throw new HttpError(409, 'Muitas alterações ao mesmo tempo. Tente de novo.');
      await sleep(15 + Math.random() * 60);
    }
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    return Response.json({ error: status < 500 ? e.message : 'Erro interno do servidor.' }, { status });
  }
};

export async function readBody(req) {
  const type = req.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new HttpError(415, 'Envie o conteúdo como JSON.');
  try { return await req.json(); } catch { throw new HttpError(400, 'JSON inválido.'); }
}
