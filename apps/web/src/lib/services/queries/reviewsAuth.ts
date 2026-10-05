import crypto from 'node:crypto';

import { getCurrentUser } from './_utils';

/** Claims carried by the internal token sent to the reviews API. */
export interface ReviewsInternalTokenPayload {
  offeringId: string;
  sub: string;
}

/** Signs `base64url(payload).hex(hmacSha256(base64url(payload)))` with `TOKEN_SECRET`. */
function signReviewsInternalToken(payload: ReviewsInternalTokenPayload): string {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error('TOKEN_SECRET is not configured');

  const payloadB64 = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString(
    'base64url',
  );
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

/** Issues the internal Bearer token that authorizes a review comment on an offering. */
export async function issueReviewsInternalToken(offeringId: string): Promise<string> {
  const user = await getCurrentUser();
  // Here you define your business logic (ownership checks, extra claims...).
  return signReviewsInternalToken({ offeringId, sub: user.organizationId ?? user.sub });
}
