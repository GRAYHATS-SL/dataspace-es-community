'use server';

import type { Usage } from '@/types/api';

import { apiFetchAll } from './_utils';
import { assertProductParty } from './ownership';

const BASE = '/tmf-api/usageManagement/v4/usage';

/**
 * @summary Gets all usage records (TMF635) of the marketplace.
 *
 * @returns {Promise<Usage[]>} All usage records.
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 */
// Internal (not exported): returns usage records for ALL organizations.
async function fetchUsages(): Promise<Usage[]> {
  return apiFetchAll<Usage>(BASE);
}

/**
 * @summary Gets the usage recorded for a token (`Product`).
 *
 * @param {string} productId - `Product` (token) id.
 * @returns {Promise<Usage[]>} Usage records for that token.
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 */
export async function getUsagesByProduct(productId: string): Promise<Usage[]> {
  await assertProductParty(productId);
  const usages = await fetchUsages();
  return usages.filter((u) =>
    u.ratedProductUsage?.some((rated) => rated.productRef?.id === productId),
  );
}
