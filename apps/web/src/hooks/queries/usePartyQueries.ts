import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  type SaveStripeAccountResult,
  saveStripeConnectAccountId,
} from '@/lib/services/payments/stripe';
import * as partyApi from '@/lib/services/queries/party';
import type { NewOrganization, Organization } from '@/types/api';

import { queryKeys } from './queryKeys';

/**
 * React Query hook — fetches the list of organizations.
 *
 * @param options.enabled - Set to `false` to skip the request until it's actually needed.
 * @returns A query result containing an array of {@link Organization} objects.
 */
export const useOrganizations = (options?: { enabled?: boolean }) =>
  useQuery<Organization[], Error>({
    queryKey: queryKeys.organizations.list(),
    queryFn: () => partyApi.fetchOrganizations(),
    staleTime: STALE_TIME.ORGANIZATION,
    enabled: options?.enabled,
  });

/**
 * React Query hook — fetches a single organization by id.
 *
 * @param id - The TMForum organization identifier.
 * @returns A query result containing the {@link Organization}, or `undefined` if not found. Disabled when `id` is falsy.
 */
export const useOrganizationById = (id: string) =>
  useQuery<Organization | undefined, Error>({
    queryFn: () => partyApi.fetchOrganizationById(id),
    queryKey: queryKeys.organizations.detail(id),
    enabled: !!id,
  });

/**
 * Mutation hook — partially updates an organization.
 *
 * @returns A mutation result accepting `{ id: string; data: Partial<NewOrganization> }`.
 */
export const usePatchOrganization = () => {
  const queryClient = useQueryClient();
  return useMutation<Organization, Error, { id: string; data: Partial<NewOrganization> }>({
    mutationFn: ({ id, data }) => partyApi.patchOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all() });
    },
  });
};

/**
 * Mutation hook — validates a Stripe Connect account id against Stripe and, if it can receive
 * charges and payouts, saves it to the organization's `partyCharacteristic`.
 *
 * @returns A mutation result accepting `{ stripeAccountId: string }` (the organization comes from the server session).
 */
export const useSaveStripeConnectAccountId = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SaveStripeAccountResult,
    Error,
    { stripeAccountId: string }
  >({
    mutationFn: ({ stripeAccountId }) => saveStripeConnectAccountId(stripeAccountId),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all() });
      }
    },
  });
};
