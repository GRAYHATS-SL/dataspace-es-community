import {
  CLOSED_PROVIDER_MESSAGE,
  getSpecProviderId,
  isOrganizationActive,
} from '@/lib/utils/organizationStatus';

import { fetchOrganizationById } from './party';
import { fetchProductOfferingById } from './productOffering';
import { getProductSpecificationById } from './productSpecification';

// Server-side purchase check. This module is NOT `'use server'` (like `ownership.ts`): its functions are not exposed as endpoints, they are only imported by the server actions that create orders.

/**
 * Rejects the purchase if any offering's provider is closed (`status=closed`).
 *
 * @throws {Error} If the provider is closed or cannot be determined.
 */
export async function assertOfferingsProviderActive(offeringIds: readonly string[]): Promise<void> {
  const providerIds = new Set<string>();
  for (const offeringId of new Set(offeringIds)) {
    const offering = await fetchProductOfferingById(offeringId);
    const specId = offering.productSpecification?.id;
    const providerId = specId
      ? getSpecProviderId(await getProductSpecificationById(specId))
      : undefined;
    if (!providerId) throw new Error('No se pudo determinar el proveedor de la oferta.');
    providerIds.add(providerId);
  }
  for (const providerId of providerIds) {
    if (!isOrganizationActive(await fetchOrganizationById(providerId))) {
      throw new Error(CLOSED_PROVIDER_MESSAGE);
    }
  }
}
