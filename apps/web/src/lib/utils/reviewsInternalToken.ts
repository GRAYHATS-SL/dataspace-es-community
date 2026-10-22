'use server';
import crypto from 'node:crypto';

/**
 * @summary Signs the internal HMAC token that authorizes a POST to `reviews-api`.
 *
 * @param  {ReviewsInternalTokenPayload}  payload - Offering, organization and author identifiers.
 * @returns {Promise<string>} Signed token.
 * @throws {Error} If `TOKEN_SECRET` is not set.
 */
export interface ReviewsInternalTokenPayload {
  offeringId: string;
  organizationId: string;
  individualId: string;
}

export async function signReviewsInternalToken(
  payload: ReviewsInternalTokenPayload,
): Promise<string> {
  const SECRET = process.env.TOKEN_SECRET;
  if (!SECRET) {
    throw new Error('No se ha definido TOKEN_SECRET');
  }

  const payloadB64 = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString(
    'base64url',
  );
  const signature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex');

  return `${payloadB64}.${signature}`;
}
