import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import { getUsagesByProduct } from '@/lib/services/queries/usage';
import type { Usage } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';

/** Fetches the usage records of a product. Disabled when `productId` is empty. */
export const useUsagesByProduct = (
  productId: string,
  options?: ExtraQueryOptions<Usage[]>,
): UseQueryResult<Usage[], Error> =>
  useQuery<Usage[], Error>({
    queryKey: queryKeys.usages.list({ productId }),
    queryFn: () => getUsagesByProduct(productId),
    enabled: !!productId,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });
