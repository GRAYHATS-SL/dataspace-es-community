import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import { getUsagesByProduct } from '@/lib/services/queries/usage';
import type { Usage } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';

/**
 * React Query hook — usage (TMF635) recorded for a token (`Product`).
 *
 * @param productId - `Product` (token) id. Disabled when falsy.
 * @param options - Additional `useQuery` options to merge.
 * @returns A query result containing an array of {@link Usage}.
 */
export const useUsagesByProduct = (productId: string, options?: ExtraQueryOptions<Usage[]>) =>
  useQuery<Usage[], Error>({
    queryKey: queryKeys.usages.list({ productId }),
    queryFn: () => getUsagesByProduct(productId),
    enabled: !!productId,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });
