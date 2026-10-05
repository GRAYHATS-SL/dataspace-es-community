'use server';

import type { NewOrganization, Organization } from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/party/v4/organization';

/** Lists organizations. */
export async function fetchOrganizations(): Promise<Organization[]> {
  // Here you define your business logic (scoping, filtering...).
  return apiFetch<Organization[]>(withLimit(BASE));
}

/** Fetches a single organization by id. */
export async function fetchOrganizationById(id: string): Promise<Organization> {
  // Here you define your business logic.
  return apiFetch<Organization>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Partially updates an organization. */
export async function patchOrganization(
  id: string,
  patch: Partial<NewOrganization>,
): Promise<Organization> {
  // Here you define your business logic.
  return apiFetch<Organization>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Returns the id of the organization identified by an external identifier, if any. */
export async function findOrganizationIdByExternalId(

  _externalId: string,
  accessToken?: string,
): Promise<string | undefined> {
  await apiFetch<Organization[]>(withLimit(BASE), undefined, accessToken);
  // Here you define your business logic (how an organization is matched to the identifier).
  return undefined;
}
