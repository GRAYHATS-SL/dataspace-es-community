import { useMutation, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProductSpecification,
  createProductSpecificationWithPolicy,
  deleteProductSpecification,
  getProductSpecificationById,
  getProductSpecifications,
  getProductSpecificationsAll,
  getProductSpecificationsAllPublic,
  patchProductSpecification,
  patchProductSpecificationWithPolicy,
  publishProductSpecification,
} from '@/lib/services/queries/productSpecification';
import type { OdrlFormData } from '@/lib/utils/productSpecPolicy';
import type { NewProductSpecification, ProductSpecification } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

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

/** Fetches the product specifications owned by the current organization. */
export const useProductSpecifications = productSpecificationQueries.useList;
/** Fetches a single product specification by id. Disabled when `id` is falsy. */
export const useProductSpecification = productSpecificationQueries.useDetail;
/** Creates a new product specification. Invalidates the product specifications cache. */
export const useCreateProductSpecification = productSpecificationQueries.useCreate;
/** Partially updates a product specification. Invalidates the product specifications cache. */
export const usePatchProductSpecification = productSpecificationQueries.usePatch;
/** Arguments of `useCreateProductSpecificationWithPolicy`. */
export type CreateProductSpecWithPolicyArgs = {
  input: Partial<NewProductSpecification>;
  policy: OdrlFormData;
};

/** Arguments of `usePatchProductSpecificationWithPolicy`. */
export type PatchProductSpecWithPolicyArgs = {
  id: string;
  payload: Partial<NewProductSpecification>;
  policy: OdrlFormData;
  /** Ids of current characteristics to remove. */
  removeCharIds?: string[];
};

/** Creates a product specification with its access policy (v2) in a single POST. */
export const useCreateProductSpecificationWithPolicy = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductSpecification, Error, CreateProductSpecWithPolicyArgs>({
    mutationFn: ({ input, policy }) => createProductSpecificationWithPolicy(input, policy),
    onSuccess: () => invalidate(queryKeys.productSpecifications.all()),
  });
};

/** Edits a product specification and its access policy (v2) in a single merged PATCH. */
export const usePatchProductSpecificationWithPolicy = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductSpecification, Error, PatchProductSpecWithPolicyArgs>({
    mutationFn: ({ id, payload, policy, removeCharIds }) =>
      patchProductSpecificationWithPolicy(id, payload, policy, removeCharIds),
    onSuccess: () => invalidate(queryKeys.productSpecifications.all()),
  });
};
/** Publishes a product specification (`lifecycleStatus` → `Launched`). */
export const usePublishProductSpecification = productSpecificationQueries.usePublish;
/** Deletes a product specification. Invalidates product specifications + offerings caches. */
export const useDeleteProductSpecification = productSpecificationQueries.useDelete;

/** React Query hook — fetches all product specifications across all organizations. */
export const useAllProductSpecificationsQuery = (options?: { enabled?: boolean }) =>
  useQuery<ProductSpecification[], Error>({
    queryKey: queryKeys.productSpecifications.list({ scope: 'all' }),
    queryFn: getProductSpecificationsAll,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });

/** React Query hook — public (unauthenticated) variant of `useAllProductSpecificationsQuery`. */
export const useProductSpecificationsAllPublicQuery = (options?: { enabled?: boolean }) =>
  useQuery<ProductSpecification[], Error>({
    queryKey: queryKeys.productSpecifications.list({ scope: 'public' }),
    queryFn: getProductSpecificationsAllPublic,
    staleTime: STALE_TIME.STABLE,
    enabled: options?.enabled,
  });

/** React Query hook — public (unauthenticated) variant of `useProductSpecification`. */
export const useProductSpecificationPublicQuery = (id: string, options?: { enabled?: boolean }) =>
  useQuery<ProductSpecification[], Error, ProductSpecification | undefined>({
    queryKey: queryKeys.productSpecifications.list({ scope: 'public' }),
    queryFn: getProductSpecificationsAllPublic,
    enabled: !!id && (options?.enabled ?? true),
    staleTime: STALE_TIME.STABLE,
    select: (specs) => specs.find((s) => s.id === id),
  });
