'use server';

import type { NewProductOffering, ProductOffering } from '@/types/api';

import { apiFetch, apiFetchPublic, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/productCatalogManagement/v4/productOffering';

/** Lists product offerings (authenticated). */
export async function fetchProductOfferings(): Promise<ProductOffering[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ProductOffering[]>(withLimit(BASE));
}

/** Fetches a single product offering by id (authenticated). */
export async function fetchProductOfferingById(id: string): Promise<ProductOffering> {
  // Here you define your business logic.
  return apiFetch<ProductOffering>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Lists product offerings from the public catalog API (anonymous). */
export async function fetchProductOfferingsPublic(): Promise<ProductOffering[]> {
  // Here you define your business logic (e.g. only sellable or launched offerings).
  return apiFetchPublic<ProductOffering[]>(withLimit(BASE));
}

/** Creates a product offering. */
export async function createProductOffering(payload: NewProductOffering): Promise<ProductOffering> {
  // Here you define your business logic (default values, derived fields...).
  return apiFetch<ProductOffering>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Partially updates a product offering. */
export async function patchProductOffering(
  id: string,
  payload: Partial<NewProductOffering>,
): Promise<ProductOffering> {
  // Here you define your business logic.
  return apiFetch<ProductOffering>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Publishes a product offering (`lifecycleStatus` → `Launched`). */
export async function publishProductOffering(id: string): Promise<ProductOffering> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<ProductOffering>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Deletes a product offering. */
export async function deleteProductOffering(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Replaces the category references of a product offering. */
export async function setProductOfferingCategories(
  id: string,
  categoryIds: string[],
): Promise<ProductOffering> {
  // Here you define your business logic.
  return apiFetch<ProductOffering>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ category: categoryIds.map((categoryId) => ({ id: categoryId })) }),
  });
}
