import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/catalog', () => ({
  createCatalog: vi.fn(),
  deleteCatalog: vi.fn(),
  fetchCatalogById: vi.fn(),
  fetchCatalogs: vi.fn(),
  fetchLaunchedCatalogs: vi.fn(),
  fetchLaunchedCatalogsPublic: vi.fn(),
  patchCatalog: vi.fn(),
  publishCatalog: vi.fn(),
  setCatalogCategories: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCatalog,
  useCatalogs,
  useCreateCatalog,
  useDeleteCatalog,
  useLaunchedCatalogs,
  useLaunchedCatalogsPublic,
  usePatchCatalog,
  usePublishCatalog,
  useSetCatalogCategories,
} from '@/hooks/queries/useCatalogQueries';
import {
  createCatalog,
  deleteCatalog,
  fetchCatalogById,
  fetchCatalogs,
  fetchLaunchedCatalogs,
  fetchLaunchedCatalogsPublic,
  patchCatalog,
  publishCatalog,
  setCatalogCategories,
} from '@/lib/services/queries/catalog';
import type { Catalog, NewCatalog } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const CAT_ID = 'urn:ngsi-ld:catalog:cat-1';
const catalog = { id: CAT_ID } as Catalog;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createEntityQueries wiring ────────────────────────────────────────────

describe('useCatalogs', () => {
  it('calls fetchCatalogs', async () => {
    vi.mocked(fetchCatalogs).mockResolvedValue([catalog]);
    const { result } = renderHook(() => useCatalogs(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchCatalogs).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([catalog]);
  });
});

describe('useCatalog', () => {
  it('calls fetchCatalogById with the given id', async () => {
    vi.mocked(fetchCatalogById).mockResolvedValue(catalog);
    const { result } = renderHook(() => useCatalog(CAT_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchCatalogById).toHaveBeenCalledWith(CAT_ID);
  });
});

describe('useCreateCatalog', () => {
  it('calls createCatalog and invalidates catalogs.all()', async () => {
    vi.mocked(createCatalog).mockResolvedValue(catalog);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateCatalog(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate({ name: 'New catalog' } as NewCatalog);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
  });
});

describe('usePatchCatalog', () => {
  it('calls patchCatalog with (id, payload) and invalidates catalogs.all()', async () => {
    vi.mocked(patchCatalog).mockResolvedValue(catalog);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchCatalog(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate({ id: CAT_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchCatalog).toHaveBeenCalledWith(CAT_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
  });
});

describe('usePublishCatalog', () => {
  it('calls publishCatalog and invalidates catalogs.all()', async () => {
    vi.mocked(publishCatalog).mockResolvedValue(catalog);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishCatalog(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate(CAT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(publishCatalog).mock.calls[0]?.[0]).toBe(CAT_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
  });
});

describe('useDeleteCatalog', () => {
  it('calls deleteCatalog and invalidates catalogs.all()', async () => {
    vi.mocked(deleteCatalog).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCatalog(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate(CAT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteCatalog).mock.calls[0]?.[0]).toBe(CAT_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
  });
});

// ─── extra custom hooks ─────────────────────────────────────────────────────

describe('useLaunchedCatalogs', () => {
  it('fetches launched catalogs when enabled', async () => {
    vi.mocked(fetchLaunchedCatalogs).mockResolvedValue([catalog]);
    const { result } = renderHook(() => useLaunchedCatalogs({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchLaunchedCatalogs).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([catalog]);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useLaunchedCatalogs({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(fetchLaunchedCatalogs).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useLaunchedCatalogsPublic', () => {
  it('fetches the public launched catalogs when enabled', async () => {
    vi.mocked(fetchLaunchedCatalogsPublic).mockResolvedValue([catalog]);
    const { result } = renderHook(() => useLaunchedCatalogsPublic({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchLaunchedCatalogsPublic).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useLaunchedCatalogsPublic({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(fetchLaunchedCatalogsPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSetCatalogCategories', () => {
  it('calls setCatalogCategories with (id, categoryIds) and invalidates catalogs.all()', async () => {
    vi.mocked(setCatalogCategories).mockResolvedValue(catalog);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetCatalogCategories(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: CAT_ID, categoryIds: ['cat-a', 'cat-b'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setCatalogCategories).toHaveBeenCalledWith(CAT_ID, ['cat-a', 'cat-b']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
  });
});
