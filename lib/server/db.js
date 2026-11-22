// Acesso síncrono aos dados da requisição atual (carregados por api() em http.js).
// A persistência de verdade fica em store.js (Redis na Vercel, arquivo em desenvolvimento).
import crypto from 'node:crypto';
import { als } from './store.js';

export function db() {
  const ctx = als.getStore();
  if (!ctx) throw new Error('db() só pode ser usado dentro de uma requisição da API.');
  return ctx.db;
}
// As mudanças são detectadas comparando com o que foi carregado; save() ficou só por compatibilidade.
export const save = () => {};

export const uid = () => crypto.randomBytes(9).toString('base64url');
export const inviteCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(8), b => alphabet[b % alphabet.length]).join('');
};
export const rng = (n) => crypto.randomInt(1, n + 1);
