import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productOffering', () => ({
  addOfferingPriceRef: vi.fn(),
  createProductOffering: vi.fn(),
  deleteProductOffering: vi.fn(),
  fetchProductOfferingById: vi.fn(),
  fetchProductOfferings: vi.fn(),
  fetchProductOfferingsPublic: vi.fn(),
  patchProductOffering: vi.fn(),
  publishProductOffering: vi.fn(),
  removeOfferingPriceRef: vi.fn(),
  setProductOfferingCategories: vi.fn(),
  setProductOfferingPriceRefs: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useAddOfferingPriceRef,
  useCreateProductOffering,
  useDeleteProductOffering,
  usePatchProductOffering,
  usePatchProductOfferingCategories,
  useProductOffering,
  useProductOfferings,
  useProductOfferingsPublic,
  usePublishProductOffering,
  useRemoveOfferingPriceRef,
  useSetOfferingPriceRefs,
} from '@/hooks/queries/useProductOfferingQueries';
import {
  addOfferingPriceRef,
  createProductOffering,
  deleteProductOffering,
  fetchProductOfferingById,
  fetchProductOfferings,
  fetchProductOfferingsPublic,
  patchProductOffering,
  publishProductOffering,
  removeOfferingPriceRef,
  setProductOfferingCategories,
  setProductOfferingPriceRefs,
} from '@/lib/services/queries/productOffering';
import type { NewProductOffering, ProductOffering } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const OFF_ID = 'urn:ngsi-ld:productOffering:off-1';
const offering = { id: OFF_ID } as ProductOffering;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createEntityQueries wiring ────────────────────────────────────────────

describe('useProductOfferings', () => {
  it('calls fetchProductOfferings', async () => {
    vi.mocked(fetchProductOfferings).mockResolvedValue([offering]);
    const { result } = renderHook(() => useProductOfferings(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOfferings).toHaveBeenCalledTimes(1);
  });
});

describe('useProductOffering', () => {
  it('calls fetchProductOfferingById with the given id', async () => {
    vi.mocked(fetchProductOfferingById).mockResolvedValue(offering);
    const { result } = renderHook(() => useProductOffering(OFF_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOfferingById).toHaveBeenCalledWith(OFF_ID);
  });
});

describe('useCreateProductOffering', () => {
  it('calls createProductOffering and invalidates offerings.all()', async () => {
    vi.mocked(createProductOffering).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProductOffering(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New offering' } as NewProductOffering);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('usePatchProductOffering', () => {
  it('calls patchProductOffering with (id, payload) and invalidates offerings.all()', async () => {
    vi.mocked(patchProductOffering).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchProductOffering(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: OFF_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchProductOffering).toHaveBeenCalledWith(OFF_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('usePublishProductOffering', () => {
  it('calls publishProductOffering and invalidates offerings.all()', async () => {
    vi.mocked(publishProductOffering).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishProductOffering(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(OFF_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('useDeleteProductOffering', () => {
  it('calls deleteProductOffering and invalidates offerings.all()', async () => {
    vi.mocked(deleteProductOffering).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteProductOffering(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(OFF_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteProductOffering).mock.calls[0]?.[0]).toBe(OFF_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

// ─── extra custom hooks ─────────────────────────────────────────────────────

describe('useProductOfferingsPublic', () => {
  it('fetches public offerings when enabled', async () => {
    vi.mocked(fetchProductOfferingsPublic).mockResolvedValue([offering]);
    const { result } = renderHook(() => useProductOfferingsPublic({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOfferingsPublic).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useProductOfferingsPublic({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(fetchProductOfferingsPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePatchProductOfferingCategories', () => {
  it('calls setProductOfferingCategories with (id, categoryIds) and invalidates offerings.all()', async () => {
    vi.mocked(setProductOfferingCategories).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchProductOfferingCategories(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: OFF_ID, categoryIds: ['cat-1'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setProductOfferingCategories).toHaveBeenCalledWith(OFF_ID, ['cat-1']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('useSetOfferingPriceRefs', () => {
  it('calls setProductOfferingPriceRefs with (id, priceIds) and invalidates offerings.all()', async () => {
    vi.mocked(setProductOfferingPriceRefs).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSetOfferingPriceRefs(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: OFF_ID, priceIds: ['price-1'] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setProductOfferingPriceRefs).toHaveBeenCalledWith(OFF_ID, ['price-1']);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('useAddOfferingPriceRef', () => {
  it('calls addOfferingPriceRef with (offeringId, priceId, currentPrices) and invalidates offerings.all()', async () => {
    vi.mocked(addOfferingPriceRef).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAddOfferingPriceRef(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ offeringId: OFF_ID, priceId: 'price-1', currentPrices: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(addOfferingPriceRef).toHaveBeenCalledWith(OFF_ID, 'price-1', []);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('useRemoveOfferingPriceRef', () => {
  it('calls removeOfferingPriceRef with (offeringId, priceId, currentPrices) and invalidates offerings.all()', async () => {
    vi.mocked(removeOfferingPriceRef).mockResolvedValue(offering);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRemoveOfferingPriceRef(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ offeringId: OFF_ID, priceId: 'price-1', currentPrices: [] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(removeOfferingPriceRef).toHaveBeenCalledWith(OFF_ID, 'price-1', []);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});
