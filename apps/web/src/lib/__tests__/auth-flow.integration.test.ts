// @vitest-environment node
// INTEGRATION test of the full OIDC flow: qr.ts (Server Action) -> callback route -> verifyJWT -> iron-session creation -> middleware reading the cookie. Unlike unit tests (which mock each function separately), only the real network boundary (`fetch`) and Next's cookie jar (`next/headers`) are mocked here. The rest -- iron-session serialization/deserialization, RS256 verification, cookie reading in the middleware -- runs with the real code of all 5 layers.
import crypto from 'node:crypto';

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const APP_URL = 'https://app.example.com';
const ISSUER = 'https://test-verifier.example.com';
const HOST = 'app.example.com';

// Cookie jar shared between "requests" (qr.ts, callback route) to simulate the real browser <-> server roundtrip: what one step writes, the next reads.
const cookieStore = vi.hoisted(() => new Map<string, { value: string }>());

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value });
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
}));

// Test RSA key to sign JWTs as the real VCVerifier would (same pattern as src/lib/utils/__tests__/verifyJWT.test.ts).
const KID = 'test-key-id';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

function signJWT(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT', kid: KID });
  const body = encode(payload);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(privateKey, 'base64url')}`;
}

function makeJWKS() {
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return { keys: [{ ...jwk, kid: KID, use: 'sig', alg: 'RS256' }] };
}

const QR_HTML = '<img src="data:image/png;base64,AAAA">';

function stubEnv() {
  vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));
  vi.stubEnv('VERIFIER_BASE_URL', ISSUER);
  vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL);
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com');
}

beforeEach(async () => {
  cookieStore.clear();
  stubEnv();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('flujo de autenticacion OIDC (qr -> callback -> verifyJWT -> sesion -> middleware)', () => {
  it('completa el login: crea la cookie de sesion y el middleware la acepta', async () => {
    const did = 'did:key:z6MkTest';
    const orgId = 'urn:ngsi-ld:organization:org-1';
    const accessToken = signJWT({
      iss: ISSUER,
      sub: did,
      aud: ['tmf-api'],
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/api/v2/loginQR')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
          text: async () => QR_HTML,
        };
      }
      if (url.endsWith('/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: accessToken }) };
      }
      if (url.includes('/.well-known/jwks')) {
        return { ok: true, status: 200, json: async () => makeJWKS() };
      }
      if (url.includes('/tmf-api/party/v4/organization')) {
        // Login only resolves the organization by DID: it no longer queries or creates `Individual`.
        return {
          ok: true,
          status: 200,
          json: async () => [{ id: orgId, partyCharacteristic: [{ name: 'did', value: did }] }],
        };
      }
      throw new Error(`fetch inesperado en el test: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    // --- Step 1: qr.ts (Server Action) creates the state and the ds-oauth-pending cookie ---
    const { fetchVerifierQR } = await import('@/lib/services/qr');
    const qr = await fetchVerifierQR(`${APP_URL}/auth/callback`);
    expect(qr.ok).toBe(true);
    expect(cookieStore.get('ds-oauth-pending')?.value).toBeTruthy();

    // loginQR no longer sends `nonce` (the connector report does not list it) and the parameters (including redirect_uri) travel encoded.
    const qrUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(qrUrl.searchParams.has('nonce')).toBe(false);
    expect(qrUrl.searchParams.get('state')).toBe(qr.state);
    expect(qrUrl.searchParams.get('redirect_uri')).toBe(`${APP_URL}/auth/callback`);
    expect(qrUrl.search).toContain('redirect_uri=http');
    expect(qrUrl.search).toContain('%2Fauth%2Fcallback');

    // --- Step 2: callback route validates the state, exchanges the code and creates the session ---
    const { GET } = await import('@/app/(public)/auth/callback/route');
    const callbackReq = new NextRequest(
      `${APP_URL}/auth/callback?state=${qr.state}&code=auth-code-123`,
    );
    const callbackRes = await GET(callbackReq);

    expect(callbackRes.status).toBe(307);
    expect(callbackRes.headers.get('location')).toBe(`${APP_URL}/dashboard`);
    const sealedSession = cookieStore.get('ds-session')?.value;
    expect(sealedSession).toBeTruthy();

    // --- Step 3: the middleware reads that same cookie on the next request ---
    const { middleware } = await import('@/middleware');
    const dashboardReq = new NextRequest(`${APP_URL}/dashboard`, {
      headers: { cookie: `ds-session=${sealedSession}` },
    });
    const middlewareRes = await middleware(dashboardReq);

    expect(middlewareRes.headers.get('location')).toBeNull();
  });

  it('rechaza un state CSRF que no coincide y no crea sesion (middleware sigue exigiendo login)', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/api/v2/loginQR')) {
        return {
          ok: true,
          status: 200,
          headers: { get: (h: string) => (h === 'content-type' ? 'text/html' : null) },
          text: async () => QR_HTML,
        };
      }
      throw new Error(`fetch inesperado en el test: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchVerifierQR } = await import('@/lib/services/qr');
    await fetchVerifierQR(`${APP_URL}/auth/callback`);

    const { GET } = await import('@/app/(public)/auth/callback/route');
    const callbackReq = new NextRequest(
      `${APP_URL}/auth/callback?state=un-state-que-no-coincide&code=auth-code-123`,
    );
    const callbackRes = await GET(callbackReq);

    expect(callbackRes.status).toBe(307);
    expect(callbackRes.headers.get('location')).toBe(`${APP_URL}/inicio-sesion?error=invalid_state`);
    expect(cookieStore.get('ds-session')).toBeUndefined();

    // Without the ds-session cookie, the middleware redirects unauthenticated users to login.
    const { middleware } = await import('@/middleware');
    const dashboardReq = new NextRequest(`${APP_URL}/dashboard`);
    const middlewareRes = await middleware(dashboardReq);

    expect(middlewareRes.status).toBe(307);
    expect(middlewareRes.headers.get('location')).toBe(`${APP_URL}/inicio-sesion`);
  });

  it('el middleware redirige y borra la cookie cuando el JWT de la sesion ya expiro', async () => {
    // This case exercises session.ts + middleware.ts directly: an expired JWT would never pass decodeJWTPayload in the callback (token_expired error), so the only real way to have a session with an expired token is for it to expire *after* creation -- simulated by sealing the session with an already expired token.
    const { createAuthenticatedSession } = await import('@/lib/session');
    const expiredToken = signJWT({
      iss: ISSUER,
      sub: 'did:key:z6MkTest',
      aud: [HOST],
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    await createAuthenticatedSession(expiredToken, null);

    const sealedSession = cookieStore.get('ds-session')?.value;
    expect(sealedSession).toBeTruthy();

    const { middleware } = await import('@/middleware');
    const dashboardReq = new NextRequest(`${APP_URL}/dashboard`, {
      headers: { cookie: `ds-session=${sealedSession}` },
    });
    const middlewareRes = await middleware(dashboardReq);

    expect(middlewareRes.status).toBe(307);
    expect(middlewareRes.headers.get('location')).toBe(
      `${APP_URL}/inicio-sesion?error=session_expired`,
    );
    expect(middlewareRes.cookies.get('ds-session')?.value ?? '').toBe('');
  });
});
