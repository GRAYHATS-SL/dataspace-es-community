import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productSpecification', () => ({
  createProductSpecification: vi.fn(),
  createProductSpecificationWithPolicy: vi.fn(),
  deleteProductSpecification: vi.fn(),
  getProductSpecificationById: vi.fn(),
  getProductSpecifications: vi.fn(),
  getProductSpecificationsAll: vi.fn(),
  getProductSpecificationsAllPublic: vi.fn(),
  patchProductSpecification: vi.fn(),
  patchProductSpecificationWithPolicy: vi.fn(),
  publishProductSpecification: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useAllProductSpecificationsQuery,
  useCreateProductSpecification,
  useCreateProductSpecificationWithPolicy,
  useDeleteProductSpecification,
  usePatchProductSpecification,
  usePatchProductSpecificationWithPolicy,
  useProductSpecification,
  useProductSpecificationPublicQuery,
  useProductSpecifications,
  useProductSpecificationsAllPublicQuery,
  usePublishProductSpecification,
} from '@/hooks/queries/useProductSpecificationQueries';
import {
  createProductSpecification,
  createProductSpecificationWithPolicy,
  deleteProductSpecification,
  getProductSpecificationById,
  getProductSpecifications,
  getProductSpecificationsAll,
  getProductSpecificationsAllPublic,
  patchProductSpecification,
  patchProductSpecificationWithPolicy,
  publishProductSpecification,
} from '@/lib/services/queries/productSpecification';
import type { NewProductSpecification, ProductSpecification } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const SPEC_ID = 'urn:ngsi-ld:productSpecification:spec-1';
const spec = { id: SPEC_ID } as ProductSpecification;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createEntityQueries wiring ────────────────────────────────────────────

describe('useProductSpecifications', () => {
  it('calls getProductSpecifications', async () => {
    vi.mocked(getProductSpecifications).mockResolvedValue([spec]);
    const { result } = renderHook(() => useProductSpecifications(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductSpecifications).toHaveBeenCalledTimes(1);
  });
});

describe('useProductSpecification', () => {
  it('calls getProductSpecificationById with the given id', async () => {
    vi.mocked(getProductSpecificationById).mockResolvedValue(spec);
    const { result } = renderHook(() => useProductSpecification(SPEC_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductSpecificationById).toHaveBeenCalledWith(SPEC_ID);
  });
});

describe('useCreateProductSpecification', () => {
  it('calls createProductSpecification and invalidates productSpecifications.all()', async () => {
    vi.mocked(createProductSpecification).mockResolvedValue(spec);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProductSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New spec' } as Partial<NewProductSpecification>);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});

describe('usePatchProductSpecification', () => {
  it('calls patchProductSpecification with (id, payload) and invalidates productSpecifications.all()', async () => {
    vi.mocked(patchProductSpecification).mockResolvedValue(spec);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchProductSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: SPEC_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchProductSpecification).toHaveBeenCalledWith(SPEC_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});

describe('useCreateProductSpecificationWithPolicy', () => {
  it('calls createProductSpecificationWithPolicy(input, policy) and invalidates the cache', async () => {
    vi.mocked(createProductSpecificationWithPolicy).mockResolvedValue(spec);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProductSpecificationWithPolicy(), {
      wrapper: wrapperFor(queryClient),
    });

    const policy = { odrlPathRegex: '^/a$' };
    result.current.mutate({ input: { name: 'New' }, policy });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createProductSpecificationWithPolicy).toHaveBeenCalledWith({ name: 'New' }, policy);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});

describe('usePatchProductSpecificationWithPolicy', () => {
  it('calls patchProductSpecificationWithPolicy(id, payload, policy, removeCharIds) and invalidates the cache', async () => {
    vi.mocked(patchProductSpecificationWithPolicy).mockResolvedValue(spec);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchProductSpecificationWithPolicy(), {
      wrapper: wrapperFor(queryClient),
    });

    const policy = { odrlPathRegex: '^/a$' };
    result.current.mutate({
      id: SPEC_ID,
      payload: { name: 'Renamed' },
      policy,
      removeCharIds: ['tokenOfferConfig'],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchProductSpecificationWithPolicy).toHaveBeenCalledWith(
      SPEC_ID,
      { name: 'Renamed' },
      policy,
      ['tokenOfferConfig'],
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});

describe('usePublishProductSpecification', () => {
  it('calls publishProductSpecification and invalidates productSpecifications.all()', async () => {
    vi.mocked(publishProductSpecification).mockResolvedValue(spec);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishProductSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(SPEC_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});

describe('useDeleteProductSpecification', () => {
  it('calls deleteProductSpecification and invalidates productSpecifications + offerings caches', async () => {
    vi.mocked(deleteProductSpecification).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteProductSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(SPEC_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteProductSpecification).mock.calls[0]?.[0]).toBe(SPEC_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

// ─── extra custom hooks ─────────────────────────────────────────────────────

describe('useAllProductSpecificationsQuery', () => {
  it('fetches all specs across organizations when enabled', async () => {
    vi.mocked(getProductSpecificationsAll).mockResolvedValue([spec]);
    const { result } = renderHook(() => useAllProductSpecificationsQuery({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductSpecificationsAll).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useAllProductSpecificationsQuery({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(getProductSpecificationsAll).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useProductSpecificationsAllPublicQuery', () => {
  it('fetches the public list when enabled', async () => {
    vi.mocked(getProductSpecificationsAllPublic).mockResolvedValue([spec]);
    const { result } = renderHook(() => useProductSpecificationsAllPublicQuery({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductSpecificationsAllPublic).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(
      () => useProductSpecificationsAllPublicQuery({ enabled: false }),
      { wrapper: wrapperFor(createTestQueryClient()) },
    );
    expect(getProductSpecificationsAllPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useProductSpecificationPublicQuery', () => {
  it('selects the spec by id from the shared public list cache (no /<id> request)', async () => {
    const other = { id: 'urn:ngsi-ld:productSpecification:other' } as ProductSpecification;
    vi.mocked(getProductSpecificationsAllPublic).mockResolvedValue([other, spec]);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useProductSpecificationPublicQuery(SPEC_ID), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(spec);
    expect(getProductSpecificationsAllPublic).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData(queryKeys.productSpecifications.list({ scope: 'public' })),
    ).toEqual([other, spec]);
  });

  it('returns undefined when the id is not in the list', async () => {
    vi.mocked(getProductSpecificationsAllPublic).mockResolvedValue([spec]);
    const { result } = renderHook(() => useProductSpecificationPublicQuery('missing'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('stays disabled when id is falsy', () => {
    const { result } = renderHook(() => useProductSpecificationPublicQuery(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(getProductSpecificationsAllPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('stays disabled when options.enabled is false even with a valid id', () => {
    const { result } = renderHook(
      () => useProductSpecificationPublicQuery(SPEC_ID, { enabled: false }),
      { wrapper: wrapperFor(createTestQueryClient()) },
    );
    expect(getProductSpecificationsAllPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
