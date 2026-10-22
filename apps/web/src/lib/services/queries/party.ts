'use server';

import { isOrganizationActive } from '@/lib/utils/organizationStatus';
import type { NewOrganization, Organization } from '@/types/api';

import { apiFetch, apiFetchAll, assertOwnOrganization } from './_utils';

const BASE = '/tmf-api/party/v4/organization';

/**
 * @summary Gets all organizations registered in the Party API.
 *
 * @returns {Promise<Organization[]>} All organizations.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const orgs = await fetchOrganizations();
 */
export async function fetchOrganizations(): Promise<Organization[]> {
  return apiFetchAll<Organization>(BASE);
}

/**
 * @summary Gets an organization by id.
 *
 * @param {string}  id - Organization id (may be a DID).
 * @returns {Promise<Organization>} The organization.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const org = await fetchOrganizationById('urn:ngsi-ld:organization:abc123');
 */
export async function fetchOrganizationById(id: string): Promise<Organization> {
  return apiFetch<Organization>(`${BASE}/${encodeURIComponent(id)}`);
}

export async function patchOrganization(
  id: string,
  patch: Partial<NewOrganization>,
): Promise<Organization> {
  await assertOwnOrganization(id);
  return apiFetch<Organization>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * @summary Finds the id of the organization whose `partyCharacteristic.did` matches a DID.
 *
 * @param {string}  did - DID to look up.
 * @param {string}  [accessToken] - Explicit JWT; defaults to the session token.
 * @returns {Promise<string | undefined>} The organization id, or `undefined` if none matches.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const organizationId = await findOrganizationIdByDid(sub, accessToken);
 */
export async function findOrganizationIdByDid(
  did: string,
  accessToken?: string,
): Promise<string | undefined> {
  return findOrganizationIdByDids([did], accessToken);
}

/**
 * @summary Finds the organization whose `did` matches one of the candidates.
 */
export async function findOrganizationByDids(
  dids: string[],
  accessToken?: string,
): Promise<Organization | undefined> {
  const orgs = await apiFetchAll<Organization>(BASE, undefined, accessToken);
  for (const did of dids) {
    const match = orgs.find((o) =>
      o.partyCharacteristic?.some((c) => c.name === 'did' && c.value === did),
    );
    if (match) return match;
  }
  return undefined;
}

/**
 * @summary Finds the active organization id whose `did` matches one of the candidates.
 */
export async function findOrganizationIdByDids(
  dids: string[],
  accessToken?: string,
): Promise<string | undefined> {
  const org = await findOrganizationByDids(dids, accessToken);
  return org && isOrganizationActive(org) ? org.id : undefined;
}

/**
 * @summary Adds or updates an organization's `partyCharacteristic` while keeping the rest.
 *
 * @param {string}  id - Organization id.
 * @param {Characteristic[]}  chars - Characteristics to add or replace by name.
 * @returns {Promise<Organization>} The updated organization.
 */
export async function upsertOrganizationCharacteristics(
  id: string,
  chars: NonNullable<Organization['partyCharacteristic']>,
): Promise<Organization> {
  await assertOwnOrganization(id);
  const current = await fetchOrganizationById(id);
  const names = new Set(chars.map((c) => c.name));
  const kept = (current.partyCharacteristic ?? []).filter((c) => !names.has(c.name));
  return patchOrganization(id, { partyCharacteristic: [...kept, ...chars] });
}
