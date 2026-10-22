import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/category', () => ({
  fetchCategories: vi.fn(),
  fetchCategoryById: vi.fn(),
  createCategory: vi.fn(),
  patchCategory: vi.fn(),
  publishCategory: vi.fn(),
  deleteCategory: vi.fn(),
  fetchLaunchedCategories: vi.fn(),
  fetchCategoriesPublic: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCategories,
  useCategoriesPublic,
  useCreateCategory,
  useDeleteCategory,
  useLaunchedCategories,
  usePatchCategory,
  usePublishCategory,
} from '@/hooks/queries/useCategoryQueries';
import * as categoryApi from '@/lib/services/queries/category';
import type { Category, NewCategory } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const CAT_ID = 'urn:ngsi-ld:category:cat-1';
const category = { id: CAT_ID } as Category;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createEntityQueries wiring ────────────────────────────────────────────

describe('useCategories', () => {
  it('calls fetchCategories', async () => {
    vi.mocked(categoryApi.fetchCategories).mockResolvedValue([category]);
    const { result } = renderHook(() => useCategories(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(categoryApi.fetchCategories).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateCategory', () => {
  it('calls createCategory and invalidates categories.all()', async () => {
    vi.mocked(categoryApi.createCategory).mockResolvedValue(category);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateCategory(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate({ name: 'New category' } as NewCategory);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all() });
  });
});

describe('usePatchCategory', () => {
  it('calls patchCategory with (id, payload) and invalidates categories.all()', async () => {
    vi.mocked(categoryApi.patchCategory).mockResolvedValue(category);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchCategory(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate({ id: CAT_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(categoryApi.patchCategory).toHaveBeenCalledWith(CAT_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all() });
  });
});

describe('usePublishCategory', () => {
  it('calls publishCategory and invalidates categories.all()', async () => {
    vi.mocked(categoryApi.publishCategory).mockResolvedValue(category);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishCategory(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(CAT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all() });
  });
});

describe('useDeleteCategory', () => {
  it('calls deleteCategory and invalidates categories, catalogs, and offerings caches', async () => {
    vi.mocked(categoryApi.deleteCategory).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCategory(), { wrapper: wrapperFor(queryClient) });

    result.current.mutate(CAT_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(categoryApi.deleteCategory).mock.calls[0]?.[0]).toBe(CAT_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.categories.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.catalogs.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

// ─── extra custom hooks ─────────────────────────────────────────────────────

describe('useLaunchedCategories', () => {
  it('fetches categories filtered to Launched lifecycle status', async () => {
    vi.mocked(categoryApi.fetchLaunchedCategories).mockResolvedValue([category]);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLaunchedCategories(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(categoryApi.fetchLaunchedCategories).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(queryKeys.categories.list({ lifecycleStatus: 'Launched' })),
    ).toEqual([category]);
  });

  it('surfaces isError without throwing when it rejects', async () => {
    vi.mocked(categoryApi.fetchLaunchedCategories).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLaunchedCategories(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCategoriesPublic', () => {
  it('fetches public categories when enabled', async () => {
    vi.mocked(categoryApi.fetchCategoriesPublic).mockResolvedValue([category]);
    const { result } = renderHook(() => useCategoriesPublic({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(categoryApi.fetchCategoriesPublic).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useCategoriesPublic({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(categoryApi.fetchCategoriesPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
