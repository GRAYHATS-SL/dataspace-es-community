'use server';

import type { NewResourceSpecification, ResourceSpecification } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchVoid,
  filterByRelatedParty,
  injectRelatedParty,
  requireRole,
  withoutRelatedParty,
} from './_utils';
import { assertResourceSpecOwner } from './ownership';

const BASE = '/tmf-api/resourceCatalog/v4/resourceSpecification';

/**
 * @summary Gets all resource specifications of the authenticated organization.
 *
 * @returns {Promise<ResourceSpecification[]>} Specifications of the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const resourceSpecs = await getResourceSpecifications();
 */
export async function getResourceSpecifications(): Promise<ResourceSpecification[]> {
  const all = await apiFetchAll<ResourceSpecification>(BASE);
  return filterByRelatedParty(all);
}

/**
 * @summary Gets a resource specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ResourceSpecification>} The resource specification.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const spec = await getResourceSpecificationById('urn:ngsi-ld:resourceSpecification:res1');
 */
export async function getResourceSpecificationById(id: string): Promise<ResourceSpecification> {
  return apiFetch<ResourceSpecification>(`${BASE}/${id}`);
}

/**
 * @summary Creates a resource specification linked to the authenticated organization.
 *
 * @param {Partial<NewResourceSpecification>}  input - Specification to create.
 * @returns {Promise<ResourceSpecification>} The created specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const spec = await createResourceSpecification({
 *   name: 'API de datos de tráfico',
 *   category: 'transport',
 * });
 */
export async function createResourceSpecification(
  input: Partial<NewResourceSpecification>,
): Promise<ResourceSpecification> {
  await requireRole('SELLER');
  // Exclude resourceSpecCharacteristic from POST — the NGSI-LD bridge rejects complex object
  // values on entity creation. Characteristics are patched from the client after creation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars -- destructured only to exclude it from `rest`
  const { resourceSpecCharacteristic: _chars, ...rest } = input;
  const payload: Partial<NewResourceSpecification> = {
    name: rest.name,
    lifecycleStatus: rest.lifecycleStatus ?? 'Active',
    ...(rest.description && { description: rest.description }),
    ...(rest.category && { category: rest.category }),
    ...(typeof rest.isBundle === 'boolean' && { isBundle: rest.isBundle }),
  };
  const body = await injectRelatedParty<Partial<NewResourceSpecification>>(payload);
  return apiFetch<ResourceSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Partially updates an existing resource specification.
 *
 * @param {string}                              id - Specification id.
 * @param {Partial<NewResourceSpecification>}   payload - Fields to update.
 * @returns {Promise<ResourceSpecification>} The updated specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchResourceSpecification('urn:ngsi-ld:resourceSpecification:res1', { name: 'Nuevo nombre' });
 */
export async function patchResourceSpecification(
  id: string,
  payload: Partial<NewResourceSpecification>,
): Promise<ResourceSpecification> {
  await assertResourceSpecOwner(id);
  return apiFetch<ResourceSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(withoutRelatedParty(payload)),
  });
}

/**
 * @summary Publishes a resource specification by setting its status to `Launched`.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ResourceSpecification>} The specification with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishResourceSpecification('urn:ngsi-ld:resourceSpecification:res1');
 */
export async function publishResourceSpecification(id: string): Promise<ResourceSpecification> {
  await assertResourceSpecOwner(id);
  return apiFetch<ResourceSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Deletes a resource specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteResourceSpecification('urn:ngsi-ld:resourceSpecification:res1');
 */
export async function deleteResourceSpecification(id: string): Promise<void> {
  await assertResourceSpecOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}
