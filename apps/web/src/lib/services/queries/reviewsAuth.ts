'use server';

import { signReviewsInternalToken } from '@/lib/utils/reviewsInternalToken';

import { getCurrentUserAuthorId, getCurrentUserOrganizationId } from './_utils';
import { fetchProductsAsBuyer } from './productInventory';

/**
 * @summary Verifies the active organization has an active `ProductInventory` as buyer of an offering.
 *
 * @param {string}  offeringId - `ProductOffering` id.
 * @returns {Promise<void>}
 *
 * @throws {Error} `HTTP 403: ...` if there is no active `ProductInventory` for the offering.
 */
export async function assertActiveBuyerOwnership(offeringId: string): Promise<void> {
  const products = await fetchProductsAsBuyer();
  const hasActiveOwnership = products.some(
    (product) => product.status === 'active' && product.productOffering?.id === offeringId,
  );
  if (!hasActiveOwnership) {
    throw new Error(
      `HTTP 403: No existe un ProductInventory activo como comprador para la oferta ${offeringId}`,
    );
  }
}

/**
 * @summary Issues the internal HMAC token for `reviews-api` after verifying offering ownership.
 *
 * @param {string}  offeringId - `ProductOffering` id.
 * @returns {Promise<string>} Signed internal token.
 *
 * @throws {Error} `HTTP 403: ...` if the ownership requirement is not met.
 */
export async function issueReviewsInternalToken(offeringId: string): Promise<string> {
  await assertActiveBuyerOwnership(offeringId);

  const [organizationId, individualId] = await Promise.all([
    getCurrentUserOrganizationId(),
    getCurrentUserAuthorId(),
  ]);

  // `individualId` is the author identifier (HMAC of the email): reviews-api only stores it.
  return signReviewsInternalToken({ offeringId, organizationId, individualId });
}
