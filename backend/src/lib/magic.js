/**
 * Liens magiques — connexion en 1 clic depuis un email (sans mot de passe).
 *
 * Un token magique est un JWT signé (même secret que les sessions) mais avec
 * `purpose: 'magic'` : il ne peut PAS servir de token de session directement
 * (il n'a ni `id` ni `role`). Il est échangé contre une vraie session via
 * la route POST /auth/magic. Stateless : aucune table nécessaire.
 */
import jwt from 'jsonwebtoken';

const MAGIC_TTL = '14d'; // fenêtre confortable : les adoptants lisent leurs mails tardivement

export function makeMagicToken({ adoptantId, matchId = null }) {
  return jwt.sign(
    { purpose: 'magic', adoptantId, matchId },
    process.env.JWT_SECRET,
    { expiresIn: MAGIC_TTL }
  );
}

/** Vérifie et décode un token magique. Lève une erreur si invalide/expiré. */
export function verifyMagicToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'magic' || !decoded.adoptantId) {
    throw new Error('Not a magic token');
  }
  return decoded;
}
