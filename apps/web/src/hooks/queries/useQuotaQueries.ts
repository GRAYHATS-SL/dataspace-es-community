import { useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  type BuyerQuotaEntry,
  fetchMyQuotas,
  fetchProviderQuotas,
  type ProviderQuotaSweep,
} from '@/lib/services/queries/quota';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';

/**
 * React Query hook — usage of the metered offerings bought by the active organization.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing one {@link BuyerQuotaEntry} per metered offering bought.
 */
export const useMyQuotas = (options?: ExtraQueryOptions<BuyerQuotaEntry[]>) =>
  useQuery<BuyerQuotaEntry[], Error>({
    queryKey: queryKeys.quotas.list({ role: 'buyer' }),
    queryFn: fetchMyQuotas,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — usage of the organization's own metered offerings by consumers.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing a {@link ProviderQuotaSweep}.
 */
export const useProviderQuotas = (options?: ExtraQueryOptions<ProviderQuotaSweep>) =>
  useQuery<ProviderQuotaSweep, Error>({
    queryKey: queryKeys.quotas.list({ role: 'seller' }),
    queryFn: fetchProviderQuotas,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });
