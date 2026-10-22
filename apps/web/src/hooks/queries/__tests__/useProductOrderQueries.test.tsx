import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productOrder', () => ({
  cancelProductOrder: vi.fn(),
  createProductOrder: vi.fn(),
  fetchProductOrderById: vi.fn(),
  fetchProductOrdersAsBuyer: vi.fn(),
  fetchProductOrdersAsSeller: vi.fn(),
  linkAgreementToOrder: vi.fn(),
  transitionProductOrderState: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCancelProductOrder,
  useCreateProductOrder,
  useLinkAgreementToOrder,
  useProductOrder,
  useProductOrdersAsBuyer,
  useProductOrdersAsSeller,
  useTransitionProductOrder,
} from '@/hooks/queries/useProductOrderQueries';
import {
  cancelProductOrder,
  createProductOrder,
  fetchProductOrderById,
  fetchProductOrdersAsBuyer,
  fetchProductOrdersAsSeller,
  linkAgreementToOrder,
  transitionProductOrderState,
} from '@/lib/services/queries/productOrder';
import type { NewProductOrder, ProductOrder } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';
const order = { id: ORDER_ID } as ProductOrder;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useProductOrdersAsBuyer', () => {
  it('fetches via fetchProductOrdersAsBuyer', async () => {
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([order]);
    const { result } = renderHook(() => useProductOrdersAsBuyer(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOrdersAsBuyer).toHaveBeenCalledTimes(1);
  });

  it('surfaces isError without throwing when it rejects', async () => {
    vi.mocked(fetchProductOrdersAsBuyer).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useProductOrdersAsBuyer(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useProductOrdersAsSeller', () => {
  it('fetches via fetchProductOrdersAsSeller', async () => {
    vi.mocked(fetchProductOrdersAsSeller).mockResolvedValue([order]);
    const { result } = renderHook(() => useProductOrdersAsSeller(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOrdersAsSeller).toHaveBeenCalledTimes(1);
  });
});

describe('useProductOrder', () => {
  it('fetches a single product order by id', async () => {
    vi.mocked(fetchProductOrderById).mockResolvedValue(order);
    const { result } = renderHook(() => useProductOrder(ORDER_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchProductOrderById).toHaveBeenCalledWith(ORDER_ID);
  });

  it('stays disabled when id is falsy', () => {
    const { result } = renderHook(() => useProductOrder(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    expect(fetchProductOrderById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateProductOrder', () => {
  it('calls createProductOrder and invalidates productOrders.all()', async () => {
    vi.mocked(createProductOrder).mockResolvedValue(order);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateProductOrder(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ orderDate: new Date().toISOString() } as NewProductOrder);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  });
});

describe('useTransitionProductOrder', () => {
  it('calls transitionProductOrderState with (id, state) and invalidates productOrders.all()', async () => {
    vi.mocked(transitionProductOrderState).mockResolvedValue(order);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTransitionProductOrder(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: ORDER_ID, state: 'completed' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(transitionProductOrderState).toHaveBeenCalledWith(ORDER_ID, 'completed');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  });
});

describe('useLinkAgreementToOrder', () => {
  it('calls linkAgreementToOrder with (orderId, agreementId, agreementName) and invalidates productOrders.all()', async () => {
    vi.mocked(linkAgreementToOrder).mockResolvedValue(order);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useLinkAgreementToOrder(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({
      orderId: ORDER_ID,
      agreementId: 'agr-1',
      agreementName: 'Acuerdo X',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(linkAgreementToOrder).toHaveBeenCalledWith(ORDER_ID, 'agr-1', 'Acuerdo X');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  });
});

describe('useCancelProductOrder', () => {
  it('calls cancelProductOrder with the id only (v2 takes just { state }) and invalidates productOrders.all()', async () => {
    vi.mocked(cancelProductOrder).mockResolvedValue({ id: ORDER_ID, state: 'cancelled' } as ProductOrder);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCancelProductOrder(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: ORDER_ID, reason: 'buyer requested' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cancelProductOrder).toHaveBeenCalledWith(ORDER_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  });
});
