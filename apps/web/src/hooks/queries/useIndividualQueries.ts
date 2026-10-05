import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  createIndividual,
  fetchIndividualById,
  fetchIndividuals,
  patchIndividual,
} from '@/lib/services/queries/individual';
import type { Individual, NewIndividual } from '@/types/api';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/** Fetches the list of individuals. */
export const useIndividuals = (options?: {
  enabled?: boolean;
}): UseQueryResult<Individual[], Error> =>
  useQuery<Individual[], Error>({
    queryKey: queryKeys.individuals.list(),
    queryFn: () => fetchIndividuals(),
    enabled: options?.enabled,
  });

/** Fetches a single individual by id. Disabled when `id` is empty. */
export const useIndividual = (id: string): UseQueryResult<Individual, Error> =>
  useQuery<Individual, Error>({
    queryKey: queryKeys.individuals.detail(id),
    queryFn: () => fetchIndividualById(id),
    enabled: !!id,
  });

/** Creates an individual. */
export const useCreateIndividual = (): UseMutationResult<Individual, Error, NewIndividual> => {
  const invalidate = useInvalidate();
  return useMutation<Individual, Error, NewIndividual>({
    mutationFn: (body) => createIndividual(body),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.individuals.all());
    },
  });
};

/** Arguments of `usePatchIndividual`. */
export interface PatchIndividualArgs {
  id: string;
  data: Partial<NewIndividual>;
}

/** Partially updates an individual. */
export const usePatchIndividual = (): UseMutationResult<Individual, Error, PatchIndividualArgs> => {
  const invalidate = useInvalidate();
  return useMutation<Individual, Error, PatchIndividualArgs>({
    mutationFn: ({ id, data }) => patchIndividual(id, data),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.individuals.all());
    },
  });
};
