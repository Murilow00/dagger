import { api, readBody } from '@/lib/server/http.js';
import { requireUser } from '@/lib/server/auth.js';
import { doRoll } from '@/lib/server/rolls.js';
export const POST = api(async (req) => doRoll(await requireUser(), await readBody(req)));
