'use server';

import type { NewProductInventory, ProductInventory, ProductStatus } from '@/types/api';

import { apiFetch, apiFetchAll, filterAsBuyer, filterAsSeller } from './_utils';
import { assertAgreementParty, assertProductParty, assertSelfInParties } from './ownership';

const BASE = '/tmf-api/productInventory/v4/product';

/**
 * @summary Gets all inventory products.
 *
 * @returns {Promise<ProductInventory[]>} All inventory products.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const allProducts = await fetchProducts();
 */
// Internal (not exported): returns inventory for ALL organizations, and a `'use server'` exposes every export as an endpoint. Use `fetchProductsAsBuyer/AsSeller` or `fetchProductsForOffering`.
async function fetchProducts(): Promise<ProductInventory[]> {
  return apiFetchAll<ProductInventory>(BASE);
}

/**
 * @summary Gets an offering's purchases, trimmed to the fields needed for quoting.
 *
 * @param {string}  offeringId - Offering id.
 * @returns {Promise<ProductInventory[]>} Trimmed products of that offering.
 */
export async function fetchProductsForOffering(offeringId: string): Promise<ProductInventory[]> {
  const products = await fetchProducts();
  return products
    .filter((p) => p.productOffering?.id === offeringId)
    .map(({ id, productOffering, startDate, orderDate }) => ({
      id,
      productOffering,
      startDate,
      orderDate,
    })) as ProductInventory[];
}

/**
 * @summary Gets the inventory products of the authenticated organization.
 *
 * @returns {Promise<ProductInventory[]>} Products of the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const myProducts = await fetchProductsByBuyer();
 */
export async function fetchProductsByBuyer(): Promise<ProductInventory[]> {
  const products = await fetchProducts();
  // A Product's `relatedParty` comes from the agreement (buyer/seller roles), not provider/owner.
  return filterAsBuyer(products);
}

/**
 * @summary Gets an inventory product by id.
 *
 * @param {string}  id - Product id.
 * @returns {Promise<ProductInventory>} The product.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const product = await fetchProductById('urn:ngsi-ld:product:prod1');
 */
export async function fetchProductById(id: string): Promise<ProductInventory> {
  const product = await apiFetch<ProductInventory>(`${BASE}/${id}`);
  await assertSelfInParties(product.relatedParty);
  return product;
}

/**
 * @summary Gets the inventory products where the active organization is the buyer.
 *
 * @returns {Promise<ProductInventory[]>} Products where the active organization is the buyer.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const myPurchases = await fetchProductsAsBuyer();
 */
export async function fetchProductsAsBuyer(): Promise<ProductInventory[]> {
  const products = await fetchProducts();
  return filterAsBuyer(products);
}

/**
 * @summary Gets the inventory products where the active organization is the seller.
 *
 * @returns {Promise<ProductInventory[]>} Products where the active organization is the seller.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const mySales = await fetchProductsAsSeller();
 */
export async function fetchProductsAsSeller(): Promise<ProductInventory[]> {
  const products = await fetchProducts();
  return filterAsSeller(products);
}

/**
 * @summary Gets the inventory products linked to an agreement.
 *
 * @param {string}  agreementId - Agreement id.
 * @returns {Promise<ProductInventory[]>} Products referencing the agreement.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const linked = await fetchProductsByAgreement('urn:ngsi-ld:agreement:xyz789');
 */
export async function fetchProductsByAgreement(agreementId: string): Promise<ProductInventory[]> {
  await assertAgreementParty(agreementId);
  return apiFetchAll<ProductInventory>(`${BASE}?agreement.id=${encodeURIComponent(agreementId)}`);
}

/**
 * @summary Creates a new inventory product.
 *
 * @param {NewProductInventory}  payload - Product to create.
 * @returns {Promise<ProductInventory>} The created product.
 *
 * @throws {Error} HTTP 400 if a reference is missing; HTTP 5xx otherwise.
 *
 * @example
 * const product = await createProduct({ status: 'active', name: 'Dataset X', ... });
 */
export async function createProduct(payload: NewProductInventory): Promise<ProductInventory> {
  await assertSelfInParties(payload.relatedParty);
  return apiFetch<ProductInventory>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Updates an inventory product's status.
 *
 * @param {string}         id - Product id.
 * @param {ProductStatus}  status - New status.
 * @returns {Promise<ProductInventory>} The product with the new status.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const updated = await updateProductStatus('urn:ngsi-ld:product:prod1', 'suspended');
 */
export async function updateProductStatus(
  id: string,
  status: ProductStatus,
): Promise<ProductInventory> {
  await assertProductParty(id);
  return apiFetch<ProductInventory>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
