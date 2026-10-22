import { useMutation, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createProduct,
  fetchProductById,
  fetchProductsAsBuyer,
  fetchProductsAsSeller,
  fetchProductsByAgreement,
  fetchProductsByBuyer,
  fetchProductsForOffering,
  updateProductStatus,
} from '@/lib/services/queries/productInventory';
import type { NewProductInventory, ProductInventory, ProductStatus } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/**
 * React Query hook — fetches the product inventory items owned by the current buyer.
 *
 * @returns A query result containing an array of {@link ProductInventory} objects.
 */
export const useProductInventory = () =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list(),
    queryFn: fetchProductsByBuyer,
    staleTime: STALE_TIME.TRANSACTIONAL,
  });

/**
 * React Query hook — fetches a single product inventory item by id.
 *
 * @param id - The TMForum product inventory identifier.
 * @returns A query result containing the {@link ProductInventory}. Disabled when `id` is falsy.
 */
export const useProductInventoryItem = (id: string) =>
  useQuery<ProductInventory, Error>({
    queryKey: queryKeys.productInventory.detail(id),
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });

/**
 * React Query hook — fetches the list of product inventory items as buyer.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link ProductInventory} objects.
 */
export const useProductInventoriesAsBuyer = (options?: ExtraQueryOptions<ProductInventory[]>) =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list({ role: 'buyer' }),
    queryFn: fetchProductsAsBuyer,
    ...options,
  });

/**
 * React Query hook — fetches the list of product inventory items as seller.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link ProductInventory} objects.
 */
export const useProductInventoriesAsSeller = (options?: ExtraQueryOptions<ProductInventory[]>) =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list({ role: 'seller' }),
    queryFn: fetchProductsAsSeller,
    ...options,
  });

/**
 * React Query hook — fetches the purchases of one offering (any buyer), trimmed to quote fields.
 *
 * @param offeringId - Offering id. Disabled when falsy.
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of trimmed {@link ProductInventory} objects.
 */
export const useProductInventoryForOffering = (
  offeringId: string,
  options?: ExtraQueryOptions<ProductInventory[]>,
) =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list({ scope: 'offering', offeringId }),
    queryFn: () => fetchProductsForOffering(offeringId),
    enabled: !!offeringId,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — fetches the list of product inventory items linked to an agreement.
 *
 * @param agreementId - The TMForum agreement identifier to filter by.
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link ProductInventory} objects. Disabled when `agreementId` is falsy.
 */
export const useProductsByAgreement = (
  agreementId: string,
  options?: ExtraQueryOptions<ProductInventory[]>,
) =>
  useQuery<ProductInventory[], Error>({
    queryKey: queryKeys.productInventory.list({ agreementId }),
    queryFn: () => fetchProductsByAgreement(agreementId),
    enabled: !!agreementId,
    ...options,
  });

/**
 * Mutation hook — creates a new product inventory item.
 *
 * @returns A mutation result accepting a {@link NewProductInventory} payload.
 */
export const useCreateProduct = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductInventory, Error, NewProductInventory>({
    mutationFn: createProduct,
    onSuccess: () => invalidate(queryKeys.productInventory.all()),
  });
};

/**
 * Mutation hook — updates the status of a product inventory item.
 *
 * @returns A mutation result accepting `{ id: string; status: ProductStatus }`.
 */
export const useUpdateProductStatus = () => {
  const invalidate = useInvalidate();
  return useMutation<ProductInventory, Error, { id: string; status: ProductStatus }>({
    mutationFn: ({ id, status }) => updateProductStatus(id, status),
    onSuccess: () => invalidate(queryKeys.productInventory.all()),
  });
};
