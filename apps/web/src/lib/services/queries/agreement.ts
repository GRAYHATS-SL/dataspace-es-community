'use server';

import type { Agreement, NewAgreement } from '@/types/api';

import { apiFetch, apiFetchAll, getCurrentUserOrganizationId } from './_utils';
import { assertAgreementParty, assertSelfInParties } from './ownership';

const BASE = '/tmf-api/agreementManagement/v4/agreement';

/**
 * @summary Gets all marketplace agreements.
 *
 * @returns {Promise<Agreement[]>} All agreements.
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 */
// Internal (not exported): returns agreements for ALL organizations, and a `'use server'` exposes every export as an endpoint. Use `fetchAgreementsAsBuyer/AsSeller`.
async function fetchAgreements(): Promise<Agreement[]> {
  return apiFetchAll<Agreement>(BASE);
}

/**
 * @summary Gets the agreements where the authenticated organization is the buyer.
 *
 * @returns {Promise<Agreement[]>} Agreements where the org is the buyer.
 * @throws {Error} HTTP 4xx/5xx if any backend call fails.
 */
export async function fetchAgreementsAsBuyer(): Promise<Agreement[]> {
  const [agreements, orgId] = await Promise.all([
    fetchAgreements(),
    getCurrentUserOrganizationId(),
  ]);
  return agreements.filter((a) =>
    a.engagedParty?.some((p) => p.id === orgId && p.role?.toLowerCase() === 'buyer'),
  );
}

/**
 * @summary Gets the agreements where the authenticated organization is the seller.
 *
 * @returns {Promise<Agreement[]>} Agreements where the org is the seller.
 * @throws {Error} HTTP 4xx/5xx if any backend call fails.
 */
export async function fetchAgreementsAsSeller(): Promise<Agreement[]> {
  const [agreements, orgId] = await Promise.all([
    fetchAgreements(),
    getCurrentUserOrganizationId(),
  ]);
  return agreements.filter((a) =>
    a.engagedParty?.some((p) => p.id === orgId && p.role?.toLowerCase() === 'seller'),
  );
}

/**
 * @summary Gets an agreement by id.
 *
 * @param {string} id - Agreement id.
 * @returns {Promise<Agreement>} The agreement.
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 */
export async function fetchAgreementById(id: string): Promise<Agreement> {
  const agreement = await apiFetch<Agreement>(`${BASE}/${id}`);
  await assertSelfInParties(agreement.engagedParty);
  return agreement;
}

/**
 * @summary Creates a new data-access agreement.
 *
 * @param {NewAgreement} payload - Agreement to create.
 * @returns {Promise<Agreement>} The created agreement.
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 */
export async function createAgreement(payload: NewAgreement): Promise<Agreement> {
  await assertSelfInParties(payload.engagedParty);
  return apiFetch<Agreement>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Updates the status of an existing agreement.
 *
 * @param {string} id - Agreement id.
 * @param {string} status - New status.
 * @returns {Promise<Agreement>} The updated agreement.
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 */
export async function updateAgreementStatus(id: string, status: string): Promise<Agreement> {
  await assertAgreementParty(id);
  return apiFetch<Agreement>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
