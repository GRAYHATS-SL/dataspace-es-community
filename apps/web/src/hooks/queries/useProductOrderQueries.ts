import { useMutation, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  cancelProductOrder,
  createProductOrder,
  fetchProductOrderById,
  fetchProductOrdersAsBuyer,
  fetchProductOrdersAsSeller,
  linkAgreementToOrder,
  transitionProductOrderState,
} from '@/lib/services/queries/productOrder';
import type {
  NewProductOrder,
  ProductOrder,
  ProductOrderState,
} from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/**
 * React Query hook — fetches the list of product orders where the current user is the buyer.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link ProductOrder} objects.
 */
export const useProductOrdersAsBuyer = (options?: ExtraQueryOptions<ProductOrder[]>) =>
  useQuery<ProductOrder[], Error>({
    queryKey: queryKeys.productOrders.list({ role: 'buyer' }),
    queryFn: fetchProductOrdersAsBuyer,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — fetches the list of product orders where the current user is the seller.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link ProductOrder} objects.
 */
export const useProductOrdersAsSeller = (options?: ExtraQueryOptions<ProductOrder[]>) =>
  useQuery<ProductOrder[], Error>({
    queryKey: queryKeys.productOrders.list({ role: 'seller' }),
    queryFn: fetchProductOrdersAsSeller,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — fetches a single product order by id.
 *
 * @param id - The TMForum product order identifier.
 * @returns A query result containing the {@link ProductOrder}. Disabled when `id` is falsy.
 */
export const useProductOrder = (id: string) =>
  useQuery<ProductOrder, Error>({
    queryKey: queryKeys.productOrders.detail(id),
    queryFn: () => fetchProductOrderById(id),
    enabled: !!id,
  });

/**
 * Mutation hook — creates a new product order.
 *
 * @returns A mutation result accepting a {@link NewProductOrder} payload.
 */
export const useCreateProductOrder = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, NewProductOrder>({
    mutationFn: createProductOrder,
    onSuccess: () => invalidate(queryKeys.productOrders.all()),
  });
};

/**
 * Mutation hook — transitions a product order to a new lifecycle state.
 *
 * @returns A mutation result accepting `{ id: string; state: ProductOrderState }`.
 */
export const useTransitionProductOrder = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, { id: string; state: ProductOrderState }>({
    mutationFn: ({ id, state }) => transitionProductOrderState(id, state),
    onSuccess: () => invalidate(queryKeys.productOrders.all()),
  });
};

/**
 * Mutation hook — links an agreement to a product order.
 *
 * @returns A mutation result accepting `{ orderId: string; agreementId: string; agreementName?: string }`.
 */
export const useLinkAgreementToOrder = () => {
  const invalidate = useInvalidate();
  return useMutation<
    ProductOrder,
    Error,
    { orderId: string; agreementId: string; agreementName?: string }
  >({
    mutationFn: ({ orderId, agreementId, agreementName }) =>
      linkAgreementToOrder(orderId, agreementId, agreementName),
    onSuccess: () => invalidate(queryKeys.productOrders.all()),
  });
};

/**
 * Mutation hook — cancels a product order (v2: `PATCH {state:"cancelled"}` with the backend token).
 *
 * @returns A mutation result accepting `{ id: string; reason?: string }`.
 */
export const useCancelProductOrder = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, { id: string; reason?: string }>({
    mutationFn: ({ id }) => cancelProductOrder(id),
    onSuccess: () => invalidate(queryKeys.productOrders.all()),
  });
};
