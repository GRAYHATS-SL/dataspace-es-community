'use server';

import { trackError } from '@/lib/utils/sentry';
import type { Catalog, NewCatalog } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchPublicAll,
  apiFetchVoid,
  filterByRelatedParty,
  injectRelatedParty,
  requireRole,
  withoutRelatedParty,
} from './_utils';
import { assertCatalogOwner } from './ownership';

const BASE = '/tmf-api/productCatalogManagement/v4/catalog';

/**
 * @summary Gets all catalogs of the authenticated organization.
 *
 * @returns {Promise<Catalog[]>} Catalogs matching the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const catalogs = await fetchCatalogs();
 */
export async function fetchCatalogs(): Promise<Catalog[]> {
  const all = await apiFetchAll<Catalog>(BASE);
  return filterByRelatedParty(all);
}

/**
 * @summary Gets the launched catalogs of the authenticated organization.
 *
 * @returns {Promise<Catalog[]>} Launched catalogs of the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const launched = await fetchLaunchedCatalogs();
 */
export async function fetchLaunchedCatalogs(): Promise<Catalog[]> {
  const all = await apiFetchAll<Catalog>(`${BASE}?lifecycleStatus=Launched`);
  return filterByRelatedParty(all);
}

/**
 * @summary Gets the launched catalogs from the public backend (no authentication).
 *
 * @returns {Promise<Catalog[]>} Launched catalogs.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const launched = await fetchLaunchedCatalogsPublic();
 */
export async function fetchLaunchedCatalogsPublic(): Promise<Catalog[]> {
  return apiFetchPublicAll<Catalog>(`${BASE}?lifecycleStatus=Launched`);
}

/**
 * @summary Gets a catalog by id.
 *
 * @param {string}  id - Catalog id.
 * @returns {Promise<Catalog>} The catalog.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const catalog = await fetchCatalogById('urn:ngsi-ld:catalog:abc123');
 */
export async function fetchCatalogById(id: string): Promise<Catalog> {
  return apiFetch<Catalog>(`${BASE}/${id}`);
}

/**
 * @summary Partially updates an existing catalog.
 *
 * @param {string}                                   id - Catalog id.
 * @param {Partial<NewCatalog> | Record<string, unknown>}  payload - Fields to update.
 * @returns {Promise<Catalog>} The updated catalog.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchCatalog('urn:ngsi-ld:catalog:abc123', { name: 'Nuevo nombre' });
 */
export async function patchCatalog(
  id: string,
  payload: Partial<NewCatalog> | Record<string, unknown>,
): Promise<Catalog> {
  await assertCatalogOwner(id);
  return apiFetch<Catalog>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(withoutRelatedParty(payload)),
  });
}

/**
 * @summary Sets a catalog's category list.
 *
 * @param {string}    id - Catalog id.
 * @param {string[]}  categoryIds - Final full list of category ids.
 * @returns {Promise<Catalog>} The updated catalog.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await setCatalogCategories('urn:ngsi-ld:catalog:abc123', ['urn:ngsi-ld:category:xyz']);
 */
// v2: PATCH on lists replaces the whole list — a single PATCH with all the items.
export async function setCatalogCategories(id: string, categoryIds: string[]): Promise<Catalog> {
  await assertCatalogOwner(id);
  return apiFetch<Catalog>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ category: categoryIds.map((categoryId) => ({ id: categoryId })) }),
  });
}

/**
 * @summary Publishes a catalog by setting its status to `Launched`.
 *
 * @param {string}  id - Catalog id.
 * @returns {Promise<Catalog>} The catalog with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishCatalog('urn:ngsi-ld:catalog:abc123');
 */
export async function publishCatalog(id: string): Promise<Catalog> {
  await assertCatalogOwner(id);
  return apiFetch<Catalog>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Creates a product catalog linked to the authenticated organization.
 *
 * @param {NewCatalog}  payload - Catalog to create.
 * @returns {Promise<Catalog>} The created catalog.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const catalog = await createCatalog({ name: 'Catálogo de datos 2026' });
 */
export async function createCatalog(payload: NewCatalog): Promise<Catalog> {
  await requireRole('SELLER');
  const body = await injectRelatedParty<NewCatalog>({
    lifecycleStatus: 'Active',
    ...payload,
  });
  return apiFetch<Catalog>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Deletes a catalog by id.
 *
 * @param {string}  id - Catalog id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteCatalog('urn:ngsi-ld:catalog:abc123');
 */
export async function deleteCatalog(id: string): Promise<void> {
  await assertCatalogOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}

/**
 * @summary Removes a category reference from a catalog.
 *
 * @param {string}                                       catalogId - Catalog id.
 * @param {string}                                       categoryId - Category id to unlink.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentCategories - Current category array.
 * @returns {Promise<Catalog>} The updated catalog.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await removeCatalogCategoryRef(
 *   'urn:ngsi-ld:catalog:abc123',
 *   'urn:ngsi-ld:category:xyz',
 *   catalog.category ?? [],
 * );
 */
// PATCH with the remaining categories list.
export async function removeCatalogCategoryRef(
  catalogId: string,
  categoryId: string,
  currentCategories: { id?: string; href?: string; name?: string }[],
): Promise<Catalog> {
  await assertCatalogOwner(catalogId);
  const filtered = currentCategories.filter((c) => c.id !== categoryId);
  try {
    return await apiFetch<Catalog>(`${BASE}/${catalogId}`, {
      method: 'PATCH',
      body: JSON.stringify({ category: filtered }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeCatalogCategoryRef', catalogId, categoryId });
    throw err;
  }
}
