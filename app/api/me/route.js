import { api } from '@/lib/server/http.js';
import { currentUser, publicUser } from '@/lib/server/auth.js';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { const u = await currentUser(); return { user: u ? publicUser(u) : null }; });
