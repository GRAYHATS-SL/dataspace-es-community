import { useMutation, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createAgreement,
  fetchAgreementById,
  fetchAgreementsAsBuyer,
  fetchAgreementsAsSeller,
  updateAgreementStatus,
} from '@/lib/services/queries/agreement';
import type { Agreement, NewAgreement } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/**
 * React Query hook — fetches the list of agreements where the current user is the buyer.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link Agreement} objects.
 */
export const useAgreementsAsBuyer = (options?: ExtraQueryOptions<Agreement[]>) =>
  useQuery<Agreement[], Error>({
    queryKey: queryKeys.agreements.list({ role: 'buyer' }),
    queryFn: fetchAgreementsAsBuyer,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — fetches the list of agreements where the current user is the seller.
 *
 * @param options - Additional React Query options to merge.
 * @returns A query result containing an array of {@link Agreement} objects.
 */
export const useAgreementsAsSeller = (options?: ExtraQueryOptions<Agreement[]>) =>
  useQuery<Agreement[], Error>({
    queryKey: queryKeys.agreements.list({ role: 'seller' }),
    queryFn: fetchAgreementsAsSeller,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/**
 * React Query hook — fetches a single agreement by id.
 *
 * @param id - The TMForum agreement identifier.
 * @returns A query result containing the {@link Agreement}. Disabled when `id` is falsy.
 */
export const useAgreement = (id: string) =>
  useQuery<Agreement, Error>({
    queryKey: queryKeys.agreements.detail(id),
    queryFn: () => fetchAgreementById(id),
    enabled: !!id,
  });

/**
 * Mutation hook — creates a new agreement.
 *
 * @returns A mutation result accepting a {@link NewAgreement} payload.
 */
export const useCreateAgreement = () => {
  const invalidate = useInvalidate();
  return useMutation<Agreement, Error, NewAgreement>({
    mutationFn: createAgreement,
    onSuccess: () => invalidate(queryKeys.agreements.all()),
  });
};

/**
 * Mutation hook — updates the status of an agreement.
 *
 * @returns A mutation result accepting `{ id: string; status: string }`.
 */
export const useUpdateAgreementStatus = () => {
  const invalidate = useInvalidate();
  return useMutation<Agreement, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) => updateAgreementStatus(id, status),
    onSuccess: () => invalidate(queryKeys.agreements.all()),
  });
};
