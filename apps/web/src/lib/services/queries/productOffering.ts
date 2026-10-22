'use server';

import { trackError } from '@/lib/utils/sentry';
import type { NewProductOffering, ProductOffering } from '@/types/api';

import { apiFetch, apiFetchAll, apiFetchPublicAll, apiFetchVoid, requireRole } from './_utils';
import { assertOfferingOwner, assertOfferingRefsOwned, assertPricesOwned } from './ownership';

const BASE = '/tmf-api/productCatalogManagement/v4/productOffering';

/**
 * @summary Gets all marketplace product offerings.
 *
 * @returns {Promise<ProductOffering[]>} All product offerings.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const offerings = await fetchProductOfferings();
 */
// ProductOffering has no relatedParty field — no per-organization isolation.
export async function fetchProductOfferings(): Promise<ProductOffering[]> {
  return apiFetchAll<ProductOffering>(BASE);
}

/**
 * @summary Gets a product offering by id.
 *
 * @param {string}  id - Offering id.
 * @returns {Promise<ProductOffering>} The product offering.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 500 on orphan category references.
 *
 * @example
 * const offering = await fetchProductOfferingById('urn:ngsi-ld:productOffering:abc');
 */
export async function fetchProductOfferingById(id: string): Promise<ProductOffering> {
  return apiFetch<ProductOffering>(`${BASE}/${id}`);
}

/**
 * @summary Gets all product offerings from the public backend (no authentication).
 *
 * @returns {Promise<ProductOffering[]>} All product offerings.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const offerings = await fetchProductOfferingsPublic();
 */
export async function fetchProductOfferingsPublic(): Promise<ProductOffering[]> {
  return apiFetchPublicAll<ProductOffering>(BASE);
}

/**
 * @summary Partially updates an existing product offering.
 *
 * @param {string}                       id - Offering id.
 * @param {Partial<NewProductOffering>}  payload - Fields to update.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchProductOffering('urn:ngsi-ld:productOffering:abc', { name: 'Nueva oferta' });
 */
export async function patchProductOffering(
  id: string,
  payload: Partial<NewProductOffering>,
): Promise<ProductOffering> {
  await assertOfferingOwner(id);
  await assertOfferingRefsOwned(payload);
  return apiFetch<ProductOffering>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Creates a new marketplace product offering.
 *
 * @param {NewProductOffering}  payload - Offering to create.
 * @returns {Promise<ProductOffering>} The created offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const offering = await createProductOffering({
 *   name: 'Dataset de movilidad urbana',
 *   productSpecification: { id: 'urn:ngsi-ld:productSpecification:xyz' },
 * });
 */
export async function createProductOffering(payload: NewProductOffering): Promise<ProductOffering> {
  await requireRole('SELLER');
  await assertOfferingRefsOwned(payload);
  const body: NewProductOffering = {
    lifecycleStatus: 'Active',
    isBundle: false,
    ...payload,
  };
  return apiFetch<ProductOffering>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Publishes a product offering by setting its status to `Launched`.
 *
 * @param {string}  id - Offering id.
 * @returns {Promise<ProductOffering>} The offering with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishProductOffering('urn:ngsi-ld:productOffering:abc');
 */
export async function publishProductOffering(id: string): Promise<ProductOffering> {
  await assertOfferingOwner(id);
  return apiFetch<ProductOffering>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Deletes a product offering by id.
 *
 * @param {string}  id - Offering id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteProductOffering('urn:ngsi-ld:productOffering:abc');
 */
export async function deleteProductOffering(id: string): Promise<void> {
  await assertOfferingOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}

/**
 * @summary Sets an offering's category list.
 *
 * @param {string}    id - Offering id.
 * @param {string[]}  categoryIds - Final full list of category ids.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await setProductOfferingCategories('urn:ngsi-ld:productOffering:abc', ['urn:ngsi-ld:category:xyz']);
 */
// v2: PATCH on lists replaces the whole list — a single PATCH with all the items.
export async function setProductOfferingCategories(
  id: string,
  categoryIds: string[],
): Promise<ProductOffering> {
  await assertOfferingOwner(id);
  return apiFetch<ProductOffering>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ category: categoryIds.map((categoryId) => ({ id: categoryId })) }),
  });
}

/**
 * @summary Removes a category reference from a product offering.
 *
 * @param {string}                                       offeringId - Offering id.
 * @param {string}                                       categoryId - Category id to unlink.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentCategories - Current category array.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await removeOfferingCategoryRef(
 *   'urn:ngsi-ld:productOffering:abc',
 *   'urn:ngsi-ld:category:xyz',
 *   offering.category ?? [],
 * );
 */
// Removes the reference to a category from an offering (PATCH with the remaining list).
export async function removeOfferingCategoryRef(
  offeringId: string,
  categoryId: string,
  currentCategories: { id?: string; href?: string; name?: string }[],
): Promise<ProductOffering> {
  await assertOfferingOwner(offeringId);
  const filtered = currentCategories.filter((c) => c.id !== categoryId);
  try {
    return await apiFetch<ProductOffering>(`${BASE}/${offeringId}`, {
      method: 'PATCH',
      body: JSON.stringify({ category: filtered }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeOfferingCategoryRef', offeringId, categoryId });
    throw err;
  }
}

/**
 * @summary Removes the `ProductSpecification` reference from a product offering.
 *
 * @param {string}  offeringId - Offering id.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await removeOfferingProductSpecRef('urn:ngsi-ld:productOffering:abc');
 */
// Removes the reference to a ProductSpecification from an offering.
export async function removeOfferingProductSpecRef(offeringId: string): Promise<ProductOffering> {
  await assertOfferingOwner(offeringId);
  try {
    return await apiFetch<ProductOffering>(`${BASE}/${offeringId}`, {
      method: 'PATCH',
      body: JSON.stringify({ productSpecification: null }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeOfferingProductSpecRef', offeringId });
    throw err;
  }
}

/**
 * @summary Sets an offering's full price list.
 *
 * @param {string}    id - Offering id.
 * @param {string[]}  priceIds - Price ids to assign.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await setProductOfferingPriceRefs('urn:ngsi-ld:productOffering:abc', [
 *   'urn:ngsi-ld:productOfferingPrice:p1',
 *   'urn:ngsi-ld:productOfferingPrice:p2',
 * ]);
 */
// Sets the prices array of an offering (replaces the whole list).
export async function setProductOfferingPriceRefs(
  id: string,
  priceIds: string[],
): Promise<ProductOffering> {
  await assertOfferingOwner(id);
  await assertPricesOwned(priceIds);
  return apiFetch<ProductOffering>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ productOfferingPrice: priceIds.map((pid) => ({ id: pid })) }),
  });
}

/**
 * @summary Adds a price reference to a product offering.
 *
 * @param {string}                                     offeringId - Offering id.
 * @param {string}                                     priceId - Price id to add.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentPrices - Current price array.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await addOfferingPriceRef(
 *   'urn:ngsi-ld:productOffering:abc',
 *   'urn:ngsi-ld:productOfferingPrice:p3',
 *   offering.productOfferingPrice ?? [],
 * );
 */
// Adds a price reference to an offering (PATCH with the full list).
export async function addOfferingPriceRef(
  offeringId: string,
  priceId: string,
  currentPrices: { id?: string; href?: string; name?: string }[],
): Promise<ProductOffering> {
  await assertOfferingOwner(offeringId);
  await assertPricesOwned([priceId]);
  const allPrices = [...currentPrices.filter((p) => p.id !== priceId), { id: priceId }];
  return apiFetch<ProductOffering>(`${BASE}/${offeringId}`, {
    method: 'PATCH',
    body: JSON.stringify({ productOfferingPrice: allPrices }),
  });
}

/**
 * @summary Removes a price reference from a product offering.
 *
 * @param {string}                                     offeringId - Offering id.
 * @param {string}                                     priceId - Price id to unlink.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentPrices - Current price array.
 * @returns {Promise<ProductOffering>} The updated offering.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await removeOfferingPriceRef(
 *   'urn:ngsi-ld:productOffering:abc',
 *   'urn:ngsi-ld:productOfferingPrice:p1',
 *   offering.productOfferingPrice ?? [],
 * );
 */
// Removes the reference to a price from an offering (PATCH with the remaining list).
export async function removeOfferingPriceRef(
  offeringId: string,
  priceId: string,
  currentPrices: { id?: string; href?: string; name?: string }[],
): Promise<ProductOffering> {
  await assertOfferingOwner(offeringId);
  const filtered = currentPrices.filter((p) => p.id !== priceId);
  try {
    return await apiFetch<ProductOffering>(`${BASE}/${offeringId}`, {
      method: 'PATCH',
      body: JSON.stringify({ productOfferingPrice: filtered }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeOfferingPriceRef', offeringId, priceId });
    throw err;
  }
}
