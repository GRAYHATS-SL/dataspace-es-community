'use server';

import type { Catalog, NewCatalog } from '@/types/api';

import { apiFetch, apiFetchPublic, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/productCatalogManagement/v4/catalog';

/** Lists catalogs (authenticated). */
export async function fetchCatalogs(): Promise<Catalog[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<Catalog[]>(withLimit(BASE));
}

/** Lists launched catalogs (authenticated). */
export async function fetchLaunchedCatalogs(): Promise<Catalog[]> {
  // Here you define your business logic.
  return apiFetch<Catalog[]>(withLimit(`${BASE}?lifecycleStatus=Launched`));
}

/** Lists launched catalogs from the public catalog API (anonymous). */
export async function fetchLaunchedCatalogsPublic(): Promise<Catalog[]> {
  // Here you define your business logic.
  return apiFetchPublic<Catalog[]>(withLimit(`${BASE}?lifecycleStatus=Launched`));
}

/** Fetches a single catalog by id. */
export async function fetchCatalogById(id: string): Promise<Catalog> {
  // Here you define your business logic.
  return apiFetch<Catalog>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Partially updates a catalog. */
export async function patchCatalog(
  id: string,
  payload: Partial<NewCatalog> | Record<string, unknown>,
): Promise<Catalog> {
  // Here you define your business logic.
  return apiFetch<Catalog>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Replaces the category references of a catalog. */
export async function setCatalogCategories(id: string, categoryIds: string[]): Promise<Catalog> {
  // Here you define your business logic.
  return apiFetch<Catalog>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ category: categoryIds.map((categoryId) => ({ id: categoryId })) }),
  });
}

/** Publishes a catalog (`lifecycleStatus` → `Launched`). */
export async function publishCatalog(id: string): Promise<Catalog> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<Catalog>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Creates a catalog. */
export async function createCatalog(payload: NewCatalog): Promise<Catalog> {
  // Here you define your business logic (default values, owner party...).
  return apiFetch<Catalog>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Deletes a catalog. */
export async function deleteCatalog(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
