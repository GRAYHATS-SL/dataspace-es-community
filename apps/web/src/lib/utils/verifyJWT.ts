/**
 * JWT verification for tokens issued by the configured OIDC provider.
 *
 * Algorithm: RS256. Public keys are fetched from the JWKS endpoint and cached for one hour.
 */

import crypto from 'node:crypto';

const EXPECTED_ISSUER = process.env.OIDC_ISSUER_URL;
const JWKS_URI = process.env.OIDC_JWKS_URI;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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

let cachedKeys: JWK[] = [];
let jwksCachedAt = 0;

/**
 * Returns the public key matching `kid` from the JWKS endpoint (cached in memory).
 */
async function getPublicKey(kid: string): Promise<crypto.KeyObject | null> {
  if (!JWKS_URI) return null;

  const now = Date.now();
  if (!cachedKeys.length || now - jwksCachedAt > JWKS_CACHE_TTL_MS) {
    try {
      const res = await fetch(JWKS_URI, { cache: 'no-store' });
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
 * Verifies the RS256 signature of a JWT. Does not validate claims.
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

function audienceMatches(aud: unknown, expectedAudience: string): boolean {
  if (typeof aud === 'string') return aud === expectedAudience;
  return Array.isArray(aud) && aud.includes(expectedAudience);
}

/**
 * Validates the RS256 signature and the `exp`, `iss`, `aud` and `sub` claims.
 * Used in the OAuth callback.
 */
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

  if (!EXPECTED_ISSUER || payload.iss !== EXPECTED_ISSUER) {
    return { valid: false, payload, error: 'invalid_issuer' };
  }

  // Here you define your audience rules (client id, API identifier...).
  if (!audienceMatches(payload.aud, expectedAudience)) {
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

/**
 * Returns the payload of an already authenticated token (stored in the session).
 * Verifies signature and `exp`; no audience check.
 */
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
