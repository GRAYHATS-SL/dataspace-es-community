// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assertBackendCredentialConfigured,
  backendPatchOrderState,
  getBackendToken,
  getMarketplaceCredential,
  resetBackendCredentialCache,
} from '@/lib/services/backendCredential';

const ISSUER = 'https://issuer.marketplacev2.dataspace.es/realms/dataspace';
const VERIFIER_TOKEN = 'https://verifier.marketplacev2.dataspace.es/services/tmf-api/token';
const ORDER_ID = 'urn:ngsi-ld:product-order:ord-1';

function jwt(exp: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64({ exp })}.sig`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

function json(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

let credentialValue: string;
let backendTokenValue: string;

/** Mocks issuer + verifier + TMF; `overrides` change responses per URL. */
function installFetch(overrides: Record<string, () => ReturnType<typeof json>> = {}) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<ReturnType<typeof json>>>(
    async (url) => {
      const override = Object.entries(overrides).find(([k]) => url.startsWith(k));
      if (override) return override[1]();
      if (url === `${ISSUER}/protocol/openid-connect/token`) {
        return json({ access_token: 'tok', authorization_details: [] });
      }
      if (url.startsWith(`${ISSUER}/protocol/oid4vc/create-credential-offer`)) {
        return json({ issuer: 'https://issuer.test/offers/', nonce: 'n1' });
      }
      if (url === 'https://issuer.test/offers/n1') {
        return json({
          grants: {
            'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
              'pre-authorized_code': 'code-1',
            },
          },
        });
      }
      if (url === `${ISSUER}/protocol/oid4vc/credential`) {
        return json({ credentials: [{ credential: credentialValue }] });
      }
      if (url === VERIFIER_TOKEN) return json({ access_token: backendTokenValue });
      if (url.includes('/productOrder/')) return json({ id: ORDER_ID, state: 'completed' });
      throw new Error(`unexpected url ${url}`);
    },
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const calls = (m: ReturnType<typeof installFetch>, prefix: string) =>
  m.mock.calls.filter(([u]) => String(u).startsWith(prefix));

beforeEach(() => {
  resetBackendCredentialCache();
  vi.stubEnv('MARKETPLACE_BACKEND_USER', 'svc-user');
  vi.stubEnv('MARKETPLACE_BACKEND_PASSWORD', 'svc-pass');
  vi.stubEnv('API_BASE_URL', 'https://tmf.test');
  credentialValue = `${jwt(nowSec() + 3600)}~disclosure~`;
  backendTokenValue = jwt(nowSec() + 1800);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('getMarketplaceCredential', () => {
  it('runs the 5-step flow and returns the SD-JWT', async () => {
    const f = installFetch();
    expect(await getMarketplaceCredential()).toBe(credentialValue);

    const urls = f.mock.calls.map(([u]) => String(u));
    expect(urls).toHaveLength(5);
    expect(urls[0]).toBe(`${ISSUER}/protocol/openid-connect/token`);
    expect(urls[1]).toContain(
      'create-credential-offer?credential_configuration_id=marketplace-credential&pre_authorized=true',
    );
    expect(urls[2]).toBe('https://issuer.test/offers/n1');
    expect(urls[3]).toBe(`${ISSUER}/protocol/openid-connect/token`);
    expect(urls[4]).toBe(`${ISSUER}/protocol/oid4vc/credential`);

    const step1 = new URLSearchParams(String(f.mock.calls[0][1]?.body));
    expect(step1.get('grant_type')).toBe('password');
    expect(step1.get('client_id')).toBe('dsc-holder');
    expect(step1.get('scope')).toBe('openid');
    const step4 = new URLSearchParams(String(f.mock.calls[3][1]?.body));
    expect(step4.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:pre-authorized_code');
    expect(step4.get('pre-authorized_code')).toBe('code-1');
    expect(JSON.parse(String(f.mock.calls[4][1]?.body))).toEqual({
      credential_configuration_id: 'marketplace-credential',
    });
  });

  it('uses credential_identifier when the token response provides one', async () => {
    const f = installFetch();
    let n = 0;
    f.mockImplementationOnce(async () => json({ access_token: 'tok' })); // step 1
    f.mockImplementationOnce(async () =>
      json({ issuer: 'https://issuer.test/offers', nonce: 'n1' }),
    );
    f.mockImplementationOnce(async () =>
      json({
        grants: {
          'urn:ietf:params:oauth:grant-type:pre-authorized_code': { 'pre-authorized_code': 'c' },
        },
      }),
    );
    f.mockImplementationOnce(async () => {
      n++;
      return json({
        access_token: 'tok2',
        authorization_details: [{ credential_identifiers: ['cred-id'] }],
      });
    });
    f.mockImplementationOnce(async () => json({ credential: credentialValue }));
    expect(await getMarketplaceCredential()).toBe(credentialValue);
    expect(n).toBe(1);
    expect(JSON.parse(String(f.mock.calls[4][1]?.body))).toEqual({
      credential_identifier: 'cred-id',
    });
  });

  it('caches the credential and shares one issuance between concurrent calls', async () => {
    const f = installFetch();
    const [a, b] = await Promise.all([getMarketplaceCredential(), getMarketplaceCredential()]);
    await getMarketplaceCredential();
    expect(a).toBe(b);
    expect(f).toHaveBeenCalledTimes(5);
  });

  it('re-issues the credential once it is close to expiring', async () => {
    vi.useFakeTimers();
    const f = installFetch();
    await getMarketplaceCredential();
    vi.setSystemTime(Date.now() + 3600 * 1000 - 30 * 1000); // < 60 s margin
    credentialValue = `${jwt(nowSec() + 3600)}~new~`;
    expect(await getMarketplaceCredential()).toBe(credentialValue);
    expect(f).toHaveBeenCalledTimes(10);
  });

  it('throws a clear error without leaking secrets when env vars are missing', async () => {
    vi.stubEnv('MARKETPLACE_BACKEND_PASSWORD', '');
    const f = installFetch();
    const err = await getMarketplaceCredential().catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('MARKETPLACE_BACKEND_PASSWORD');
    expect((err as Error).message).not.toContain('svc-user');
    expect(f).not.toHaveBeenCalled();
  });

  it('reports the failing step and status only (no body)', async () => {
    installFetch({
      [`${ISSUER}/protocol/openid-connect/token`]: () => json({ error: 'svc-pass leaked' }, 401),
    });
    const err = (await getMarketplaceCredential().catch((e: Error) => e)) as Error;
    expect(err.message).toBe('Backend credential (user-token): HTTP 401');
  });

  it.each([
    ['user-token', { [`${ISSUER}/protocol/openid-connect/token`]: () => json({}) }],
    [
      'create-offer',
      { [`${ISSUER}/protocol/oid4vc/create-credential-offer`]: () => json({ issuer: 'x' }) },
    ],
    ['get-offer', { 'https://issuer.test/offers/n1': () => json({ grants: {} }) }],
    ['credential', { [`${ISSUER}/protocol/oid4vc/credential`]: () => json({ credentials: [] }) }],
  ])('fails when the %s step returns an incomplete response', async (step, overrides) => {
    installFetch(overrides);
    await expect(getMarketplaceCredential()).rejects.toThrow(step);
  });

  it('accepts a bare string in credentials[] and falls back to default TTL for non-JWT values', async () => {
    credentialValue = 'opaque-credential';
    const f = installFetch({
      [`${ISSUER}/protocol/oid4vc/credential`]: () => json({ credentials: ['opaque-credential'] }),
    });
    expect(await getMarketplaceCredential()).toBe('opaque-credential');
    await getMarketplaceCredential();
    expect(f).toHaveBeenCalledTimes(5);
  });

  it('fails if the pre-authorized token response has no access_token', async () => {
    const f = installFetch();
    f.mockImplementationOnce(async () => json({ access_token: 'tok' }));
    f.mockImplementationOnce(async () =>
      json({ issuer: 'https://issuer.test/offers', nonce: 'n1' }),
    );
    f.mockImplementationOnce(async () =>
      json({
        grants: {
          'urn:ietf:params:oauth:grant-type:pre-authorized_code': { 'pre-authorized_code': 'c' },
        },
      }),
    );
    f.mockImplementationOnce(async () => json({}));
    await expect(getMarketplaceCredential()).rejects.toThrow('preauth-token');
  });
});

describe('assertBackendCredentialConfigured', () => {
  it('does not throw when user and password are set', () => {
    expect(() => assertBackendCredentialConfigured()).not.toThrow();
  });

  it.each(['MARKETPLACE_BACKEND_USER', 'MARKETPLACE_BACKEND_PASSWORD'])(
    'throws a clear error without network when %s is missing',
    (name) => {
      vi.stubEnv(name, '');
      const f = installFetch();
      expect(() => assertBackendCredentialConfigured()).toThrow(name);
      expect(f).not.toHaveBeenCalled();
    },
  );
});

describe('getBackendToken', () => {
  it('posts vp_token with scope=backend and caches the token', async () => {
    const f = installFetch();
    expect(await getBackendToken()).toBe(backendTokenValue);
    await getBackendToken();

    const tokenCalls = calls(f, VERIFIER_TOKEN);
    expect(tokenCalls).toHaveLength(1);
    const init = tokenCalls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('vp_token');
    expect(body.get('scope')).toBe('backend');
    expect(body.get('vp_token')).toBe(credentialValue);
    // credential issued only once (5 steps) + 1 token
    expect(f).toHaveBeenCalledTimes(6);
  });

  it('renews the token near its exp but reuses the cached credential', async () => {
    vi.useFakeTimers();
    const f = installFetch();
    await getBackendToken();
    vi.setSystemTime(Date.now() + 1800 * 1000 - 30 * 1000);
    backendTokenValue = jwt(nowSec() + 1800);
    expect(await getBackendToken()).toBe(backendTokenValue);
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(2);
    expect(calls(f, `${ISSUER}/protocol/oid4vc/credential`)).toHaveLength(1);
  });

  it('uses expires_in when the token is not a readable JWT', async () => {
    backendTokenValue = 'opaque';
    const f = installFetch({
      [VERIFIER_TOKEN]: () => json({ access_token: 'opaque', expires_in: 1800 }),
    });
    await getBackendToken();
    await getBackendToken();
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(1);
  });

  it('falls back to a default TTL with neither exp nor expires_in', async () => {
    const f = installFetch({ [VERIFIER_TOKEN]: () => json({ access_token: 'opaque' }) });
    await getBackendToken();
    await getBackendToken();
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(1);
  });

  it('shares one request between concurrent calls', async () => {
    const f = installFetch();
    await Promise.all([getBackendToken(), getBackendToken()]);
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(1);
  });

  it('fails when the verifier rejects or returns no access_token', async () => {
    installFetch({ [VERIFIER_TOKEN]: () => json({ error: 'x' }, 400) });
    await expect(getBackendToken()).rejects.toThrow('backend-token');
    resetBackendCredentialCache();
    installFetch({ [VERIFIER_TOKEN]: () => json({}) });
    await expect(getBackendToken()).rejects.toThrow('sin access_token');
  });
});

describe('backendPatchOrderState', () => {
  it('PATCHes the order with application/json and only { state }', async () => {
    const f = installFetch();
    const order = await backendPatchOrderState(ORDER_ID, 'completed');
    expect(order.state).toBe('completed');

    const [url, init] = calls(f, 'https://tmf.test')[0];
    expect(url).toBe(
      `https://tmf.test/tmf-api/productOrderingManagement/v4/productOrder/${ORDER_ID}`,
    );
    const req = init as RequestInit;
    expect(req.method).toBe('PATCH');
    expect(req.body).toBe(JSON.stringify({ state: 'completed' }));
    const headers = req.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe(`Bearer ${backendTokenValue}`);
  });

  it('sends cancelled and never uses DELETE', async () => {
    const f = installFetch();
    await backendPatchOrderState(ORDER_ID, 'cancelled');
    expect(
      f.mock.calls.every(([, init]) => (init as RequestInit | undefined)?.method !== 'DELETE'),
    ).toBe(true);
    expect(JSON.parse(String(calls(f, 'https://tmf.test')[0][1]?.body))).toEqual({
      state: 'cancelled',
    });
  });

  it('reuses the cached token across PATCHes', async () => {
    const f = installFetch();
    await backendPatchOrderState(ORDER_ID, 'completed');
    await backendPatchOrderState(ORDER_ID, 'cancelled');
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(1);
    expect(calls(f, 'https://tmf.test')).toHaveLength(2);
  });

  it('retries once with fresh credentials after a 401', async () => {
    const f = installFetch();
    let first = true;
    const base = f.getMockImplementation()!;
    f.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/productOrder/') && first) {
        first = false;
        return json({}, 401);
      }
      return base(url, init);
    });
    await backendPatchOrderState(ORDER_ID, 'completed');
    expect(calls(f, 'https://tmf.test')).toHaveLength(2);
    expect(calls(f, VERIFIER_TOKEN)).toHaveLength(2);
  });

  it('throws HTTP status and body for non-401 failures', async () => {
    installFetch({ 'https://tmf.test': () => json({ detail: 'forbidden' }, 403) });
    await expect(backendPatchOrderState(ORDER_ID, 'completed')).rejects.toThrow('HTTP 403');
  });

  it('rejects malformed ids before any request', async () => {
    const f = installFetch();
    await expect(backendPatchOrderState('../x?y', 'completed')).rejects.toThrow('no válido');
    expect(f).not.toHaveBeenCalled();
  });

  it('fails clearly without API_BASE_URL', async () => {
    vi.stubEnv('API_BASE_URL', '');
    installFetch();
    await expect(backendPatchOrderState(ORDER_ID, 'completed')).rejects.toThrow('API_BASE_URL');
  });
});
