import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import {
  fetchOrganizationById,
  fetchOrganizations,
  patchOrganization,
} from '@/lib/services/queries/party';
import type { NewOrganization, Organization } from '@/types/api';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/** Fetches the list of organizations. */
export const useOrganizations = (options?: {
  enabled?: boolean;
}): UseQueryResult<Organization[], Error> =>
  useQuery<Organization[], Error>({
    queryKey: queryKeys.organizations.list(),
    queryFn: fetchOrganizations,
    enabled: options?.enabled,
  });

/** Fetches a single organization by id. Disabled when `id` is empty. */
export const useOrganizationById = (id: string): UseQueryResult<Organization, Error> =>
  useQuery<Organization, Error>({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: () => fetchOrganizationById(id),
    enabled: !!id,
  });

/** Arguments of `usePatchOrganization`. */
export interface PatchOrganizationArgs {
  id: string;
  data: Partial<NewOrganization>;
}

/** Partially updates an organization. */
export const usePatchOrganization = (): UseMutationResult<
  Organization,
  Error,
  PatchOrganizationArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<Organization, Error, PatchOrganizationArgs>({
    mutationFn: ({ id, data }) => patchOrganization(id, data),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.organizations.all());
    },
  });
};
