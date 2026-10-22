// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoriesPublic,
  fetchCategoryById,
  fetchLaunchedCategories,
  patchCategory,
  publishCategory,
} from '@/lib/services/queries/category';
import { getSession } from '@/lib/session';
import type { Category } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const TOKEN = 'test-access-token';
const CAT_ID = 'urn:ngsi-ld:category:cat-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function category(id: string): Category {
  return { id, name: `Category ${id}` } as Category;
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

// ─── fetchCategories ──────────────────────────────────────────────────────────

describe('fetchCategories', () => {
  it('calls GET /category (paginated)', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchCategories();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/category?limit=100&offset=0'),
      expect.anything(),
    );
  });

  it('deduplicates entries by id', async () => {
    const dup = category(CAT_ID);
    global.fetch = vi.fn().mockResolvedValue(okResponse([dup, dup]));
    const result = await fetchCategories();
    expect(result).toHaveLength(1);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(fetchCategories()).rejects.toThrow('HTTP 500');
  });
});

// ─── fetchCategoriesPublic ─────────────────────────────────────────────────────

describe('fetchCategoriesPublic', () => {
  it('calls GET /category (paginated) with no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchCategoriesPublic();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/category?limit=100&offset=0'),
      expect.anything(),
    );
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('deduplicates entries by id', async () => {
    const dup = category(CAT_ID);
    global.fetch = vi.fn().mockResolvedValue(okResponse([dup, dup]));
    const result = await fetchCategoriesPublic();
    expect(result).toHaveLength(1);
  });
});

// ─── fetchLaunchedCategories ──────────────────────────────────────────────────

describe('fetchLaunchedCategories', () => {
  it('devuelve las categorías Active y Launched y descarta el resto', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okResponse([
        { ...category('a'), lifecycleStatus: 'Active' },
        { ...category('l'), lifecycleStatus: 'Launched' },
        { ...category('r'), lifecycleStatus: 'Retired' },
      ]),
    );
    const result = await fetchLaunchedCategories();
    expect(result.map((c) => c.id)).toEqual(['a', 'l']);
  });

  it('deduplicates results', async () => {
    const launched = { ...category(CAT_ID), lifecycleStatus: 'Launched' };
    global.fetch = vi.fn().mockResolvedValue(okResponse([launched, launched]));
    const result = await fetchLaunchedCategories();
    expect(result).toHaveLength(1);
  });
});

// ─── fetchCategoryById ────────────────────────────────────────────────────────

describe('fetchCategoryById', () => {
  it('calls GET /category/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(category(CAT_ID)));
    await fetchCategoryById(CAT_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/category/${CAT_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(fetchCategoryById(CAT_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createCategory ───────────────────────────────────────────────────────────

describe('createCategory', () => {
  it('calls POST /category with lifecycleStatus: Active by default', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(category(CAT_ID)));
    await createCategory({ name: 'Nueva categoría' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('Active');
  });

  it('preserves an explicit lifecycleStatus from the payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(category(CAT_ID)));
    await createCategory({ name: 'Nueva categoría', lifecycleStatus: 'In design' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('In design');
  });
});

// ─── patchCategory ────────────────────────────────────────────────────────────

describe('patchCategory', () => {
  it('calls PATCH /category/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse({ ...category(CAT_ID), name: 'Updated' }));
    await patchCategory(CAT_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/category/${CAT_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });
});

// ─── publishCategory ──────────────────────────────────────────────────────────

describe('publishCategory', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...category(CAT_ID), lifecycleStatus: 'Launched' }));
    await publishCategory(CAT_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus: 'Launched' }),
      }),
    );
  });
});

// ─── deleteCategory ───────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  it('calls DELETE /category/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteCategory(CAT_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/category/${CAT_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
