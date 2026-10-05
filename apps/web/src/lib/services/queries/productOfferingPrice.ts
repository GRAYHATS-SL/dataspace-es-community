'use server';

import type { NewProductOfferingPrice, ProductOfferingPrice } from '@/types/api';

import { apiFetch, apiFetchPublic, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/productCatalogManagement/v4/productOfferingPrice';

/** Creates a product offering price. */
export async function createProductOfferingPrice(
  input: Partial<NewProductOfferingPrice>,
): Promise<ProductOfferingPrice> {
  // Here you define your business logic (payload normalization, default values...).
  return apiFetch<ProductOfferingPrice>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Lists product offering prices (authenticated). */
export async function getProductOfferingPrices(): Promise<ProductOfferingPrice[]> {
  // Here you define your business logic.
  return apiFetch<ProductOfferingPrice[]>(withLimit(BASE));
}

/** Lists product offering prices from the public catalog API (anonymous). */
export async function getProductOfferingPricesPublic(): Promise<ProductOfferingPrice[]> {
  // Here you define your business logic.
  return apiFetchPublic<ProductOfferingPrice[]>(withLimit(BASE));
}

/** Fetches a single product offering price by id. */
export async function getProductOfferingPriceById(id: string): Promise<ProductOfferingPrice> {
  // Here you define your business logic.
  return apiFetch<ProductOfferingPrice>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Partially updates a product offering price. */
export async function patchProductOfferingPrice(
  id: string,
  payload: Partial<NewProductOfferingPrice>,
): Promise<ProductOfferingPrice> {
  // Here you define your business logic.
  return apiFetch<ProductOfferingPrice>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Deletes a product offering price. */
export async function deleteProductOfferingPrice(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
