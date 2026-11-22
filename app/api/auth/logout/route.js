import { api } from '@/lib/server/http.js';
import { endSession } from '@/lib/server/auth.js';
export const POST = api(async () => { await endSession(); return { ok: true }; });
