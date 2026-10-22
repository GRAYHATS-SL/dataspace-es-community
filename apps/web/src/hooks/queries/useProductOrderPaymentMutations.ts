import { useMutation } from '@tanstack/react-query';

import type { CompleteOrderPaymentResult } from '@/lib/services/queries/productOrderFinalize';
import {
  completeProductOrderPayment,
  reconcileProductOrderPayment,
} from '@/lib/services/queries/productOrderPayment';
import type { ProductOrder } from '@/types/api';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/**
 * Mutation hook — verifies a product order's payment server-side (against Stripe) and, if it
 * succeeded, completes the order and provisions the agreement/product in one step. Resolves
 * with a discriminated result (`ok: true/false`) instead of rejecting.
 */
export const useCompleteProductOrderPayment = () => {
  const invalidate = useInvalidate();
  return useMutation<CompleteOrderPaymentResult, Error, string>({
    mutationFn: completeProductOrderPayment,
    onSettled: () =>
      invalidate(
        queryKeys.productOrders.all(),
        queryKeys.agreements.all(),
        queryKeys.productInventory.all(),
      ),
  });
};

/**
 * Mutation hook — re-checks an order's payment status against Stripe and completes or rejects
 * it accordingly. Used for orphaned orders (browser never returned from checkout).
 */
export const useReconcileProductOrderPayment = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder | null, Error, ProductOrder>({
    mutationFn: reconcileProductOrderPayment,
    onSettled: () =>
      invalidate(
        queryKeys.productOrders.all(),
        queryKeys.agreements.all(),
        queryKeys.productInventory.all(),
      ),
  });
};
