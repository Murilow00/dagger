// Avisos de mudança da mesa. Sem conexões abertas (a Vercel não mantém): cada mudança incrementa um contador
// que os clientes consultam de tempos em tempos (/api/campaigns/[id]/tick) para saber se precisam atualizar.
import { als } from './store.js';

export function publish(campaignId, type) {
  const ctx = als.getStore();
  if (ctx && type === 'refresh') ctx.bumpC.add(campaignId);
}
