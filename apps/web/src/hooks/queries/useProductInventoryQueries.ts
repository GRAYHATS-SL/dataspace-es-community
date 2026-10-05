import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProduct,
  fetchProductById,
  fetchProducts,
  fetchProductsByAgreement,
  updateProductStatus,
} from '@/lib/services/queries/productInventory';
import type { NewProductInventory, ProductInventory, ProductStatus } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/** Fetches the list of inventory products. */
export const useProductInventory = (
  options?: ExtraQueryOptions<ProductInventory[]>,
): UseQueryResult<ProductInventory[], Error> =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list(),
    queryFn: fetchProducts,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/** Fetches a single inventory product by id. Disabled when `id` is empty. */
export const useProductInventoryItem = (id: string): UseQueryResult<ProductInventory, Error> =>
  useQuery<ProductInventory, Error>({
    queryKey: queryKeys.productInventory.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });

/** Fetches the inventory products bound to an agreement. Disabled when `agreementId` is empty. */
export const useProductsByAgreement = (
  agreementId: string,
  options?: ExtraQueryOptions<ProductInventory[]>,
): UseQueryResult<ProductInventory[], Error> =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list({ agreementId }),
    queryFn: () => fetchProductsByAgreement(agreementId),
    enabled: !!agreementId,
    ...options,
  });

/** Creates an inventory product. */
export const useCreateProduct = (): UseMutationResult<
  ProductInventory,
  Error,
  NewProductInventory
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductInventory, Error, NewProductInventory>({
    mutationFn: createProduct,
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productInventory.all());
    },
  });
};

/** Arguments of `useUpdateProductStatus`. */
export interface UpdateProductStatusArgs {
  id: string;
  status: ProductStatus;
}

/** Updates the status of an inventory product. */
export const useUpdateProductStatus = (): UseMutationResult<
  ProductInventory,
  Error,
  UpdateProductStatusArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<ProductInventory, Error, UpdateProductStatusArgs>({
    mutationFn: ({ id, status }) => updateProductStatus(id, status),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.productInventory.all());
    },
  });
};
