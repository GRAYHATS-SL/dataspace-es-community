'use server';

import type { NewProductInventory, ProductInventory, ProductStatus } from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/productInventory/v4/product';

/** Lists inventory products. */
export async function fetchProducts(): Promise<ProductInventory[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ProductInventory[]>(withLimit(BASE));
}

/** Fetches a single inventory product by id. */
export async function fetchProductById(id: string): Promise<ProductInventory> {
  // Here you define your business logic.
  return apiFetch<ProductInventory>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Lists the inventory products bound to an agreement. */
export async function fetchProductsByAgreement(agreementId: string): Promise<ProductInventory[]> {
  // Here you define your business logic.
  return apiFetch<ProductInventory[]>(
    withLimit(`${BASE}?agreement.id=${encodeURIComponent(agreementId)}`),
  );
}

/** Creates an inventory product. */
export async function createProduct(payload: NewProductInventory): Promise<ProductInventory> {
  // Here you define your business logic (related parties, initial status...).
  return apiFetch<ProductInventory>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Updates the status of an inventory product. */
export async function updateProductStatus(
  id: string,
  status: ProductStatus,
): Promise<ProductInventory> {
  // Here you define your business logic (allowed status transitions...).
  return apiFetch<ProductInventory>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
