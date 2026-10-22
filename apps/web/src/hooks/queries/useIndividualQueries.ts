import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as individualApi from '@/lib/services/queries/individual';
import type { Individual, NewIndividual } from '@/types/api';

import { queryKeys } from './queryKeys';

/**
 * React Query hook — fetches the list of individuals.
 *
 * @returns A query result containing an array of {@link Individual} objects.
 */
export const useIndividuals = () =>
  useQuery<Individual[], Error>({
    queryKey: queryKeys.individuals.list(),
    queryFn: () => individualApi.fetchIndividuals(),
  });

/**
 * React Query hook — fetches a single individual by id.
 *
 * @param id - The TMForum individual identifier.
 * @returns A query result containing the {@link Individual}, or `undefined` if not found. Disabled when `id` is falsy.
 */
export const useIndividual = (id: string) =>
  useQuery<Individual | undefined, Error>({
    queryFn: () => individualApi.fetchIndividualById(id),
    queryKey: queryKeys.individuals.detail(id),
    enabled: !!id,
  });

/**
 * Mutation hook — creates a new individual.
 *
 * @returns A mutation result accepting a {@link NewIndividual} payload.
 */
export const useCreateIndividual = () => {
  const queryClient = useQueryClient();
  return useMutation<Individual, Error, NewIndividual>({
    mutationFn: (body) => individualApi.createIndividual(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.individuals.all() }),
  });
};

/**
 * Mutation hook — partially updates an individual.
 *
 * @returns A mutation result accepting `{ id: string; data: Partial<NewIndividual> }`.
 */
export const usePatchIndividual = () => {
  const queryClient = useQueryClient();
  return useMutation<Individual, Error, { id: string; data: Partial<NewIndividual> }>({
    mutationFn: ({ id, data }) => individualApi.patchIndividual(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.individuals.all() }),
  });
};
