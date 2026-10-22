// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/backendCredential', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services/backendCredential')>()),
  getMarketplaceCredential: vi.fn(),
  resetBackendCredentialCache: vi.fn(),
}));

import {
  getMarketplaceCredential,
  resetBackendCredentialCache,
} from '@/lib/services/backendCredential';
import { fetchProviderQuota, resetQuotaTokenCache } from '@/lib/services/quotaClient';

const endpoints = {
  contractBase: 'https://contract.provider02.dataspace.es',
  verifierBase: 'https://verifier.provider02.dataspace.es',
};
const req = {
  endpoints,
  consumerDid: 'did:web:consumer02.dataspace.es',
  offerId: 'provider02-httpbin-cuota',
};
const TOKEN_URL = `${endpoints.verifierBase}/services/quota/token`;
const QUOTA_URL = `${endpoints.contractBase}/quota/did:web:consumer02.dataspace.es/provider02-httpbin-cuota`;

const QUOTA_BODY = {
  allowed: true,
  bytes_cap: 51200,
  bytes_consumed: 10,
  bytes_ok: true,
  bytes_remaining: 51190,
  requests_cap: 20,
  requests_consumed: 1,
  requests_ok: true,
  requests_remaining: 19,
};

const res = (data: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(JSON.stringify(data)),
});

type Handler = (url: string, init?: RequestInit) => ReturnType<typeof res>;
function installFetch(handler: Handler) {
  const mock = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

beforeEach(() => {
  resetQuotaTokenCache();
  vi.mocked(getMarketplaceCredential).mockResolvedValue('CREDENTIAL');
  vi.mocked(resetBackendCredentialCache).mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('fetchProviderQuota', () => {
  it('pide token quota con la credencial y consulta con GET y Bearer', async () => {
    const fetchMock = installFetch((url) =>
      url === TOKEN_URL ? res({ access_token: 'qt' }) : res(QUOTA_BODY),
    );
    const quota = await fetchProviderQuota(req);
    expect(quota).toMatchObject({ bytesCap: 51200, requestsCap: 20 });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe(TOKEN_URL);
    const form = new URLSearchParams(String(tokenInit?.body));
    expect(form.get('grant_type')).toBe('vp_token');
    expect(form.get('scope')).toBe('default');
    expect(form.get('vp_token')).toBe('CREDENTIAL');

    const [quotaUrl, quotaInit] = fetchMock.mock.calls[1];
    expect(quotaUrl).toBe(QUOTA_URL);
    expect(quotaInit?.method).toBe('GET');
    expect((quotaInit?.headers as Record<string, string>).Authorization).toBe('Bearer qt');
    expect(quotaInit?.redirect).toBe('manual');
  });

  it('cachea el token por provider', async () => {
    const fetchMock = installFetch((url) =>
      url === TOKEN_URL ? res({ access_token: 'qt', expires_in: 1800 }) : res(QUOTA_BODY),
    );
    await fetchProviderQuota(req);
    await fetchProviderQuota(req);
    expect(fetchMock.mock.calls.filter(([u]) => u === TOKEN_URL)).toHaveLength(1);
  });

  it('ante 401 descarta el token y reintenta una vez', async () => {
    let quotaCalls = 0;
    const fetchMock = installFetch((url) => {
      if (url === TOKEN_URL) return res({ access_token: `qt${fetchMock.mock.calls.length}` });
      quotaCalls += 1;
      return quotaCalls === 1 ? res({}, 401) : res(QUOTA_BODY);
    });
    await expect(fetchProviderQuota(req)).resolves.toMatchObject({ allowed: true });
    expect(fetchMock.mock.calls.filter(([u]) => u === TOKEN_URL)).toHaveLength(2);
    expect(resetBackendCredentialCache).not.toHaveBeenCalled();
  });

  it('con 401 persistente renueva la credencial y falla tras 3 intentos', async () => {
    const fetchMock = installFetch((url) =>
      url === TOKEN_URL ? res({ access_token: 'qt' }) : res({}, 401),
    );
    await expect(fetchProviderQuota(req)).rejects.toThrow('Quota (quota): HTTP 401');
    expect(fetchMock.mock.calls.filter(([u]) => u === QUOTA_URL)).toHaveLength(3);
    expect(resetBackendCredentialCache).toHaveBeenCalledTimes(1);
  });

  it('un 403 no se reintenta y el error no incluye el cuerpo', async () => {
    const fetchMock = installFetch((url) =>
      url === TOKEN_URL ? res({ access_token: 'qt' }) : res({ secret: 'CREDENTIAL' }, 403),
    );
    const error = await fetchProviderQuota(req).catch((e: Error) => e);
    expect((error as Error).message).toBe('Quota (quota): HTTP 403');
    expect(fetchMock.mock.calls.filter(([u]) => u === QUOTA_URL)).toHaveLength(1);
  });

  it('falla si el token no trae access_token y no filtra la credencial en el error', async () => {
    installFetch(() => res({}));
    const error = await fetchProviderQuota(req).catch((e: Error) => e);
    expect((error as Error).message).toContain('sin access_token');
    expect((error as Error).message).not.toContain('CREDENTIAL');
  });

  it('valida DID y offerId antes de hacer red', async () => {
    const fetchMock = installFetch(() => res({}));
    await expect(fetchProviderQuota({ ...req, consumerDid: 'did:web:a/../b' })).rejects.toThrow(
      'DID',
    );
    await expect(fetchProviderQuota({ ...req, offerId: '../x' })).rejects.toThrow('oferta');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza cuerpos que no son JSON o no tienen la forma esperada', async () => {
    installFetch((url) =>
      url === TOKEN_URL ? res({ access_token: 'qt' }) : res({ allowed: true }),
    );
    await expect(fetchProviderQuota(req)).rejects.toThrow('no válida');
  });
});
