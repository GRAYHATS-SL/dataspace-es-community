import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  cancelProductOrder,
  createProductOrder,
  fetchProductOrderById,
  fetchProductOrders,
  linkAgreementToOrder,
  transitionProductOrderState,
} from '@/lib/services/queries/productOrder';
import type {
  CancelProductOrder,
  NewProductOrder,
  ProductOrder,
  ProductOrderState,
} from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/** Fetches the list of product orders. */
export const useProductOrders = (
  options?: ExtraQueryOptions<ProductOrder[]>,
): UseQueryResult<ProductOrder[], Error> =>
  useQuery<ProductOrder[], Error>({
    queryKey: queryKeys.productOrders.list(),
    queryFn: fetchProductOrders,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/** Fetches a single product order by id. Disabled when `id` is empty. */
export const useProductOrder = (id: string): UseQueryResult<ProductOrder, Error> =>
  useQuery<ProductOrder, Error>({
    queryKey: queryKeys.productOrders.detail(id),
    queryFn: () => fetchProductOrderById(id),
    enabled: !!id,
  });

/** Creates a product order. */
export const useCreateProductOrder = (): UseMutationResult<
  ProductOrder,
  Error,
  NewProductOrder
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, NewProductOrder>({
    mutationFn: createProductOrder,
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productOrders.all());
    },
  });
};

/** Arguments of `useTransitionProductOrder`. */
export interface TransitionProductOrderArgs {
  id: string;
  state: ProductOrderState;
}

/** Moves a product order to a new state. */
export const useTransitionProductOrder = (): UseMutationResult<
  ProductOrder,
  Error,
  TransitionProductOrderArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, TransitionProductOrderArgs>({
    mutationFn: ({ id, state }) => transitionProductOrderState(id, state),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productOrders.all());
    },
  });
};

/** Arguments of `useLinkAgreementToOrder`. */
export interface LinkAgreementToOrderArgs {
  orderId: string;
  agreementId: string;
  agreementName?: string;
}

/** Links an agreement to a product order. */
export const useLinkAgreementToOrder = (): UseMutationResult<
  ProductOrder,
  Error,
  LinkAgreementToOrderArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductOrder, Error, LinkAgreementToOrderArgs>({
    mutationFn: ({ orderId, agreementId, agreementName }) =>
      linkAgreementToOrder(orderId, agreementId, agreementName),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productOrders.all(), queryKeys.agreements.all());
    },
  });
};

/** Arguments of `useCancelProductOrder`. */
export interface CancelProductOrderArgs {
  id: string;
  reason?: string;
}

/** Requests the cancellation of a product order. */
export const useCancelProductOrder = (): UseMutationResult<
  CancelProductOrder,
  Error,
  CancelProductOrderArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<CancelProductOrder, Error, CancelProductOrderArgs>({
    mutationFn: ({ id, reason }) => cancelProductOrder(id, reason),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productOrders.all());
    },
  });
};
