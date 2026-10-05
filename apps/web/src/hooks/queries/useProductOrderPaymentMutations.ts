import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import {
  type CompleteOrderPaymentResult,
  completeProductOrderPayment,
  reconcileProductOrderPayment,
} from '@/lib/services/queries/productOrderPayment';
import type { ProductOrder } from '@/types/api';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/** Verifies an order's payment server-side and completes the order (resolves with `ok: true/false`). */
export const useCompleteProductOrderPayment = (): UseMutationResult<
  CompleteOrderPaymentResult,
  Error,
  string
> => {
  const invalidate = useInvalidate();
  return useMutation<CompleteOrderPaymentResult, Error, string>({
    mutationFn: completeProductOrderPayment,
    onSettled: () => {
      // Here you define your cache/side-effect logic.
      invalidate(
        queryKeys.productOrders.all(),
        queryKeys.agreements.all(),
        queryKeys.productInventory.all(),
      );
    },
  });
};

/** Re-checks an orphaned order's payment and completes or rejects it (`null` when unchanged). */
export const useReconcileProductOrderPayment = (): UseMutationResult<
  ProductOrder | null,
  Error,
  ProductOrder
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder | null, Error, ProductOrder>({
    mutationFn: reconcileProductOrderPayment,
    onSettled: () => {
      // Here you define your cache/side-effect logic.
      invalidate(
        queryKeys.productOrders.all(),
        queryKeys.agreements.all(),
        queryKeys.productInventory.all(),
      );
    },
  });
};
