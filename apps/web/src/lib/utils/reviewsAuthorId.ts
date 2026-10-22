import crypto from 'node:crypto';

/**
 * @summary Derives the author identifier signed towards `reviews-api`.
 *
 * @param  {string}  email - Person email from the session.
 * @returns {string} 64-character hex hash.
 *
 * @throws {Error} If `TOKEN_SECRET` is missing or the email is empty.
 */
export function deriveReviewsAuthorId(email: string): string {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error('No se ha definido TOKEN_SECRET');
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('Email vacío: no se puede derivar el identificador de autor');
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}
