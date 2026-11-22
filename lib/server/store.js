// Camada de dados. Dois backends com a mesma interface:
//  - Redis (Upstash, via REST): usado na Vercel quando UPSTASH_REDIS_REST_URL/TOKEN (ou KV_REST_API_URL/TOKEN) existem.
//  - Arquivo JSON: desenvolvimento local e servidores únicos (DATA_FILE).
// Cada requisição carrega os registros, roda o handler (código síncrono sobre arrays) e grava só o que mudou.
// A gravação é "compare-and-set" por registro: se alguém alterou o mesmo registro no meio, a requisição roda de novo.
import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';

export const COLS = ['users', 'sessions', 'characters', 'campaigns'];
const ROLL_KEEP = 300;
export const als = (globalThis.__dh_als ||= new AsyncLocalStorage());

// ---------- Redis (Upstash REST) ----------
const REST_URL = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function pipeline(cmds) {
  const res = await fetch(REST_URL().replace(/\/$/, '') + '/pipeline', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: 'Bearer ' + REST_TOKEN(), 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body)) throw new Error('Falha ao acessar o Redis: ' + (body?.error || res.status));
  return body.map(x => { if (x.error) throw new Error('Redis: ' + x.error); return x.result; });
}
const pairs = (flat) => {
  if (!flat) return {};
  if (!Array.isArray(flat)) return flat;
  const o = {}; for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1]; return o;
};

// Aplica todas as operações ou nenhuma: confere o valor antigo de cada registro antes de gravar.
const LUA = `
local ops = cjson.decode(ARGV[1])
for _, s in ipairs(ops.sets) do
  local cur = redis.call('HGET', s.k, s.f)
  local old = s.o
  if old == cjson.null then old = false end
  if cur ~= old then return 0 end
end
for _, s in ipairs(ops.sets) do
  if s.n == cjson.null then redis.call('HDEL', s.k, s.f) else redis.call('HSET', s.k, s.f, s.n) end
end
for _, p in ipairs(ops.push) do redis.call('RPUSH', p.k, p.v); redis.call('LTRIM', p.k, -${ROLL_KEEP}, -1) end
for _, k in ipairs(ops.incr) do redis.call('INCR', k) end
for _, k in ipairs(ops.del) do redis.call('DEL', k) end
for _, s in ipairs(ops.set) do redis.call('SET', s.k, s.v) end
return 1`;

const redisBackend = {
  name: 'redis',
  async load() {
    const r = await pipeline(COLS.map(c => ['HGETALL', 'dh:' + c]));
    return Object.fromEntries(COLS.map((c, i) => [c, pairs(r[i])]));
  },
  async commit(ops) {
    const wire = {
      sets: ops.sets.map(s => ({ k: 'dh:' + s.col, f: s.id, o: s.o, n: s.n })),
      push: ops.push.map(p => ({ k: 'dh:rolls:' + p.cid, v: p.v })),
      incr: [...ops.bumpR.map(c => 'dh:rv:' + c), ...ops.bumpC.map(c => 'dh:cv:' + c)],
      del: ops.dead.map(c => 'dh:rolls:' + c),
      set: ops.dead.map(c => ({ k: 'dh:cv:' + c, v: '-1' })),
    };
    const [ok] = await pipeline([['EVAL', LUA, '0', JSON.stringify(wire)]]);
    return ok === 1 || ok === '1';
  },
  async tick(cid) { const [r] = await pipeline([['MGET', 'dh:rv:' + cid, 'dh:cv:' + cid]]); return r; },
  async rolls(cid, n) { const [r] = await pipeline([['LRANGE', 'dh:rolls:' + cid, String(-n), '-1']]); return r || []; },
};

// ---------- Arquivo JSON ----------
const FILE = () => process.env.DATA_FILE || path.join(process.cwd(), '.data', 'db.json');
function fileState() {
  const G = globalThis;
  if (!G.__dh_file) {
    let d = {};
    try { d = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch { /* primeiro uso */ }
    const st = { users: {}, sessions: {}, characters: {}, campaigns: {}, rolls: {}, rv: {}, cv: {} };
    if (Array.isArray(d.users)) {            // formato antigo (arrays): converte
      for (const c of COLS) for (const r of d[c] || []) st[c][r.id] = JSON.stringify(r);
      for (const r of d.rolls || []) (st.rolls[r.campaignId] ||= []).push(JSON.stringify(r));
    } else Object.assign(st, d);
    G.__dh_file = st;
  }
  return G.__dh_file;
}
let timer = null;
function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try { fs.mkdirSync(path.dirname(FILE()), { recursive: true }); const tmp = FILE() + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(fileState())); fs.renameSync(tmp, FILE()); }
    catch (e) { console.error('Falha ao salvar o banco:', e); }
  }, 150);
}
const fileBackend = {
  name: 'file',
  async load() { const s = fileState(); return Object.fromEntries(COLS.map(c => [c, { ...s[c] }])); },
  async commit(ops) {
    const s = fileState();
    for (const x of ops.sets) if ((s[x.col][x.id] ?? null) !== x.o) return false;
    for (const x of ops.sets) { if (x.n === null) delete s[x.col][x.id]; else s[x.col][x.id] = x.n; }
    for (const p of ops.push) { const l = (s.rolls[p.cid] ||= []); l.push(p.v); if (l.length > ROLL_KEEP) l.splice(0, l.length - ROLL_KEEP); }
    for (const c of ops.bumpR) s.rv[c] = (s.rv[c] || 0) + 1;
    for (const c of ops.bumpC) s.cv[c] = (s.cv[c] || 0) + 1;
    for (const c of ops.dead) { delete s.rolls[c]; s.cv[c] = -1; }
    persist();
    return true;
  },
  async tick(cid) { const s = fileState(); return [s.rv[cid] == null ? null : String(s.rv[cid]), s.cv[cid] == null ? null : String(s.cv[cid])]; },
  async rolls(cid, n) { return (fileState().rolls[cid] || []).slice(-n); },
};

export const backend = () => (REST_URL() && REST_TOKEN() ? redisBackend : fileBackend);

// ---------- Contexto por requisição ----------
export async function newCtx() {
  const raw = await backend().load();
  const db = {};
  for (const c of COLS) db[c] = Object.values(raw[c]).map(v => JSON.parse(v));
  return { db, orig: raw, pushes: [], bumpC: new Set() };
}

export function buildOps(ctx) {
  const sets = [];
  for (const col of COLS) {
    const cur = new Map(ctx.db[col].map(r => [r.id, JSON.stringify(r)]));
    for (const [id, n] of cur) { const o = ctx.orig[col][id] ?? null; if (o !== n) sets.push({ col, id, o, n }); }
    for (const id of Object.keys(ctx.orig[col])) if (!cur.has(id)) sets.push({ col, id, o: ctx.orig[col][id], n: null });
  }
  const alive = new Set(ctx.db.campaigns.map(c => c.id));
  const dead = Object.keys(ctx.orig.campaigns).filter(id => !alive.has(id));
  const push = ctx.pushes.map(p => ({ cid: p.cid, v: JSON.stringify(p.roll) }));
  const bumpR = [...new Set(ctx.pushes.map(p => p.cid))].filter(id => alive.has(id));
  const bumpC = [...ctx.bumpC].filter(id => alive.has(id));
  return { sets, push, bumpR, bumpC, dead };
}

// Grava as mudanças da requisição. Devolve false se houve conflito (alguém mudou o mesmo registro).
export async function commit(ctx) {
  const ops = buildOps(ctx);
  if (!ops.sets.length && !ops.push.length && !ops.bumpC.length && !ops.dead.length) return true;
  return backend().commit(ops);
}
