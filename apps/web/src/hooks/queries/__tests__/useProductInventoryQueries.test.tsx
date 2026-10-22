import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productInventory', () => ({
  createProduct: vi.fn(),
  fetchProductById: vi.fn(),
  fetchProductsForOffering: vi.fn(),
  fetchProductsAsBuyer: vi.fn(),
  fetchProductsAsSeller: vi.fn(),
  fetchProductsByAgreement: vi.fn(),
  fetchProductsByBuyer: vi.fn(),
  updateProductStatus: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateProduct,
  useProductInventoriesAsBuyer,
  useProductInventoriesAsSeller,
  useProductInventory,
  useProductInventoryForOffering,
  useProductInventoryItem,
  useProductsByAgreement,
  useUpdateProductStatus,
} from '@/hooks/queries/useProductInventoryQueries';
import {
  createProduct,
  fetchProductById,
  fetchProductsAsBuyer,
  fetchProductsAsSeller,
  fetchProductsByAgreement,
  fetchProductsByBuyer,
  fetchProductsForOffering,
  updateProductStatus,
} from '@/lib/services/queries/productInventory';
import type { NewProductInventory, ProductInventory } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const PROD_ID = 'urn:ngsi-ld:product:prod-1';
const product = { id: PROD_ID } as ProductInventory;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProductInventory', () => {
  it('fetches via fetchProductsByBuyer', async () => {
    vi.mocked(fetchProductsByBuyer).mockResolvedValue([product]);
    const { result } = renderHook(() => useProductInventory(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductsByBuyer).toHaveBeenCalledTimes(1);
  });
});

describe('useProductInventoryItem', () => {
  it('fetches a single product by id', async () => {
    vi.mocked(fetchProductById).mockResolvedValue(product);
    const { result } = renderHook(() => useProductInventoryItem(PROD_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductById).toHaveBeenCalledWith(PROD_ID);
  });

  it('stays disabled when id is falsy', () => {
    const { result } = renderHook(() => useProductInventoryItem(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(fetchProductById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useProductInventoriesAsBuyer', () => {
  it('fetches via fetchProductsAsBuyer', async () => {
    vi.mocked(fetchProductsAsBuyer).mockResolvedValue([product]);
    const { result } = renderHook(() => useProductInventoriesAsBuyer(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductsAsBuyer).toHaveBeenCalledTimes(1);
  });
});

describe('useProductInventoriesAsSeller', () => {
  it('fetches via fetchProductsAsSeller', async () => {
    vi.mocked(fetchProductsAsSeller).mockResolvedValue([product]);
    const { result } = renderHook(() => useProductInventoriesAsSeller(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductsAsSeller).toHaveBeenCalledTimes(1);
  });
});

describe('useProductInventoryForOffering', () => {
  it('fetches via fetchProductsForOffering', async () => {
    vi.mocked(fetchProductsForOffering).mockResolvedValue([product]);
    const { result } = renderHook(() => useProductInventoryForOffering('offering-1'), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductsForOffering).toHaveBeenCalledWith('offering-1');
  });
});

describe('useProductsByAgreement', () => {
  const AGR_ID = 'urn:ngsi-ld:agreement:agr-1';

  it('fetches via fetchProductsByAgreement when agreementId is set', async () => {
    vi.mocked(fetchProductsByAgreement).mockResolvedValue([product]);
    const { result } = renderHook(() => useProductsByAgreement(AGR_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductsByAgreement).toHaveBeenCalledWith(AGR_ID);
  });

  it('stays disabled when agreementId is falsy', () => {
    const { result } = renderHook(() => useProductsByAgreement(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(fetchProductsByAgreement).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateProduct', () => {
  it('calls createProduct and invalidates productInventory.all()', async () => {
    vi.mocked(createProduct).mockResolvedValue(product);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProduct(), { wrapper: wrapperFor(queryClient) });

    const payload = { name: 'New product' } as NewProductInventory;
    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // React Query v5 calls mutationFn with a second (internal) context argument when it's passed by direct reference — assert on the payload it actually cares about.
    expect(vi.mocked(createProduct).mock.calls[0]?.[0]).toEqual(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productInventory.all() });
  });
});

describe('useUpdateProductStatus', () => {
  it('calls updateProductStatus with (id, status) and invalidates productInventory.all()', async () => {
    vi.mocked(updateProductStatus).mockResolvedValue(product);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateProductStatus(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: PROD_ID, status: 'active' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateProductStatus).toHaveBeenCalledWith(PROD_ID, 'active');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productInventory.all() });
  });
});
