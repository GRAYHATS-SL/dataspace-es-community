import { useMutation, useQuery } from '@tanstack/react-query';

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

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';
import type { PriceRef } from './types';
import { useInvalidate } from './useInvalidate';

const productOfferingQueries = createEntityQueries<ProductOffering, NewProductOffering>({
  keys: queryKeys.offerings,
  service: {
    list: fetchProductOfferings,
    byId: fetchProductOfferingById,
    create: createProductOffering,
    patch: patchProductOffering,
    publish: publishProductOffering,
    delete: deleteProductOffering,
  },
});

/** Fetches the list of product offerings owned by the current organization. */
export const useProductOfferings = productOfferingQueries.useList;
/** Fetches a single product offering by id. Disabled when `id` is falsy. */
export const useProductOffering = productOfferingQueries.useDetail;
/** Creates a new product offering. Invalidates the offerings cache. */
export const useCreateProductOffering = productOfferingQueries.useCreate;
/** Partially updates a product offering. Invalidates the offerings cache. */
export const usePatchProductOffering = productOfferingQueries.usePatch;
/** Publishes a product offering (`lifecycleStatus` → `Launched`). */
export const usePublishProductOffering = productOfferingQueries.usePublish;
/** Deletes a product offering. Invalidates the offerings cache. */
export const useDeleteProductOffering = productOfferingQueries.useDelete;

/** React Query hook — public (unauthenticated) variant of `useProductOfferings`. */
export const useProductOfferingsPublic = (options?: { enabled?: boolean }) =>
  useQuery<ProductOffering[], Error>({
    queryKey: queryKeys.offerings.list({ scope: 'public' }),
    queryFn: fetchProductOfferingsPublic,
    enabled: options?.enabled,
  });

/** Mutation hook — replaces the category references on a product offering. */
export const usePatchProductOfferingCategories = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOffering, Error, { id: string; categoryIds: string[] }>({
    mutationFn: ({ id, categoryIds }) => setProductOfferingCategories(id, categoryIds),
    onSuccess: () => invalidate(queryKeys.offerings.all()),
  });
};

/** Mutation hook — replaces the full list of price references on a product offering. */
export const useSetOfferingPriceRefs = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductOffering, Error, { id: string; priceIds: string[] }>({
    mutationFn: ({ id, priceIds }) => setProductOfferingPriceRefs(id, priceIds),
    onSuccess: () => invalidate(queryKeys.offerings.all()),
  });
};

/** Mutation hook — appends a single price reference to a product offering. */
export const useAddOfferingPriceRef = () => {
  const invalidate = useInvalidate();
  return useMutation<
    ProductOffering,
    Error,
    { offeringId: string; priceId: string; currentPrices: PriceRef[] }
  >({
    mutationFn: ({ offeringId, priceId, currentPrices }) =>
      addOfferingPriceRef(offeringId, priceId, currentPrices),
    onSuccess: () => invalidate(queryKeys.offerings.all()),
  });
};

/** Mutation hook — removes a single price reference from a product offering. */
export const useRemoveOfferingPriceRef = () => {
  const invalidate = useInvalidate();
  return useMutation<
    ProductOffering,
    Error,
    { offeringId: string; priceId: string; currentPrices: PriceRef[] }
  >({
    mutationFn: ({ offeringId, priceId, currentPrices }) =>
      removeOfferingPriceRef(offeringId, priceId, currentPrices),
    onSuccess: () => invalidate(queryKeys.offerings.all()),
  });
};
