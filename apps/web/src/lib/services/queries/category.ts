'use server';

import type { Category, NewCategory } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchPublicAll,
  apiFetchVoid,
  deduplicateById,
  isAdminSession,
  requireRole,
} from './_utils';
import { getOwnedCategoryIds } from './ownership';

const BASE = '/tmf-api/productCatalogManagement/v4/category';

/**
 * @summary Gets all categories (admin view).
 *
 * @returns {Promise<Category[]>} Deduplicated categories.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const categories = await fetchCategories();
 */
// Admin view: all categories regardless of catalog linkage or status
export async function fetchCategories(): Promise<Category[]> {
  const all = await apiFetchAll<Category>(BASE, { method: 'GET' });
  return deduplicateById(all);
}

/**
 * @summary Gets the categories visible in the organization's "Categories" tab.
 *
 * @returns {Promise<Category[]>} Visible categories, deduplicated.
 */
export async function fetchOwnCategories(): Promise<Category[]> {
  const all = await fetchCategories();
  if (await isAdminSession()) return all;
  const owned = await getOwnedCategoryIds();
  return all.filter((c) => c.id && owned.has(c.id));
}

/**
 * @summary Gets the launched categories available to all providers.
 *
 * @returns {Promise<Category[]>} Launched categories, deduplicated.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const options = await fetchLaunchedCategories();
 */
// For form selects: categories ADMIN has created (`Active`) or published (`Launched`). `SELLER` cannot create or publish categories (ADMIN only in v2), so both are selectable.
export async function fetchLaunchedCategories(): Promise<Category[]> {
  const all = await fetchCategories();
  return all.filter((c) => c.lifecycleStatus === 'Launched' || c.lifecycleStatus === 'Active');
}

/**
 * @summary Gets all categories from the public backend (no authentication).
 *
 * @returns {Promise<Category[]>} Deduplicated categories.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const categories = await fetchCategoriesPublic();
 */
export async function fetchCategoriesPublic(): Promise<Category[]> {
  const all = await apiFetchPublicAll<Category>(BASE, { method: 'GET' });
  return deduplicateById(all);
}

/**
 * @summary Gets a category by id.
 *
 * @param {string}  id - Category id.
 * @returns {Promise<Category>} The category.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 500 if it has orphan references.
 *
 * @example
 * const category = await fetchCategoryById('urn:ngsi-ld:category:xyz');
 */
export async function fetchCategoryById(id: string): Promise<Category> {
  return apiFetch<Category>(`${BASE}/${id}`, { method: 'GET' });
}

/**
 * @summary Creates a new marketplace category.
 *
 * @param {NewCategory}  payload - Category to create.
 * @returns {Promise<Category>} The created category.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const category = await createCategory({ name: 'Datos de movilidad' });
 */
export async function createCategory(payload: NewCategory): Promise<Category> {
  await requireRole('ADMIN');
  return apiFetch<Category>(BASE, {
    method: 'POST',
    body: JSON.stringify({ lifecycleStatus: 'Active', ...payload }),
  });
}

/**
 * @summary Partially updates an existing category.
 *
 * @param {string}               id - Category id.
 * @param {Partial<NewCategory>} payload - Fields to update.
 * @returns {Promise<Category>} The updated category.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchCategory('urn:ngsi-ld:category:xyz', { name: 'Nuevo nombre' });
 */
export async function patchCategory(id: string, payload: Partial<NewCategory>): Promise<Category> {
  await requireRole('ADMIN');
  return apiFetch<Category>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * @summary Publishes a category by setting its status to `Launched`.
 *
 * @param {string}  id - Category id.
 * @returns {Promise<Category>} The category with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishCategory('urn:ngsi-ld:category:xyz');
 */
export async function publishCategory(id: string): Promise<Category> {
  await requireRole('ADMIN');
  return apiFetch<Category>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Deletes a category by id.
 *
 * @param {string}  id - Category id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteCategory('urn:ngsi-ld:category:xyz');
 */
export async function deleteCategory(id: string): Promise<void> {
  await requireRole('ADMIN');
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}
