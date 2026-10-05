'use server';

import type { NewProductSpecification, ProductSpecification } from '@/types/api';

import { apiFetch, apiFetchPublic, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/productCatalogManagement/v4/productSpecification';

/** Lists product specifications (authenticated). */
export async function getProductSpecifications(): Promise<ProductSpecification[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ProductSpecification[]>(withLimit(BASE));
}

/** Lists product specifications from the public catalog API (anonymous). */
export async function getProductSpecificationsAllPublic(): Promise<ProductSpecification[]> {
  // Here you define your business logic.
  return apiFetchPublic<ProductSpecification[]>(withLimit(BASE));
}

/** Fetches a single product specification by id (authenticated). */
export async function getProductSpecificationById(id: string): Promise<ProductSpecification> {
  // Here you define your business logic.
  return apiFetch<ProductSpecification>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Fetches a single product specification by id from the public catalog API (anonymous). */
export async function getProductSpecificationByIdPublic(id: string): Promise<ProductSpecification> {
  // Here you define your business logic.
  return apiFetchPublic<ProductSpecification>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates a product specification. */
export async function createProductSpecification(
  input: Partial<NewProductSpecification>,
): Promise<ProductSpecification> {
  // Here you define your business logic (default values, owner party, characteristics...).
  return apiFetch<ProductSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Partially updates a product specification. */
export async function patchProductSpecification(
  id: string,
  payload: Partial<NewProductSpecification>,
): Promise<ProductSpecification> {
  // Here you define your business logic.
  return apiFetch<ProductSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Publishes a product specification (`lifecycleStatus` → `Launched`). */
export async function publishProductSpecification(id: string): Promise<ProductSpecification> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<ProductSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Deletes a product specification. */
export async function deleteProductSpecification(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
