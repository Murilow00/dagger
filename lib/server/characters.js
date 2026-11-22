import { db } from './db.js';
import { HttpError } from './http.js';
import { campaignsOfCharacter, isMember } from './campaigns.js';
import { publish } from './hub.js';

export function characterFor(user, id) {
  const ch = db().characters.find(c => c.id === id);
  if (!ch) throw new HttpError(404, 'Personagem não encontrado.');
  if (ch.ownerId === user.id) return { ch, owner: true };
  // Quem participa de uma campanha onde o personagem está pode ver a ficha (somente leitura).
  if (campaignsOfCharacter(id).some(c => isMember(c, user.id))) return { ch, owner: false };
  throw new HttpError(403, 'Você não tem acesso a esta ficha.');
}
export function ownedCharacter(user, id) {
  const r = characterFor(user, id);
  if (!r.owner) throw new HttpError(403, 'Somente o dono da ficha pode alterá-la.');
  return r.ch;
}
export const refreshTables = (characterId) => { for (const c of campaignsOfCharacter(characterId)) publish(c.id, 'refresh', {}); };
