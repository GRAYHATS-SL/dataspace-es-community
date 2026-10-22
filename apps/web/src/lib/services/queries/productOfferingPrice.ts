'use server';

import type { NewProductOfferingPrice, ProductOfferingPrice } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchPublicAll,
  apiFetchVoid,
  getCurrentUserOrganizationId,
  isAdminSession,
  requireRole,
} from './_utils';
import { assertPriceOwner, getOwnedPriceIds, priceOwnerCharacteristic } from './ownership';

const BASE = '/tmf-api/productCatalogManagement/v4/productOfferingPrice';

/**
 * @summary Creates a product offering price in the TMForum backend.
 *
 * @param {Partial<NewProductOfferingPrice>}  input - Price to create.
 * @returns {Promise<ProductOfferingPrice>} The created price.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const price = await createProductOfferingPrice({
 *   name: 'Precio mensual',
 *   priceType: 'recurring',
 *   recurringChargePeriodType: 'month',
 *   price: { value: 9.99, unit: 'EUR' },
 * });
 */
export async function createProductOfferingPrice(
  input: Partial<NewProductOfferingPrice>,
): Promise<ProductOfferingPrice> {
  await requireRole('SELLER');
  const payload: Partial<NewProductOfferingPrice> = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.priceType !== undefined && { priceType: input.priceType }),
    ...(input.recurringChargePeriodLength !== undefined && {
      recurringChargePeriodLength: input.recurringChargePeriodLength,
    }),
    ...(input.recurringChargePeriodType !== undefined && {
      recurringChargePeriodType: input.recurringChargePeriodType,
    }),
    ...(input.price && { price: { value: input.price.value, unit: input.price.unit } }),
    ...(input.tax?.length && { tax: input.tax }),
    // The dynamic pricing parameters travel in `pricingLogicAlgorithm`.
    ...(input.pricingLogicAlgorithm?.length && {
      pricingLogicAlgorithm: input.pricingLogicAlgorithm,
    }),
    ...(input.productOfferingTerm?.length && { productOfferingTerm: input.productOfferingTerm }),
  };
  // No `relatedParty` of its own: the ownership mark lives on the price itself, so it is visible and editable even before it is linked to any offering.
  const orgId = await getCurrentUserOrganizationId();
  return apiFetch<ProductOfferingPrice>(BASE, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      prodSpecCharValueUse: [priceOwnerCharacteristic(orgId)],
    }),
  });
}

/**
 * @summary Gets only the authenticated organization's prices.
 *
 * @returns {Promise<ProductOfferingPrice[]>} Own prices.
 */
export async function getOwnProductOfferingPrices(): Promise<ProductOfferingPrice[]> {
  await requireRole('SELLER');
  const [all, admin] = await Promise.all([getProductOfferingPrices(), isAdminSession()]);
  if (admin) return all;
  const owned = await getOwnedPriceIds(all);
  return all.filter((p) => p.id && owned.has(p.id));
}

/**
 * @summary Gets all product offering prices.
 *
 * @returns {Promise<ProductOfferingPrice[]>} All prices.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const prices = await getProductOfferingPrices();
 */
export async function getProductOfferingPrices(): Promise<ProductOfferingPrice[]> {
  return apiFetchAll<ProductOfferingPrice>(BASE);
}

/**
 * @summary Gets all product offering prices from the public backend (no authentication).
 *
 * @returns {Promise<ProductOfferingPrice[]>} All prices.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const prices = await getProductOfferingPricesPublic();
 */
export async function getProductOfferingPricesPublic(): Promise<ProductOfferingPrice[]> {
  return apiFetchPublicAll<ProductOfferingPrice>(BASE);
}

/**
 * @summary Gets a product offering price by id.
 *
 * @param {string}  id - Price id.
 * @returns {Promise<ProductOfferingPrice>} The price.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const price = await getProductOfferingPriceById('urn:ngsi-ld:productOfferingPrice:p1');
 */
export async function getProductOfferingPriceById(id: string): Promise<ProductOfferingPrice> {
  return apiFetch<ProductOfferingPrice>(`${BASE}/${id}`);
}

/**
 * @summary Partially updates an existing product offering price.
 *
 * @param {string}                          id - Price id.
 * @param {Partial<NewProductOfferingPrice>} payload - Fields to update.
 * @returns {Promise<ProductOfferingPrice>} The updated price.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchProductOfferingPrice('urn:ngsi-ld:productOfferingPrice:p1', {
 *   price: { value: 14.99, unit: 'EUR' },
 * });
 */
export async function patchProductOfferingPrice(
  id: string,
  payload: Partial<NewProductOfferingPrice>,
): Promise<ProductOfferingPrice> {
  await assertPriceOwner(id);
  // The ownership mark cannot be rewritten: PATCH replaces the whole list.
  const safePayload: Partial<NewProductOfferingPrice> = { ...payload };
  delete safePayload.prodSpecCharValueUse;
  return apiFetch<ProductOfferingPrice>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(safePayload),
  });
}

/**
 * @summary Deletes a product offering price by id.
 *
 * @param {string}  id - Price id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteProductOfferingPrice('urn:ngsi-ld:productOfferingPrice:p1');
 */
export async function deleteProductOfferingPrice(id: string): Promise<void> {
  await assertPriceOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}
