// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

import {
  createCatalog,
  deleteCatalog,
  fetchCatalogById,
  fetchCatalogs,
  fetchLaunchedCatalogs,
  fetchLaunchedCatalogsPublic,
  patchCatalog,
  publishCatalog,
  removeCatalogCategoryRef,
  setCatalogCategories,
} from '@/lib/services/queries/catalog';
import { getSession } from '@/lib/session';
import { trackError } from '@/lib/utils/sentry';
import type { Catalog } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const CAT_ID = 'urn:ngsi-ld:catalog:cat-1';
const CAT_ID_2 = 'urn:ngsi-ld:catalog:cat-2';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID, sub: 'did:key:test' },
  } as Awaited<ReturnType<typeof getSession>>);
}

function catalog(id: string, orgId = ORG_ID): Catalog {
  return {
    id,
    name: `Catalog ${id}`,
    relatedParty: [{ id: orgId, role: 'provider', '@referredType': 'Organization' }],
  } as Catalog;
}

function okResponse(data: unknown, status = 200) {
  return { ok: true, status, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}

function errorResponse(status: number, body = 'Error') {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('no json')),
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockSession();
});

// ─── fetchCatalogs ────────────────────────────────────────────────────────────

describe('fetchCatalogs', () => {
  it('calls GET /catalog?limit=100&offset=0 with Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchCatalogs();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/catalog?limit=100&offset=0'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it('returns only catalogs belonging to the current org', async () => {
    const own = catalog(CAT_ID);
    const other = catalog('urn:ngsi-ld:catalog:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await fetchCatalogs();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CAT_ID);
  });

  it('returns empty array when no catalog belongs to the current org', async () => {
    const other = catalog('urn:ngsi-ld:catalog:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([other]));
    expect(await fetchCatalogs()).toHaveLength(0);
  });
});

// ─── fetchLaunchedCatalogs ────────────────────────────────────────────────────

describe('fetchLaunchedCatalogs', () => {
  it('includes lifecycleStatus=Launched in the URL', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchLaunchedCatalogs();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lifecycleStatus=Launched'),
      expect.anything(),
    );
  });

  it('applies filterByRelatedParty and returns only the org catalogs', async () => {
    const launched = { ...catalog(CAT_ID), lifecycleStatus: 'Launched' };
    const other = {
      ...catalog('urn:ngsi-ld:catalog:other', OTHER_ORG),
      lifecycleStatus: 'Launched',
    };
    global.fetch = vi.fn().mockResolvedValue(okResponse([launched, other]));
    const result = await fetchLaunchedCatalogs();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CAT_ID);
  });
});

// ─── fetchLaunchedCatalogsPublic ──────────────────────────────────────────────

describe('fetchLaunchedCatalogsPublic', () => {
  it('includes lifecycleStatus=Launched in the URL and sends no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchLaunchedCatalogsPublic();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('lifecycleStatus=Launched'),
      expect.anything(),
    );
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('does not filter by relatedParty — returns catalogs from any organization', async () => {
    const own = catalog(CAT_ID);
    const other = catalog('urn:ngsi-ld:catalog:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await fetchLaunchedCatalogsPublic();
    expect(result).toHaveLength(2);
  });
});

// ─── fetchCatalogById ─────────────────────────────────────────────────────────

describe('fetchCatalogById', () => {
  it('calls GET /catalog/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));
    await fetchCatalogById(CAT_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/catalog/${CAT_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404, 'Not Found'));
    await expect(fetchCatalogById(CAT_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createCatalog ────────────────────────────────────────────────────────────

describe('createCatalog', () => {
  it('calls POST /catalog with relatedParty injected', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));
    await createCatalog({ name: 'New Catalog' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ORG_ID, role: 'provider' })]),
    );
  });

  it('sets lifecycleStatus to Active by default', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));
    await createCatalog({ name: 'New Catalog' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('Active');
  });

  it('preserves an explicit lifecycleStatus from the payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));
    await createCatalog({ name: 'New Catalog', lifecycleStatus: 'In design' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('In design');
  });
});

// ─── patchCatalog ─────────────────────────────────────────────────────────────

describe('patchCatalog', () => {
  it('calls PATCH /catalog/{id} with the given payload and returns updated catalog', async () => {
    const updated = { ...catalog(CAT_ID), name: 'Updated' };
    global.fetch = vi.fn().mockResolvedValue(okResponse(updated));
    const result = await patchCatalog(CAT_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/catalog/${CAT_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
    expect(result.name).toBe('Updated');
  });
});

// ─── publishCatalog ───────────────────────────────────────────────────────────

describe('publishCatalog', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...catalog(CAT_ID), lifecycleStatus: 'Launched' }));
    await publishCatalog(CAT_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus: 'Launched' }),
      }),
    );
  });
});

// ─── deleteCatalog ────────────────────────────────────────────────────────────

describe('deleteCatalog', () => {
  it('calls DELETE /catalog/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteCatalog(CAT_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/catalog/${CAT_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─── setCatalogCategories  🔴 ─────────────────────────────────────────────────

describe('setCatalogCategories', () => {
  it('sends a single PATCH with the full list', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));

    await setCatalogCategories(CAT_ID, [CAT_ID_2, 'urn:ngsi-ld:category:other']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect((calls[0][1] as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      category: [{ id: CAT_ID_2 }, { id: 'urn:ngsi-ld:category:other' }],
    });
  });

  it('sends an empty list when ids is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));
    await setCatalogCategories(CAT_ID, []);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ category: [] });
  });

  it('throws when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(500));
    await expect(setCatalogCategories(CAT_ID, [CAT_ID_2])).rejects.toThrow('HTTP 500');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── removeCatalogCategoryRef  🔴 ────────────────────────────────────────────

describe('removeCatalogCategoryRef', () => {
  it('sends a single PATCH with the remaining items', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(catalog(CAT_ID)));

    await removeCatalogCategoryRef(CAT_ID, CAT_ID_2, [
      { id: CAT_ID_2 },
      { id: 'urn:ngsi-ld:category:keep' },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      category: [{ id: 'urn:ngsi-ld:category:keep' }],
    });
  });

  it('sends an empty list when no items remain after removal', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(catalog(CAT_ID)));
    await removeCatalogCategoryRef(CAT_ID, CAT_ID_2, [{ id: CAT_ID_2 }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ category: [] });
  });

  it('calls trackError and rethrows when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'));
    await expect(removeCatalogCategoryRef(CAT_ID, CAT_ID_2, [{ id: CAT_ID_2 }])).rejects.toThrow(
      'HTTP 502',
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ fn: 'removeCatalogCategoryRef' }),
    );
  });
});
