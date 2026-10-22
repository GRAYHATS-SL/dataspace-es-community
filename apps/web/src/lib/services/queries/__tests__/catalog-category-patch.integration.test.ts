// @vitest-environment node
// INTEGRATION test of the Catalog categories PATCH in the TMForum v2 API (PATCH on lists REPLACES the whole list: a single PATCH with all the items). The catalog.ts unit test (catalog.test.ts) already verifies the payload by mocking `@/lib/session` directly. This integration test crosses one more layer: it uses a REAL iron-session session (same cookie jar as in auth-flow.integration.test.ts) to show that `apiFetch` obtains the real token from the session and attaches it to the PATCH.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Catalog } from '@/types/api';

const APP_URL = 'https://app.example.com';
const ACCESS_TOKEN = 'test-access-token';
const CAT_ID = 'urn:ngsi-ld:catalog:cat-1';
const CAT_A = 'urn:ngsi-ld:category:a';
const CAT_B = 'urn:ngsi-ld:category:b';
const CAT_C = 'urn:ngsi-ld:category:c';

const cookieStore = vi.hoisted(() => new Map<string, { value: string }>());

vi.mock('next/headers', () => ({
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

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data, text: async () => '' };
}

function catalog(id: string, category: { id: string }[] = []): Catalog {
  return {
    id,
    name: `Catalog ${id}`,
    relatedParty: [{ id: 'urn:ngsi-ld:organization:org-1', role: 'provider' }],
    category,
  } as Catalog;
}

beforeEach(async () => {
  cookieStore.clear();
  vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL);
  vi.resetModules();

  // Real session (iron-session, same cookie jar that apiFetch/getSession would read)
  const { createAuthenticatedSession } = await import('@/lib/session');
  await createAuthenticatedSession(ACCESS_TOKEN, {
    name: 'Test User',
    organization: 'Org',
    sub: 'did:key:test',
    roles: ['ADMIN'],
    businessRoles: ['proveedor', 'consumidor'],
    organizationId: 'urn:ngsi-ld:organization:org-1',
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('PATCH de categorias de Catalog (v2: sustituye la lista) con sesion real', () => {
  it('setCatalogCategories: un unico PATCH con todas las categorias y el token de la sesion real', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(catalog(CAT_ID, [{ id: CAT_A }, { id: CAT_B }])));
    vi.stubGlobal('fetch', fetchMock);

    const { setCatalogCategories } = await import('@/lib/services/queries/catalog');
    const result = await setCatalogCategories(CAT_ID, [CAT_A, CAT_B]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      category: [{ id: CAT_A }, { id: CAT_B }],
    });
    expect((init as RequestInit & { headers: Record<string, string> }).headers.Authorization).toBe(
      `Bearer ${ACCESS_TOKEN}`,
    );
    expect(result.category).toEqual([{ id: CAT_A }, { id: CAT_B }]);
  });

  it('setCatalogCategories: con lista vacia envia category: []', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(catalog(CAT_ID)));
    vi.stubGlobal('fetch', fetchMock);

    const { setCatalogCategories } = await import('@/lib/services/queries/catalog');
    await setCatalogCategories(CAT_ID, []);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      category: [],
    });
  });

  it('removeCatalogCategoryRef: un unico PATCH con las categorias restantes, sin la eliminada', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => okResponse(catalog(CAT_ID)));
    vi.stubGlobal('fetch', fetchMock);

    const { removeCatalogCategoryRef } = await import('@/lib/services/queries/catalog');
    const current = [{ id: CAT_A }, { id: CAT_B }, { id: CAT_C }];

    await removeCatalogCategoryRef(CAT_ID, CAT_B, current);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      category: [{ id: CAT_A }, { id: CAT_C }],
    });
  });
});
