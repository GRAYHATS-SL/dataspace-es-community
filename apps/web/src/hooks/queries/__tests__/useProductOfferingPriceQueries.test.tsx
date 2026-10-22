import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productOfferingPrice', () => ({
  createProductOfferingPrice: vi.fn(),
  deleteProductOfferingPrice: vi.fn(),
  getProductOfferingPriceById: vi.fn(),
  getProductOfferingPrices: vi.fn(),
  getProductOfferingPricesPublic: vi.fn(),
  patchProductOfferingPrice: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateProductOfferingPrice,
  useDeleteProductOfferingPrice,
  usePatchProductOfferingPrice,
  useProductOfferingPrice,
  useProductOfferingPrices,
  useProductOfferingPricesPublicQuery,
} from '@/hooks/queries/useProductOfferingPriceQueries';
import {
  createProductOfferingPrice,
  deleteProductOfferingPrice,
  getProductOfferingPriceById,
  getProductOfferingPrices,
  getProductOfferingPricesPublic,
  patchProductOfferingPrice,
} from '@/lib/services/queries/productOfferingPrice';
import type { NewProductOfferingPrice, ProductOfferingPrice } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const POP_ID = 'urn:ngsi-ld:productOfferingPrice:pop-1';
const price = { id: POP_ID } as ProductOfferingPrice;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProductOfferingPrices', () => {
  it('calls getProductOfferingPrices', async () => {
    vi.mocked(getProductOfferingPrices).mockResolvedValue([price]);
    const { result } = renderHook(() => useProductOfferingPrices(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductOfferingPrices).toHaveBeenCalledTimes(1);
  });
});

describe('useProductOfferingPrice', () => {
  it('calls getProductOfferingPriceById with the given id', async () => {
    vi.mocked(getProductOfferingPriceById).mockResolvedValue(price);
    const { result } = renderHook(() => useProductOfferingPrice(POP_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductOfferingPriceById).toHaveBeenCalledWith(POP_ID);
  });
});

describe('useCreateProductOfferingPrice', () => {
  it('calls createProductOfferingPrice and invalidates offeringPrices.all()', async () => {
    vi.mocked(createProductOfferingPrice).mockResolvedValue(price);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProductOfferingPrice(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New price' } as Partial<NewProductOfferingPrice>);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offeringPrices.all() });
  });
});

describe('usePatchProductOfferingPrice', () => {
  it('calls patchProductOfferingPrice with (id, payload) and invalidates offeringPrices.all()', async () => {
    vi.mocked(patchProductOfferingPrice).mockResolvedValue(price);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchProductOfferingPrice(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: POP_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchProductOfferingPrice).toHaveBeenCalledWith(POP_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offeringPrices.all() });
  });
});

describe('useDeleteProductOfferingPrice', () => {
  it('calls deleteProductOfferingPrice and invalidates offeringPrices + offerings caches', async () => {
    vi.mocked(deleteProductOfferingPrice).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteProductOfferingPrice(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(POP_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteProductOfferingPrice).mock.calls[0]?.[0]).toBe(POP_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offeringPrices.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.offerings.all() });
  });
});

describe('useProductOfferingPricesPublicQuery', () => {
  it('fetches public prices when enabled', async () => {
    vi.mocked(getProductOfferingPricesPublic).mockResolvedValue([price]);
    const { result } = renderHook(() => useProductOfferingPricesPublicQuery({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProductOfferingPricesPublic).toHaveBeenCalledTimes(1);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useProductOfferingPricesPublicQuery({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(getProductOfferingPricesPublic).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
