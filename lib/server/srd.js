import { indexSrd } from '../rules.js';
import srd from '../../public/data/srd.json';   // embutido no bundle: na Vercel a pasta public não fica no disco da função

export function getIdx() {
  if (!globalThis.__dh_idx) globalThis.__dh_idx = indexSrd(srd);
  return globalThis.__dh_idx;
}
