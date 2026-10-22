'use server';

import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';
import {
  buildCredentialsChar,
  buildPolicyChar,
  extractPolicyUid,
  getDidWebHost,
  mergeSpecCharacteristics,
  type OdrlFormData,
  resolvePolicyUid,
} from '@/lib/utils/productSpecPolicy';
import { trackError } from '@/lib/utils/sentry';
import type {
  NewProductSpecification,
  ProductSpecification,
  ProductSpecificationCharacteristic,
} from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  apiFetchPublicAll,
  apiFetchVoid,
  filterByRelatedParty,
  getCurrentUserOrganizationId,
  injectRelatedParty,
  requireRole,
  withoutRelatedParty,
} from './_utils';
import { assertProductSpecOwner } from './ownership';
import { fetchOrganizationById } from './party';

/**
 * @summary Builds the v2 access-policy and credential characteristics.
 *
 * @param {OdrlFormData}  data - Policy form values.
 * @param {string}        [existingUid] - Existing `odrl:uid` of the specification, if any.
 * @returns {Promise<ProductSpecificationCharacteristic[]>} `[policyConfig, credentialsConfig]`.
 *
 * @throws {Error} If the session has no organization/DID or the DID is not `did:web`.
 */
export async function buildOdrlChars(
  data: OdrlFormData,
  existingUid?: string,
): Promise<ProductSpecificationCharacteristic[]> {
  const organizationId = await getCurrentUserOrganizationId();
  const org = await fetchOrganizationById(organizationId);
  const did = getLatestCharacteristicValue(org.partyCharacteristic, 'did');
  const orgDid = typeof did === 'string' ? did : '';
  const host = getDidWebHost(orgDid);
  const uid = resolvePolicyUid({
    host,
    offerId: data.odrlOfferId?.trim(),
    name: data.name,
    existingUid,
  });
  return [buildPolicyChar(data, orgDid, uid), buildCredentialsChar()];
}

const BASE = '/tmf-api/productCatalogManagement/v4/productSpecification';

/**
 * @summary Gets all product specifications of the authenticated organization.
 *
 * @returns {Promise<ProductSpecification[]>} Specifications of the active organization.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const specs = await getProductSpecifications();
 */
export async function getProductSpecifications(): Promise<ProductSpecification[]> {
  const all = await apiFetchAll<ProductSpecification>(BASE);
  return filterByRelatedParty(all);
}

export async function getProductSpecificationsAll(): Promise<ProductSpecification[]> {
  return apiFetchAll<ProductSpecification>(BASE);
}

/**
 * @summary Gets all product specifications from the public backend (no authentication).
 *
 * @returns {Promise<ProductSpecification[]>} All specifications.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const specs = await getProductSpecificationsAllPublic();
 */
export async function getProductSpecificationsAllPublic(): Promise<ProductSpecification[]> {
  return apiFetchPublicAll<ProductSpecification>(BASE);
}

/**
 * @summary Gets a product specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ProductSpecification>} The product specification.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const spec = await getProductSpecificationById('urn:ngsi-ld:productSpecification:xyz');
 */
export async function getProductSpecificationById(id: string): Promise<ProductSpecification> {
  return apiFetch<ProductSpecification>(`${BASE}/${id}`);
}

/**
 * @summary Creates a product specification linked to the authenticated organization.
 *
 * @param {Partial<NewProductSpecification>}  input - Specification to create.
 * @returns {Promise<ProductSpecification>} The created specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const spec = await createProductSpecification({ name: 'Spec dataset movilidad' });
 */
export async function createProductSpecification(
  input: Partial<NewProductSpecification>,
): Promise<ProductSpecification> {
  await requireRole('SELLER');
  const body = await injectRelatedParty<Partial<NewProductSpecification>>(input);
  return apiFetch<ProductSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Creates a product specification with its access policy and credential (v2) in one request.
 *
 * @param {Partial<NewProductSpecification>}  input - Specification data, including characteristics.
 * @param {OdrlFormData}                      policy - Access-policy values.
 * @returns {Promise<ProductSpecification>} The created specification.
 *
 * @throws {Error} If the organization's `did:web` is missing; HTTP 4xx/5xx from the backend.
 *
 * @example
 * const spec = await createProductSpecificationWithPolicy({ name: 'httpbin' }, { odrlPathRegex: '^/anything/.*$' });
 */
export async function createProductSpecificationWithPolicy(
  input: Partial<NewProductSpecification>,
  policy: OdrlFormData,
): Promise<ProductSpecification> {
  await requireRole('SELLER');
  const policyChars = await buildOdrlChars({ ...policy, name: policy.name ?? input.name });
  const characteristics = mergeSpecCharacteristics(input.productSpecCharacteristic, policyChars);
  return createProductSpecification({ ...input, productSpecCharacteristic: characteristics });
}

/**
 * @summary Edits a product specification and its access policy in a single PATCH (v2).
 *
 * @param {string}                            id - Specification id.
 * @param {Partial<NewProductSpecification>}  payload - Fields to update.
 * @param {OdrlFormData}                      policy - Access-policy values.
 * @param {string[]}                          [removeCharIds] - Ids of current characteristics to remove.
 * @returns {Promise<ProductSpecification>} The updated specification.
 *
 * @throws {Error} Forbidden if not the owner or `did:web` is missing; HTTP 4xx/5xx from the backend.
 */
export async function patchProductSpecificationWithPolicy(
  id: string,
  payload: Partial<NewProductSpecification>,
  policy: OdrlFormData,
  removeCharIds: string[] = [],
): Promise<ProductSpecification> {
  await assertProductSpecOwner(id);
  const current = await apiFetch<ProductSpecification>(`${BASE}/${id}`);
  const policyChars = await buildOdrlChars(
    { ...policy, name: policy.name ?? payload.name ?? current.name },
    extractPolicyUid(current),
  );
  const characteristics = mergeSpecCharacteristics(
    current.productSpecCharacteristic,
    [...(payload.productSpecCharacteristic ?? []), ...policyChars],
    removeCharIds,
  );
  return apiFetch<ProductSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(
      withoutRelatedParty({ ...payload, productSpecCharacteristic: characteristics }),
    ),
  });
}

/**
 * @summary Applies only the access policy and credential to an existing specification.
 *
 * @param {string}        specId - Specification id.
 * @param {OdrlFormData}  data - Access-policy values.
 * @returns {Promise<void>}
 */
export async function applyOdrlCharacteristics(specId: string, data: OdrlFormData): Promise<void> {
  await patchProductSpecificationWithPolicy(specId, {}, data);
}

/**
 * @summary Partially updates an existing product specification.
 *
 * @param {string}                           id - Specification id.
 * @param {Partial<NewProductSpecification>} payload - Fields to update.
 * @returns {Promise<ProductSpecification>} The updated specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchProductSpecification('urn:ngsi-ld:productSpecification:xyz', { name: 'Nuevo nombre' });
 */
export async function patchProductSpecification(
  id: string,
  payload: Partial<NewProductSpecification>,
): Promise<ProductSpecification> {
  await assertProductSpecOwner(id);
  return apiFetch<ProductSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(withoutRelatedParty(payload)),
  });
}

/**
 * @summary Publishes a product specification by setting its status to `Launched`.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<ProductSpecification>} The specification with `lifecycleStatus: 'Launched'`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const published = await publishProductSpecification('urn:ngsi-ld:productSpecification:xyz');
 */
export async function publishProductSpecification(id: string): Promise<ProductSpecification> {
  await assertProductSpecOwner(id);
  return apiFetch<ProductSpecification>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/**
 * @summary Deletes a product specification by id.
 *
 * @param {string}  id - Specification id.
 * @returns {Promise<void>}
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * await deleteProductSpecification('urn:ngsi-ld:productSpecification:xyz');
 */
export async function deleteProductSpecification(id: string): Promise<void> {
  await assertProductSpecOwner(id);
  return apiFetchVoid(`${BASE}/${id}`, { method: 'DELETE' });
}

/**
 * @summary Removes a `ResourceSpecification` reference from a product specification.
 *
 * @param {string}                                       specId - Product specification id.
 * @param {string}                                       resourceSpecId - Resource specification id to unlink.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentRefs - Current reference array.
 * @returns {Promise<ProductSpecification>} The updated specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await removeProductSpecResourceRef(
 *   'urn:ngsi-ld:productSpecification:xyz',
 *   'urn:ngsi-ld:resourceSpecification:res1',
 *   spec.resourceSpecification ?? [],
 * );
 */
// Removes the reference to a ResourceSpecification from a ProductSpecification (PATCH with the remaining list).
export async function removeProductSpecResourceRef(
  specId: string,
  resourceSpecId: string,
  currentRefs: { id?: string; href?: string; name?: string }[],
): Promise<ProductSpecification> {
  await assertProductSpecOwner(specId);
  const filtered = currentRefs.filter((r) => r.id !== resourceSpecId);
  try {
    return await apiFetch<ProductSpecification>(`${BASE}/${specId}`, {
      method: 'PATCH',
      body: JSON.stringify({ resourceSpecification: filtered }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeProductSpecResourceRef', specId, resourceSpecId });
    throw err;
  }
}

/**
 * @summary Removes a `ServiceSpecification` reference from a product specification.
 *
 * @param {string}                                       specId - Product specification id.
 * @param {string}                                       serviceSpecId - Service specification id to unlink.
 * @param {{ id?: string; href?: string; name?: string }[]}  currentRefs - Current reference array.
 * @returns {Promise<ProductSpecification>} The updated specification.
 *
 * @throws {Error} HTTP 4xx/5xx if the PATCH fails.
 *
 * @example
 * const updated = await removeProductSpecServiceRef(
 *   'urn:ngsi-ld:productSpecification:xyz',
 *   'urn:ngsi-ld:serviceSpecification:svc1',
 *   spec.serviceSpecification ?? [],
 * );
 */
// Removes the reference to a ServiceSpecification from a ProductSpecification (PATCH with the remaining list).
export async function removeProductSpecServiceRef(
  specId: string,
  serviceSpecId: string,
  currentRefs: { id?: string; href?: string; name?: string }[],
): Promise<ProductSpecification> {
  await assertProductSpecOwner(specId);
  const filtered = currentRefs.filter((r) => r.id !== serviceSpecId);
  try {
    return await apiFetch<ProductSpecification>(`${BASE}/${specId}`, {
      method: 'PATCH',
      body: JSON.stringify({ serviceSpecification: filtered }),
    });
  } catch (err) {
    trackError(err, { fn: 'removeProductSpecServiceRef', specId, serviceSpecId });
    throw err;
  }
}
