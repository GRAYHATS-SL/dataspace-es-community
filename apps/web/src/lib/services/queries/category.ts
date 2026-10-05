'use server';

import type { Category, NewCategory } from '@/types/api';

import { apiFetch, apiFetchPublic, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/productCatalogManagement/v4/category';

/** Lists categories (authenticated). */
export async function fetchCategories(): Promise<Category[]> {
  // Here you define your business logic (deduplication, sorting...).
  return apiFetch<Category[]>(withLimit(BASE));
}

/** Lists launched categories (authenticated). */
export async function fetchLaunchedCategories(): Promise<Category[]> {
  // Here you define your business logic.
  return apiFetch<Category[]>(withLimit(`${BASE}?lifecycleStatus=Launched`));
}

/** Lists categories from the public catalog API (anonymous). */
export async function fetchCategoriesPublic(): Promise<Category[]> {
  // Here you define your business logic.
  return apiFetchPublic<Category[]>(withLimit(BASE));
}

/** Fetches a single category by id. */
export async function fetchCategoryById(id: string): Promise<Category> {
  // Here you define your business logic.
  return apiFetch<Category>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates a category. */
export async function createCategory(payload: NewCategory): Promise<Category> {
  // Here you define your business logic (default values...).
  return apiFetch<Category>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Partially updates a category. */
export async function patchCategory(id: string, payload: Partial<NewCategory>): Promise<Category> {
  // Here you define your business logic.
  return apiFetch<Category>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Publishes a category (`lifecycleStatus` → `Launched`). */
export async function publishCategory(id: string): Promise<Category> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<Category>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Deletes a category. */
export async function deleteCategory(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
