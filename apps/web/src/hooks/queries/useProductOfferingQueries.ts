import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  createProductOffering,
  deleteProductOffering,
  fetchProductOfferingById,
  fetchProductOfferings,
  fetchProductOfferingsPublic,
  patchProductOffering,
  publishProductOffering,
  setProductOfferingCategories,
} from '@/lib/services/queries/productOffering';
import type { NewProductOffering, ProductOffering } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';
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

/** Fetches the list of product offerings. */
export const useProductOfferings = productOfferingQueries.useList;
/** Fetches a single product offering by id. Disabled when `id` is empty. */
export const useProductOffering = productOfferingQueries.useDetail;
/** Creates a product offering. */
export const useCreateProductOffering = productOfferingQueries.useCreate;
/** Partially updates a product offering. */
export const usePatchProductOffering = productOfferingQueries.usePatch;
/** Publishes a product offering. */
export const usePublishProductOffering = productOfferingQueries.usePublish;
/** Deletes a product offering. */
export const useDeleteProductOffering = productOfferingQueries.useDelete;

/** Fetches the product offerings of the public catalog (no authentication). */
export const useProductOfferingsPublic = (options?: {
  enabled?: boolean;
}): UseQueryResult<ProductOffering[], Error> =>
  useQuery<ProductOffering[], Error>({
    queryKey: queryKeys.offerings.list({ scope: 'public' }),
    queryFn: fetchProductOfferingsPublic,
    enabled: options?.enabled,
  });

/** Arguments of `usePatchProductOfferingCategories`. */
export interface PatchProductOfferingCategoriesArgs {
  id: string;
  categoryIds: string[];
}

/** Replaces the category references of a product offering. */
export const usePatchProductOfferingCategories = (): UseMutationResult<
  ProductOffering,
  Error,
  PatchProductOfferingCategoriesArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductOffering, Error, PatchProductOfferingCategoriesArgs>({
    mutationFn: ({ id, categoryIds }) => setProductOfferingCategories(id, categoryIds),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.offerings.all(), queryKeys.categories.all());
    },
  });
};
