import crypto from 'node:crypto';

import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** Verified payload of the internal token. Here you define your own claims. */
export interface InternalTokenPayload {
  /** Subject the token was issued for (optional, opaque to this service). */
  sub?: string;
}

/** Internal token TTL, in milliseconds — keeps the replay window small. */
const TOKEN_TTL_MS = 60_000;

/** Unverified payload, as decoded from the token, with the embedded `iat` (epoch ms). */
interface RawPayload extends InternalTokenPayload {
  iat: number;
  /** Optional binding to a specific offering. */
  offeringId?: string;
}

/**
 * Structural type guard over the decoded token payload.
 *
 * @param value - Decoded value (JSON.parse) to validate.
 * @returns `true` if `value` has the shape of {@link RawPayload}.
 */
const isRawPayload = (value: unknown): value is RawPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.iat === 'number' &&
    (candidate.sub === undefined || typeof candidate.sub === 'string') &&
    (candidate.offeringId === undefined || typeof candidate.offeringId === 'string')
  );
};

/**
 * Verifies the HMAC internal token issued by `apps/web` after applying its own
 * authorization rules. Token format: `base64url(payloadJson).hex(hmacSha256(payloadB64))`.
 *
 * Checks, in order: `TOKEN_SECRET` is present, token shape, HMAC-SHA256 signature
 * (constant-time comparison), decoded payload shape and 60s TTL (also rejecting
 * an `iat` in the future).
 *
 * @param token - Token received in the `Authorization: Bearer <token>` header.
 * @param expectedOfferingId - `offeringId` of the route (`/offerings/:offeringId/comments...`).
 * @returns `ok` with the verified payload, or `err('invalid')` if any check fails.
 */
export const verifyInternalToken = (
  token: string,
  expectedOfferingId: string,
): Result<InternalTokenPayload, 'invalid'> => {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return err('invalid');

  const parts = token.split('.');
  if (parts.length !== 2) return err('invalid');
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return err('invalid');

  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return err('invalid');
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return err('invalid');
  }
  if (!isRawPayload(decoded)) return err('invalid');

  const age = Date.now() - decoded.iat;
  if (age < 0 || age > TOKEN_TTL_MS) return err('invalid');

  // Here you define your authorization rules. Example: if the token is bound to an
  // offering, it must match the one in the route.
  if (decoded.offeringId !== undefined && decoded.offeringId !== expectedOfferingId) {
    return err('invalid');
  }

  return ok(decoded.sub === undefined ? {} : { sub: decoded.sub });
};
