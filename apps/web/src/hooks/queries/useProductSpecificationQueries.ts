import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProductSpecification,
  deleteProductSpecification,
  getProductSpecificationById,
  getProductSpecificationByIdPublic,
  getProductSpecifications,
  getProductSpecificationsAllPublic,
  patchProductSpecification,
  publishProductSpecification,
} from '@/lib/services/queries/productSpecification';
import type { NewProductSpecification, ProductSpecification } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const productSpecificationQueries = createEntityQueries<
  ProductSpecification,
  NewProductSpecification,
  Partial<NewProductSpecification>
>({
  keys: queryKeys.productSpecifications,
  staleTime: STALE_TIME.STABLE,
  service: {
    list: getProductSpecifications,
    byId: getProductSpecificationById,
    create: createProductSpecification,
    patch: patchProductSpecification,
    publish: publishProductSpecification,
    delete: deleteProductSpecification,
  },
  invalidateOnDelete: [queryKeys.offerings.all()],
});

/** Fetches the list of product specifications. */
export const useProductSpecifications = productSpecificationQueries.useList;
/** Fetches a single product specification by id. Disabled when `id` is empty. */
export const useProductSpecification = productSpecificationQueries.useDetail;
/** Creates a product specification. */
export const useCreateProductSpecification = productSpecificationQueries.useCreate;
/** Partially updates a product specification. */
export const usePatchProductSpecification = productSpecificationQueries.usePatch;
/** Publishes a product specification. */
export const usePublishProductSpecification = productSpecificationQueries.usePublish;
/** Deletes a product specification. */
export const useDeleteProductSpecification = productSpecificationQueries.useDelete;

/** Fetches the product specifications of the public catalog (no authentication). */
export const useProductSpecificationsAllPublicQuery = (options?: {
  enabled?: boolean;
}): UseQueryResult<ProductSpecification[], Error> =>
  useQuery<ProductSpecification[], Error>({
    queryKey: queryKeys.productSpecifications.list({ scope: 'public' }),
    queryFn: getProductSpecificationsAllPublic,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });

/** Fetches a single product specification from the public catalog. Disabled when `id` is empty. */
export const useProductSpecificationPublicQuery = (
  id: string,
  options?: { enabled?: boolean },
): UseQueryResult<ProductSpecification, Error> =>
  useQuery<ProductSpecification, Error>({
    queryKey: queryKeys.productSpecifications.detail(`public:${id}`),
    queryFn: () => getProductSpecificationByIdPublic(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: STALE_TIME.STABLE,
  });
