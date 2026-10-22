import crypto from 'node:crypto';

import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** Verified payload of the internal token. */
export interface InternalTokenPayload {
  offeringId: string;
  organizationId: string;
  individualId: string;
}

/** Internal token TTL, in milliseconds. */
const TOKEN_TTL_MS = 60_000;

/** Unverified token payload as decoded. */
interface RawPayload extends InternalTokenPayload {
  iat: number;
}

/**
 * Type guard for the decoded token payload.
 *
 * @param value - Decoded value to validate.
 * @returns `true` if `value` matches {@link RawPayload}.
 */
const isRawPayload = (value: unknown): value is RawPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.offeringId === 'string' &&
    typeof candidate.organizationId === 'string' &&
    typeof candidate.individualId === 'string' &&
    typeof candidate.iat === 'number'
  );
};

/**
 * Verifies the internal HMAC token issued by `apps/web`.
 *
 * @param token - Token from the `Authorization: Bearer` header.
 * @param expectedOfferingId - `offeringId` from the route.
 * @returns `ok` with the verified payload, or `err('invalid')`.
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
  if (decoded.offeringId !== expectedOfferingId) return err('invalid');

  return ok({
    offeringId: decoded.offeringId,
    organizationId: decoded.organizationId,
    individualId: decoded.individualId,
  });
};
