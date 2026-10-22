/** Verification of JWT tokens issued by the VCVerifier. */

import crypto from 'node:crypto';

import {
  VERIFIER_ISSUER,
  VERIFIER_JWKS_CACHE_TTL_MS,
  VERIFIER_JWKS_URI,
} from '@/lib/services/verifier.constants';

export interface JWTValidationResult {
  valid: boolean;
  payload: Record<string, unknown>;
  error?: string;
}

interface JWK {
  kty: string;
  kid: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
}

const JWKS_MIN_REFETCH_MS = 60 * 1000;

let cachedKeys: JWK[] = [];
let jwksCachedAt = 0;

/**
 * Gets the public key for a given Key ID (kid) from the JWKS endpoint, with caching.
 *
 * @param kid - Key ID from the JWT header.
 * @returns The public key, or null if not found or on error.
 */
async function getPublicKey(kid: string): Promise<crypto.KeyObject | null> {
  const now = Date.now();
  const stale = !cachedKeys.length || now - jwksCachedAt > VERIFIER_JWKS_CACHE_TTL_MS;
  // Key rotation: an unknown `kid` forces a refetch (at most one per minute).
  const unknownKid =
    !cachedKeys.some((k) => k.kid === kid) && now - jwksCachedAt > JWKS_MIN_REFETCH_MS;
  if (stale || unknownKid) {
    try {
      const res = await fetch(VERIFIER_JWKS_URI, { cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { keys: JWK[] };
      cachedKeys = body.keys;
      jwksCachedAt = now;
    } catch {
      return null;
    }
  }

  const jwk = cachedKeys.find((k) => k.kid === kid);
  if (!jwk) return null;

  try {
    return crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
  } catch {
    return null;
  }
}

/**
 * Verifies the RS256 signature of a JWT using the JWKS public key.
 *
 * @param token - JWT string to verify.
 * @returns true if the signature is valid; false otherwise.
 */
async function verifyRS256Signature(token: string): Promise<boolean> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');

  let header: { alg?: string; kid?: string };
  try {
    const json = Buffer.from(
      headerB64.replaceAll('-', '+').replaceAll('_', '/'),
      'base64',
    ).toString('utf-8');
    header = JSON.parse(json) as { alg?: string; kid?: string };
  } catch {
    return false;
  }

  if (header.alg !== 'RS256' || !header.kid) return false;

  const publicKey = await getPublicKey(header.kid);
  if (!publicKey) return false;

  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    return verifier.verify(publicKey, signatureB64, 'base64url');
  } catch {
    return false;
  }
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Validates RS256 signature, exp, iss, aud and sub. Used in the OAuth callback.
export async function decodeJWTPayload(
  token: string,
  expectedAudience: string,
): Promise<JWTValidationResult> {
  if (token.split('.').length !== 3) {
    return { valid: false, payload: {}, error: 'invalid_format' };
  }

  const payload = decodePayload(token);
  if (!payload) {
    return { valid: false, payload: {}, error: 'invalid_payload' };
  }

  const exp = payload.exp;
  if (typeof exp !== 'number') {
    return { valid: false, payload, error: 'missing_exp' };
  }
  if (Math.floor(Date.now() / 1000) >= exp) {
    return { valid: false, payload, error: 'token_expired' };
  }

  if (payload.iss !== VERIFIER_ISSUER) {
    return { valid: false, payload, error: 'invalid_issuer' };
  }

  // aud may be a string or an array containing the verifier client_id, e.g.: ["tmf-api"]
  const aud = payload.aud;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(expectedAudience)) {
    return { valid: false, payload, error: 'invalid_audience' };
  }

  if (!payload.sub) {
    return { valid: false, payload, error: 'missing_sub' };
  }

  const signatureValid = await verifyRS256Signature(token);
  if (!signatureValid) {
    return { valid: false, payload, error: 'invalid_signature' };
  }

  return { valid: true, payload };
}

// Returns the payload of an already authenticated token (stored in session). Verifies signature and exp; no aud validation (there is no request context).
export async function getJWTPayload(token: string): Promise<Record<string, unknown> | null> {
  if (token.split('.').length !== 3) return null;

  const payload = decodePayload(token);
  if (!payload) return null;

  const exp = payload.exp;
  if (typeof exp !== 'number' || Math.floor(Date.now() / 1000) >= exp) return null;

  const signatureValid = await verifyRS256Signature(token);
  if (!signatureValid) return null;

  return payload;
}
