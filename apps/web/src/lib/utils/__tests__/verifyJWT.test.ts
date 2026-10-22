// @vitest-environment node
import crypto from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JWTValidationResult } from '@/lib/utils/verifyJWT';

// RSA key pair — generated once, reused across all tests. Using 2048-bit keys to match production requirements.
const KID = 'test-key-id';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const ISSUER = 'https://test-verifier.example.com';
const HOST = 'localhost:3000';
// 2 hours ahead so tokens remain valid even after advancing fake timers 61 min
const FUTURE_EXP = Math.floor(Date.now() / 1000) + 7200;

// Helpers

/** Builds a base64url-encoded JWT signed with the test private key. */
function signJWT(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  const header = encode({ alg: 'RS256', typ: 'JWT', kid: KID });
  const body = encode(payload);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(privateKey, 'base64url')}`;
}

/** Returns a minimal valid payload. */
function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { iss: ISSUER, sub: 'did:key:z6MkTest', aud: [HOST], exp: FUTURE_EXP, ...overrides };
}

/** Builds a JWKS response from the test public key. */
function makeJWKS() {
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return { keys: [{ ...jwk, kid: KID, use: 'sig', alg: 'RS256' }] };
}

/** Stubs global fetch to return a valid JWKS response. */
function mockFetchWithJWKS() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => makeJWKS() }));
}

// Module re-import per test to reset the module-level JWKS cache
let decodeJWTPayload: (token: string, host: string) => Promise<JWTValidationResult>;
let getJWTPayload: (token: string) => Promise<Record<string, unknown> | null>;

beforeEach(async () => {
  vi.stubEnv('VERIFIER_BASE_URL', ISSUER);
  vi.resetModules();
  const mod = await import('@/lib/utils/verifyJWT');
  decodeJWTPayload = mod.decodeJWTPayload;
  getJWTPayload = mod.getJWTPayload;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// decodeJWTPayload
describe('decodeJWTPayload', () => {
  it('returns invalid_format when token has fewer than 3 segments', async () => {
    const result = await decodeJWTPayload('bad.token', HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_format');
  });

  it('returns invalid_payload when the payload segment is not valid JSON', async () => {
    const bad = `header.${Buffer.from('not-json').toString('base64url')}.sig`;
    const result = await decodeJWTPayload(bad, HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_payload');
  });

  it('returns missing_exp when exp is absent', async () => {
    const result = await decodeJWTPayload(
      signJWT({ iss: ISSUER, sub: 'did:key:z6MkTest', aud: [HOST] }),
      HOST,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('missing_exp');
  });

  it('returns missing_exp when exp is not a number', async () => {
    const result = await decodeJWTPayload(signJWT(makePayload({ exp: 'soon' })), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('missing_exp');
  });

  it('returns token_expired for an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    const result = await decodeJWTPayload(signJWT(makePayload({ exp: past })), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('token_expired');
  });

  it('returns invalid_issuer when iss does not match env VERIFIER_BASE_URL', async () => {
    const result = await decodeJWTPayload(
      signJWT(makePayload({ iss: 'https://wrong-issuer.com' })),
      HOST,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_issuer');
  });

  it('accepts aud as a single string equal to the expected audience', async () => {
    mockFetchWithJWKS();
    const result = await decodeJWTPayload(signJWT(makePayload({ aud: HOST })), HOST);
    expect(result.valid).toBe(true);
  });

  it('returns invalid_audience when aud is a string that does not match', async () => {
    const result = await decodeJWTPayload(signJWT(makePayload({ aud: 'other.host' })), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_audience');
  });

  it('returns invalid_audience when the expected host is not in aud', async () => {
    const result = await decodeJWTPayload(signJWT(makePayload({ aud: ['other.host'] })), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_audience');
  });

  it('returns missing_sub when sub is absent', async () => {
    const result = await decodeJWTPayload(
      signJWT({ iss: ISSUER, aud: [HOST], exp: FUTURE_EXP }),
      HOST,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('missing_sub');
  });

  // --- verifyRS256Signature branches ---

  it('returns invalid_signature when the JWT header is not valid base64/JSON', async () => {
    // Parts count is 3 and payload decodes fine; only the header decode fails
    const body = Buffer.from(JSON.stringify(makePayload())).toString('base64url');
    const result = await decodeJWTPayload(`!@#invalid.${body}.sig`, HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when alg is not RS256', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: KID })).toString('base64url');
    const body = Buffer.from(JSON.stringify(makePayload())).toString('base64url');
    const result = await decodeJWTPayload(`${header}.${body}.fakesig`, HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when kid is missing from the header', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(makePayload())).toString('base64url');
    const result = await decodeJWTPayload(`${header}.${body}.fakesig`, HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when JWKS fetch returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await decodeJWTPayload(signJWT(makePayload()), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when JWKS fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await decodeJWTPayload(signJWT(makePayload()), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when kid is not found in the JWKS', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ keys: [] }) }),
    );
    const result = await decodeJWTPayload(signJWT(makePayload()), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when the JWK in JWKS is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [{ kty: 'RSA', kid: KID, n: '!!bad!!', e: '!!bad!!' }] }),
      }),
    );
    const result = await decodeJWTPayload(signJWT(makePayload()), HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns invalid_signature when the signature has been tampered with', async () => {
    mockFetchWithJWKS();
    const [h, p] = signJWT(makePayload()).split('.');
    const result = await decodeJWTPayload(`${h}.${p}.tampered-signature`, HOST);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  it('returns valid: true with payload for a fully valid token', async () => {
    mockFetchWithJWKS();
    const payload = makePayload();
    const result = await decodeJWTPayload(signJWT(payload), HOST);
    expect(result.valid).toBe(true);
    expect(result.payload.sub).toBe(payload.sub);
    expect(result.error).toBeUndefined();
  });

  // --- JWKS cache behaviour ---

  it('does not re-fetch JWKS on subsequent calls within the TTL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeJWKS() });
    vi.stubGlobal('fetch', mockFetch);
    const token = signJWT(makePayload());

    await decodeJWTPayload(token, HOST);
    await decodeJWTPayload(token, HOST);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('re-fetches JWKS after the 1-hour TTL expires', async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeJWKS() });
    vi.stubGlobal('fetch', mockFetch);
    const token = signJWT(makePayload());

    await decodeJWTPayload(token, HOST); // cold cache — fetches
    vi.advanceTimersByTime(61 * 60 * 1000); // advance 61 min past the 1 h TTL
    await decodeJWTPayload(token, HOST); // cache stale — re-fetches

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// getJWTPayload
describe('getJWTPayload', () => {
  it('returns null for a token with fewer than 3 segments', async () => {
    expect(await getJWTPayload('bad')).toBeNull();
  });

  it('returns null when the payload segment is not valid JSON', async () => {
    const bad = `h.${Buffer.from('not-json').toString('base64url')}.sig`;
    expect(await getJWTPayload(bad)).toBeNull();
  });

  it('returns null when exp is not a number', async () => {
    expect(await getJWTPayload(signJWT(makePayload({ exp: 'soon' })))).toBeNull();
  });

  it('returns null for an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(await getJWTPayload(signJWT(makePayload({ exp: past })))).toBeNull();
  });

  it('returns null when signature verification fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await getJWTPayload(signJWT(makePayload()))).toBeNull();
  });

  it('returns the decoded payload for a valid token', async () => {
    mockFetchWithJWKS();
    const payload = makePayload();
    const result = await getJWTPayload(signJWT(payload));
    expect(result).not.toBeNull();
    expect(result?.sub).toBe(payload.sub);
  });
});
