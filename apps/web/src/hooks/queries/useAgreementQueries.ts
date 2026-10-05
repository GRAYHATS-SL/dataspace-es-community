import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createAgreement,
  fetchAgreementById,
  fetchAgreements,
  updateAgreementStatus,
} from '@/lib/services/queries/agreement';
import type { Agreement, NewAgreement } from '@/types/api';

import { queryKeys } from './queryKeys';
import type { ExtraQueryOptions } from './types';
import { useInvalidate } from './useInvalidate';

/** Fetches the list of agreements. */
export const useAgreements = (
  options?: ExtraQueryOptions<Agreement[]>,
): UseQueryResult<Agreement[], Error> =>
  useQuery<Agreement[], Error>({
    queryKey: queryKeys.agreements.list(),
    queryFn: fetchAgreements,
    staleTime: STALE_TIME.TRANSACTIONAL,
    ...options,
  });

/** Fetches a single agreement by id. Disabled when `id` is empty. */
export const useAgreement = (id: string): UseQueryResult<Agreement, Error> =>
  useQuery<Agreement, Error>({
    queryKey: queryKeys.agreements.detail(id),
    queryFn: () => fetchAgreementById(id),
    enabled: !!id,
  });

/** Creates an agreement. */
export const useCreateAgreement = (): UseMutationResult<Agreement, Error, NewAgreement> => {
  const invalidate = useInvalidate();
  return useMutation<Agreement, Error, NewAgreement>({
    mutationFn: createAgreement,
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.agreements.all());
    },
  });
};

/** Arguments of `useUpdateAgreementStatus`. */
export interface UpdateAgreementStatusArgs {
  id: string;
  status: string;
}

/** Updates the status of an agreement. */
export const useUpdateAgreementStatus = (): UseMutationResult<
  Agreement,
  Error,
  UpdateAgreementStatusArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<Agreement, Error, UpdateAgreementStatusArgs>({
    mutationFn: ({ id, status }) => updateAgreementStatus(id, status),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.agreements.all());
    },
  });
};
