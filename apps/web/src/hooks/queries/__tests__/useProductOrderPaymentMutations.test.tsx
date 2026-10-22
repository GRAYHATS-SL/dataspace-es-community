import { renderHook, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/productOrderPayment', () => ({
  completeProductOrderPayment: vi.fn(),
  reconcileProductOrderPayment: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCompleteProductOrderPayment,
  useReconcileProductOrderPayment,
} from '@/hooks/queries/useProductOrderPaymentMutations';
import {
  completeProductOrderPayment,
  reconcileProductOrderPayment,
} from '@/lib/services/queries/productOrderPayment';
import type { ProductOrder } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';

function expectSettledInvalidation(invalidateSpy: MockInstance) {
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.agreements.all() });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productInventory.all() });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCompleteProductOrderPayment', () => {
  it('resolves with ok:true and invalidates the 3 caches on success', async () => {
    const successResult = { ok: true, order: { id: ORDER_ID } as ProductOrder } as const;
    vi.mocked(completeProductOrderPayment).mockResolvedValue(successResult);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(completeProductOrderPayment).mock.calls[0]?.[0]).toBe(ORDER_ID);
    expect(result.current.data).toEqual(successResult);
    expectSettledInvalidation(invalidateSpy);
  });

  it('resolves (does not throw) with ok:false on business failure, and still invalidates', async () => {
    const failureResult = { ok: false, step: 'payment', message: 'still pending' } as const;
    vi.mocked(completeProductOrderPayment).mockResolvedValue(failureResult);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(failureResult);
    expect(result.current.isError).toBe(false);
    expectSettledInvalidation(invalidateSpy);
  });

  it('invalidates the 3 caches even when the mutation rejects (onSettled fires on error too)', async () => {
    vi.mocked(completeProductOrderPayment).mockRejectedValue(new Error('network down'));
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('network down');
    expectSettledInvalidation(invalidateSpy);
  });
});

describe('useReconcileProductOrderPayment', () => {
  const order = { id: ORDER_ID, state: 'acknowledged' } as ProductOrder;

  it('resolves with the updated order and invalidates the 3 caches on success', async () => {
    const updatedOrder = { ...order, state: 'completed' } as ProductOrder;
    vi.mocked(reconcileProductOrderPayment).mockResolvedValue(updatedOrder);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(reconcileProductOrderPayment).mock.calls[0]?.[0]).toEqual(order);
    expect(result.current.data).toEqual(updatedOrder);
    expectSettledInvalidation(invalidateSpy);
  });

  it('resolves with null when there is nothing to reconcile, and still invalidates', async () => {
    vi.mocked(reconcileProductOrderPayment).mockResolvedValue(null);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
    expectSettledInvalidation(invalidateSpy);
  });

  it('invalidates the 3 caches even when the mutation rejects', async () => {
    vi.mocked(reconcileProductOrderPayment).mockRejectedValue(new Error('boom'));
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expectSettledInvalidation(invalidateSpy);
  });
});
