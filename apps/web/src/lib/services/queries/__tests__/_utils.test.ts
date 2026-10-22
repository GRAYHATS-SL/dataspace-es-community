// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted — must appear before the imports it affects
vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  apiFetch,
  apiFetchAll,
  apiFetchPublic,
  apiFetchPublicAll,
  apiFetchVoid,
  deduplicateById,
  filterAsBuyer,
  filterAsSeller,
  filterByRelatedParty,
  getCurrentUserAuthorId,
  getCurrentUserDid,
  injectRelatedParty,
  withLimit,
} from '@/lib/services/queries/_utils';
import { getSession } from '@/lib/session';
import type { RelatedParty } from '@/types/api';

const ORG_ID = 'org-123';

/** Minimal valid RelatedParty for test fixtures. */
function rp(id: string, role: string): RelatedParty {
  return { id, role, '@referredType': 'Organization' };
}

function mockSession(
  overrides: {
    organizationId?: string;
    organizationName?: string;
    sub?: string;
    email?: string;
  } = {},
) {
  vi.mocked(getSession).mockResolvedValue({
    userProfile: { organizationId: ORG_ID, sub: 'did:key:test', ...overrides },
  } as Awaited<ReturnType<typeof getSession>>);
}

beforeEach(() => mockSession());

// filterByRelatedParty
describe('filterByRelatedParty', () => {
  it('returns only items that belong to the current org as provider', async () => {
    const items = [
      { id: '1', relatedParty: [rp(ORG_ID, 'provider')] },
      { id: '2', relatedParty: [rp('other-org', 'provider')] },
    ];
    expect(await filterByRelatedParty(items)).toEqual([items[0]]);
  });

  it('also accepts the legacy "owner" role', async () => {
    const items = [{ id: '1', relatedParty: [rp(ORG_ID, 'owner')] }];
    expect(await filterByRelatedParty(items)).toEqual(items);
  });

  it('returns empty array when no item belongs to the current org', async () => {
    const items = [{ id: '1', relatedParty: [rp('other-org', 'provider')] }];
    expect(await filterByRelatedParty(items)).toEqual([]);
  });

  it('throws when organizationId is missing from session', async () => {
    mockSession({ organizationId: undefined });
    await expect(filterByRelatedParty([])).rejects.toThrow('organizationId');
  });
});

// injectRelatedParty
describe('injectRelatedParty', () => {
  it('adds a relatedParty entry with role provider when none exists', async () => {
    const result = await injectRelatedParty({ relatedParty: undefined });
    expect(result.relatedParty).toEqual([rp(ORG_ID, 'provider')]);
  });

  it('appends to an existing relatedParty array', async () => {
    const result = await injectRelatedParty({ relatedParty: [rp('other-org', 'buyer')] });
    expect(result.relatedParty).toHaveLength(2);
    expect(result.relatedParty).toContainEqual(rp(ORG_ID, 'provider'));
  });

  it('does not add a duplicate when the org is already present', async () => {
    const result = await injectRelatedParty({ relatedParty: [rp(ORG_ID, 'provider')] });
    expect(result.relatedParty).toHaveLength(1);
  });

  it('includes the organization name from the session when available', async () => {
    mockSession({ organizationName: 'GrayHats - Provider 02' });
    const result = await injectRelatedParty({ relatedParty: undefined });
    expect(result.relatedParty).toEqual([
      expect.objectContaining({ id: ORG_ID, name: 'GrayHats - Provider 02', role: 'provider' }),
    ]);
  });

  it('omits the name for sessions that do not carry it', async () => {
    const result = await injectRelatedParty({ relatedParty: undefined });
    expect(result.relatedParty?.[0]).not.toHaveProperty('name');
  });

  it('does not mutate the original payload', async () => {
    const payload: { relatedParty?: RelatedParty[] } = {};
    const result = await injectRelatedParty(payload);
    expect(payload.relatedParty).toBeUndefined();
    expect(result.relatedParty).toHaveLength(1);
  });
});

// filterAsBuyer
describe('filterAsBuyer', () => {
  it('returns only items where the org is the buyer', async () => {
    const items = [
      { id: '1', relatedParty: [rp(ORG_ID, 'buyer')] },
      { id: '2', relatedParty: [rp(ORG_ID, 'seller')] },
    ];
    expect(await filterAsBuyer(items)).toEqual([items[0]]);
  });

  it('accepts the v2 Customer role and is case-insensitive', async () => {
    const items = [
      { id: '1', relatedParty: [rp(ORG_ID, 'Customer')] },
      { id: '2', relatedParty: [rp(ORG_ID, 'BUYER')] },
      { id: '3', relatedParty: [rp(ORG_ID, 'seller')] },
    ];
    expect(await filterAsBuyer(items)).toEqual([items[0], items[1]]);
  });

  it('returns empty array when the org is not a buyer in any item', async () => {
    const items = [{ id: '1', relatedParty: [rp('other', 'buyer')] }];
    expect(await filterAsBuyer(items)).toEqual([]);
  });
});

// filterAsSeller
describe('filterAsSeller', () => {
  it('returns only items where the org is the seller', async () => {
    const items = [
      { id: '1', relatedParty: [rp(ORG_ID, 'seller')] },
      { id: '2', relatedParty: [rp(ORG_ID, 'buyer')] },
    ];
    expect(await filterAsSeller(items)).toEqual([items[0]]);
  });

  it('returns empty array when the org is not a seller in any item', async () => {
    const items = [{ id: '1', relatedParty: [rp('other', 'seller')] }];
    expect(await filterAsSeller(items)).toEqual([]);
  });
});

// deduplicateById
describe('deduplicateById', () => {
  it('removes duplicate entries keeping the first occurrence', () => {
    const items = [{ id: 'a', name: 'first' }, { id: 'a', name: 'second' }, { id: 'b' }];
    const result = deduplicateById(items);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('first');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateById([])).toEqual([]);
  });
});

// withLimit
describe('withLimit', () => {
  it('appends ?limit=N to a path without existing query params', () => {
    expect(withLimit('/catalog', 100)).toBe('/catalog?limit=100');
  });

  it('appends &limit=N when query params already exist', () => {
    expect(withLimit('/catalog?foo=bar', 100)).toBe('/catalog?foo=bar&limit=100');
  });

  it('defaults to limit=1000', () => {
    expect(withLimit('/catalog')).toBe('/catalog?limit=1000');
  });
});

// getCurrentUserDid
describe('getCurrentUserDid', () => {
  it('returns the sub (DID) from the active session', async () => {
    mockSession({ sub: 'did:key:zDna123' });
    expect(await getCurrentUserDid()).toBe('did:key:zDna123');
  });

  it('throws when sub is missing from the session profile', async () => {
    mockSession({ sub: undefined });
    await expect(getCurrentUserDid()).rejects.toThrow('No authenticated user DID');
  });
});

// getCurrentUserAuthorId
describe('getCurrentUserAuthorId', () => {
  const originalSecret = process.env.TOKEN_SECRET;

  beforeEach(() => {
    process.env.TOKEN_SECRET = 'a-very-long-shared-secret-used-only-in-tests';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.TOKEN_SECRET;
    else process.env.TOKEN_SECRET = originalSecret;
  });

  it('devuelve un HMAC hexadecimal estable derivado del email de la sesión', async () => {
    mockSession({ email: 'ana@empresa.com' });
    const first = await getCurrentUserAuthorId();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain('ana@empresa.com');
    expect(await getCurrentUserAuthorId()).toBe(first);
  });

  it('normaliza mayúsculas y espacios del email', async () => {
    mockSession({ email: 'ana@empresa.com' });
    const base = await getCurrentUserAuthorId();
    mockSession({ email: '  Ana@Empresa.COM ' });
    expect(await getCurrentUserAuthorId()).toBe(base);
  });

  it('distingue emails distintos', async () => {
    mockSession({ email: 'ana@empresa.com' });
    const a = await getCurrentUserAuthorId();
    mockSession({ email: 'luis@empresa.com' });
    expect(await getCurrentUserAuthorId()).not.toBe(a);
  });

  it('lanza si falta el email en el perfil de sesión', async () => {
    mockSession({ email: undefined });
    await expect(getCurrentUserAuthorId()).rejects.toThrow('No email en la sesión');
  });

  it('lanza si falta TOKEN_SECRET', async () => {
    delete process.env.TOKEN_SECRET;
    mockSession({ email: 'ana@empresa.com' });
    await expect(getCurrentUserAuthorId()).rejects.toThrow('TOKEN_SECRET');
  });
});

// apiFetch — branch coverage: mockSession() does NOT set accessToken, so token is always undefined here. That covers the false branch of `if (token)` on line 233.
describe('apiFetch', () => {
  it('makes a request without Authorization header when session has no token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve(''),
    });
    await apiFetch('/test-path');
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init as RequestInit).headers as Record<string, string>).not.toHaveProperty(
      'Authorization',
    );
  });

  it('uses the explicit bearerToken parameter over the session token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    });
    await apiFetch('/test-path', undefined, 'explicit-token');
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init as RequestInit).headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer explicit-token',
    });
  });

  it('falls back to statusText when res.text() rejects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.reject(new Error('stream closed')),
    });
    await expect(apiFetch('/test-path')).rejects.toThrow('HTTP 503');
  });
});

// apiFetchVoid — branch coverage: same setup, no accessToken in session → false branch of `if (accessToken)`.
describe('apiFetchVoid', () => {
  it('makes a void request without Authorization header when session has no token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });
    await apiFetchVoid('/test-path', { method: 'DELETE' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init as RequestInit).headers as Record<string, string>).not.toHaveProperty(
      'Authorization',
    );
  });

  it('throws on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });
    await expect(apiFetchVoid('/test-path', { method: 'DELETE' })).rejects.toThrow('HTTP 500');
  });

  it('falls back to statusText when res.text() rejects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: () => Promise.reject(new Error('stream closed')),
    });
    await expect(apiFetchVoid('/test-path', { method: 'DELETE' })).rejects.toThrow('HTTP 502');
  });
});

// apiFetchPublic — anonymous, does not read the session or send Authorization
describe('apiFetchPublic', () => {
  it('resolves the response JSON without reading the session or sending Authorization', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1' }]),
      text: () => Promise.resolve(''),
    });
    vi.mocked(getSession).mockClear();
    const result = await apiFetchPublic('/test-path');
    expect(result).toEqual([{ id: '1' }]);
    expect(getSession).not.toHaveBeenCalled();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect((init as RequestInit).headers as Record<string, string>).not.toHaveProperty(
      'Authorization',
    );
  });

  it('throws on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });
    await expect(apiFetchPublic('/test-path')).rejects.toThrow('HTTP 500');
  });

  it('falls back to statusText when res.text() rejects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.reject(new Error('stream closed')),
    });
    await expect(apiFetchPublic('/test-path')).rejects.toThrow('HTTP 503');
  });
});

const pageResponse = (data: unknown[], status: number, total?: number) => ({
  ok: true,
  status,
  headers: new Headers(total === undefined ? {} : { 'X-Total-Count': String(total) }),
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(''),
});

// apiFetchPublicAll — 206 pagination / X-Total-Count
describe('apiFetchPublicAll', () => {
  it('returns a single page when the backend answers 200', async () => {
    global.fetch = vi.fn().mockResolvedValue(pageResponse([{ id: '1' }], 200));
    const result = await apiFetchPublicAll('/x?lifecycleStatus=Launched');
    expect(result).toEqual([{ id: '1' }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/x?lifecycleStatus=Launched&limit=100&offset=0'),
      expect.anything(),
    );
  });

  it('follows 206 pages advancing offset until X-Total-Count is reached', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }, { id: '2' }], 206, 3))
      .mockResolvedValueOnce(pageResponse([{ id: '3' }], 206, 3));
    const result = await apiFetchPublicAll('/x');
    expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(global.fetch).mock.calls[1][0]).toContain('offset=2');
  });

  it('stops on an empty page even if X-Total-Count is not reached', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }], 206, 5))
      .mockResolvedValueOnce(pageResponse([], 206, 5));
    const result = await apiFetchPublicAll('/x');
    expect(result).toEqual([{ id: '1' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('propagates HTTP errors from any page', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }], 206, 2))
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });
    await expect(apiFetchPublicAll('/x')).rejects.toThrow('HTTP 404');
  });
});

// Required environment variables
describe('required env vars', () => {
  it('apiFetch throws when API_BASE_URL is missing', async () => {
    vi.stubEnv('API_BASE_URL', '');
    await expect(apiFetch('/x')).rejects.toThrow('No se ha definido API_BASE_URL');
    vi.unstubAllEnvs();
  });

  it('apiFetchVoid throws when API_BASE_URL is missing', async () => {
    vi.stubEnv('API_BASE_URL', '');
    await expect(apiFetchVoid('/x')).rejects.toThrow('No se ha definido API_BASE_URL');
    vi.unstubAllEnvs();
  });

  it('apiFetchPublic throws when CATALOG_PUBLIC_API_BASE_URL is missing', async () => {
    vi.stubEnv('CATALOG_PUBLIC_API_BASE_URL', '');
    await expect(apiFetchPublic('/x')).rejects.toThrow(
      'No se ha definido CATALOG_PUBLIC_API_BASE_URL',
    );
    vi.unstubAllEnvs();
  });
});

// apiFetchAll — authenticated 206 pagination
describe('apiFetchAll', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE_URL', 'https://api.test');
    vi.mocked(getSession).mockResolvedValue({ accessToken: 'tok' } as never);
  });

  it('returns a single page on 200 and sends the Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue(pageResponse([{ id: '1' }], 200));
    const result = await apiFetchAll('/x');
    expect(result).toEqual([{ id: '1' }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test/x?limit=100&offset=0',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      }),
    );
  });

  it('follows 206 pages until X-Total-Count is reached', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }, { id: '2' }], 206, 3))
      .mockResolvedValueOnce(pageResponse([{ id: '3' }], 206, 3));
    const result = await apiFetchAll('/x');
    expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(vi.mocked(global.fetch).mock.calls[1][0]).toContain('offset=2');
  });

  it('collects every page when the backend clips limit to 10 (25 items, 3 requests)', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i) }));
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse(items.slice(0, 10), 206, 25))
      .mockResolvedValueOnce(pageResponse(items.slice(10, 20), 206, 25))
      .mockResolvedValueOnce(pageResponse(items.slice(20), 206, 25));
    const result = await apiFetchAll('/x?lifecycleStatus=Launched');
    expect(result).toEqual(items);
    const urls = vi.mocked(global.fetch).mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      'https://api.test/x?lifecycleStatus=Launched&limit=100&offset=0',
      'https://api.test/x?lifecycleStatus=Launched&limit=100&offset=10',
      'https://api.test/x?lifecycleStatus=Launched&limit=100&offset=20',
    ]);
  });

  it('keeps paginating a 206 without X-Total-Count until an empty page', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }, { id: '2' }], 206))
      .mockResolvedValueOnce(pageResponse([{ id: '3' }], 206))
      .mockResolvedValueOnce(pageResponse([], 206));
    const result = await apiFetchAll('/x');
    expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('stops when a later page answers 200 (complete list)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }, { id: '2' }], 206, 5))
      .mockResolvedValueOnce(pageResponse([{ id: '3' }], 200));
    const result = await apiFetchAll('/x');
    expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('caps the number of requests at 100 pages when the backend never completes', async () => {
    global.fetch = vi.fn().mockResolvedValue(pageResponse([{ id: 'x' }], 206, 100_000));
    const result = await apiFetchAll('/x');
    expect(global.fetch).toHaveBeenCalledTimes(100);
    expect(result).toHaveLength(100);
  });

  it('uses the explicit bearer token over the session one', async () => {
    global.fetch = vi.fn().mockResolvedValue(pageResponse([], 200));
    await apiFetchAll('/x', undefined, 'explicit');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer explicit' }),
      }),
    );
  });

  it('propagates HTTP errors from any page', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(pageResponse([{ id: '1' }], 206, 2))
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('boom') });
    await expect(apiFetchAll('/x')).rejects.toThrow('HTTP 500');
  });
});
