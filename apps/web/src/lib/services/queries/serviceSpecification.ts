'use server';

import type { NewServiceSpecification, ServiceSpecification } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchVoid,
  filterByRelatedParty,
  injectRelatedParty,
  requireRole,
  withoutRelatedParty,
} from './_utils';
import { assertServiceSpecOwner } from './ownership';

const BASE = '/tmf-api/serviceCatalogManagement/v4/serviceSpecification';

/**
 * @summary Gets all service specifications of the authenticated organization.
 *
 * @returns {Promise<ServiceSpecification[]>} Specifications of the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const serviceSpecs = await getServiceSpecifications();
 */
export async function getServiceSpecifications(): Promise<ServiceSpecification[]> {
  const all = await apiFetchAll<ServiceSpecification>(BASE);
  return filterByRelatedParty(all);
}

/**
 * @summary Gets a service specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ServiceSpecification>} The service specification.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const spec = await getServiceSpecificationById('urn:ngsi-ld:serviceSpecification:svc1');
 */
export async function getServiceSpecificationById(id: string): Promise<ServiceSpecification> {
  return apiFetch<ServiceSpecification>(`${BASE}/${id}`);
}

/**
 * @summary Creates a service specification linked to the authenticated organization.
 *
 * @param {Partial<NewServiceSpecification>}  input - Specification to create.
 * @returns {Promise<ServiceSpecification>} The created specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const spec = await createServiceSpecification({
 *   name: 'Servicio de acceso a datos climáticos',
 * });
 */
export async function createServiceSpecification(
  input: Partial<NewServiceSpecification>,
): Promise<ServiceSpecification> {
  await requireRole('SELLER');
  const payload: Partial<NewServiceSpecification> = {
    name: input.name,
    lifecycleStatus: input.lifecycleStatus ?? 'Active',
    ...(input.description && { description: input.description }),
    ...(typeof input.isBundle === 'boolean' && { isBundle: input.isBundle }),
    ...(input.specCharacteristic?.length && {
      specCharacteristic: input.specCharacteristic,
    }),
  };
  const body = await injectRelatedParty<Partial<NewServiceSpecification>>(payload);
  return apiFetch<ServiceSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Partially updates an existing service specification.
 *
 * @param {string}                             id - Specification id.
 * @param {Partial<NewServiceSpecification>}   payload - Fields to update.
 * @returns {Promise<ServiceSpecification>} The updated specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchServiceSpecification('urn:ngsi-ld:serviceSpecification:svc1', { name: 'Nuevo nombre' });
 */
export async function patchServiceSpecification(
  id: string,
  payload: Partial<NewServiceSpecification>,
): Promise<ServiceSpecification> {
  await assertServiceSpecOwner(id);
  return apiFetch<ServiceSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(withoutRelatedParty(payload)),
  });
}

/**
 * @summary Publishes a service specification by setting its status to `Launched`.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ServiceSpecification>} The specification with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishServiceSpecification('urn:ngsi-ld:serviceSpecification:svc1');
 */
export async function publishServiceSpecification(id: string): Promise<ServiceSpecification> {
  await assertServiceSpecOwner(id);
  return apiFetch<ServiceSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Deletes a service specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteServiceSpecification('urn:ngsi-ld:serviceSpecification:svc1');
 */
export async function deleteServiceSpecification(id: string): Promise<void> {
  await assertServiceSpecOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}
