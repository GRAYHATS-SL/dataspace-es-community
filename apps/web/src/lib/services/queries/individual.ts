'use server';

import type { Individual, NewIndividual } from '@/types/api';

import { apiFetch, apiFetchAll } from './_utils';

const BASE = '/tmf-api/party/v4/individual';

/**
 * @summary Gets all individuals registered in the Party API.
 *
 * @param {string}  [accessToken] - Explicit JWT; defaults to the session token.
 * @returns {Promise<Individual[]>} All individuals.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const individuals = await fetchIndividuals();
 *
 * @example
 * // Durante el flujo de primer login (con token explícito)
 * const individuals = await fetchIndividuals(accessToken);
 */
export async function fetchIndividuals(accessToken?: string): Promise<Individual[]> {
  return apiFetchAll<Individual>(BASE, undefined, accessToken);
}

/**
 * @summary Gets an individual by id.
 *
 * @param {string}  id - Individual id.
 * @returns {Promise<Individual>} The individual.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const individual = await fetchIndividualById('urn:ngsi-ld:individual:usr1');
 */
export async function fetchIndividualById(id: string): Promise<Individual> {
  return apiFetch<Individual>(`${BASE}/${encodeURIComponent(id)}`);
}

/**
 * @summary Creates a new individual in the Party API.
 *
 * @param {NewIndividual}  body - Individual to create.
 * @param {string}         [accessToken] - Explicit JWT; defaults to the session token.
 * @returns {Promise<Individual>} The created individual.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const individual = await createIndividual({
 *   fullName: 'Ana García',
 *   givenName: 'Ana',
 *   familyName: 'García',
 *   contactMedium: [{ mediumType: 'email', characteristic: { emailAddress: 'ana@example.com' } }],
 *   relatedParty: [{ id: 'urn:...', role: 'member', '@referredType': 'Organization' }],
 * });
 */
export async function createIndividual(
  body: NewIndividual,
  accessToken?: string,
): Promise<Individual> {
  return apiFetch<Individual>(
    BASE,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    accessToken,
  );
}

/**
 * @summary Partially updates an existing individual.
 *
 * @param {string}                id - Individual id.
 * @param {Partial<NewIndividual>} body - Fields to update.
 * @returns {Promise<Individual>} The updated individual.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchIndividual('urn:ngsi-ld:individual:usr1', { fullName: 'Ana García López' });
 */
export async function patchIndividual(
  id: string,
  body: Partial<NewIndividual>,
): Promise<Individual> {
  return apiFetch<Individual>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
