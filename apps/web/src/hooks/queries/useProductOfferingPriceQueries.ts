import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProductOfferingPrice,
  deleteProductOfferingPrice,
  getOwnProductOfferingPrices,
  getProductOfferingPriceById,
  getProductOfferingPrices,
  getProductOfferingPricesPublic,
  patchProductOfferingPrice,
} from '@/lib/services/queries/productOfferingPrice';
import type { NewProductOfferingPrice, ProductOfferingPrice } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const productOfferingPriceQueries = createEntityQueries<
  ProductOfferingPrice,
  NewProductOfferingPrice,
  Partial<NewProductOfferingPrice>
>({
  keys: queryKeys.offeringPrices,
  staleTime: STALE_TIME.STABLE,
  service: {
    list: getProductOfferingPrices,
    byId: getProductOfferingPriceById,
    create: createProductOfferingPrice,
    patch: patchProductOfferingPrice,
    delete: deleteProductOfferingPrice,
  },
  invalidateOnDelete: [queryKeys.offerings.all()],
});

/** Fetches the list of product offering prices. */
export const useProductOfferingPrices = productOfferingPriceQueries.useList;
/** Fetches only the current organization's prices. */
export const useOwnProductOfferingPrices = (options?: { enabled?: boolean }) =>
  useQuery<ProductOfferingPrice[], Error>({
    queryKey: queryKeys.offeringPrices.list({ scope: 'own' }),
    queryFn: getOwnProductOfferingPrices,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });
/** Fetches a single product offering price by id. Disabled when `id` is falsy. */
export const useProductOfferingPrice = productOfferingPriceQueries.useDetail;
/** Creates a new product offering price. Invalidates the offering prices cache. */
export const useCreateProductOfferingPrice = productOfferingPriceQueries.useCreate;
/** Partially updates a product offering price. Invalidates the offering prices cache. */
export const usePatchProductOfferingPrice = productOfferingPriceQueries.usePatch;
/** Deletes a product offering price. Invalidates offering prices + offerings caches. */
export const useDeleteProductOfferingPrice = productOfferingPriceQueries.useDelete;

/** React Query hook — public (unauthenticated) variant of `useProductOfferingPrices`. */
export const useProductOfferingPricesPublicQuery = (options?: { enabled?: boolean }) =>
  useQuery<ProductOfferingPrice[], Error>({
    queryKey: queryKeys.offeringPrices.list({ scope: 'public' }),
    queryFn: getProductOfferingPricesPublic,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });
