import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProductOfferingPrice,
  deleteProductOfferingPrice,
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
/** Fetches a single product offering price by id. Disabled when `id` is empty. */
export const useProductOfferingPrice = productOfferingPriceQueries.useDetail;
/** Creates a product offering price. */
export const useCreateProductOfferingPrice = productOfferingPriceQueries.useCreate;
/** Partially updates a product offering price. */
export const usePatchProductOfferingPrice = productOfferingPriceQueries.usePatch;
/** Deletes a product offering price. */
export const useDeleteProductOfferingPrice = productOfferingPriceQueries.useDelete;

/** Fetches the product offering prices of the public catalog (no authentication). */
export const useProductOfferingPricesPublicQuery = (options?: {
  enabled?: boolean;
}): UseQueryResult<ProductOfferingPrice[], Error> =>
  useQuery<ProductOfferingPrice[], Error>({
    queryKey: queryKeys.offeringPrices.list({ scope: 'public' }),
    queryFn: getProductOfferingPricesPublic,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });
