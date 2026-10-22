import type {
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
  RelatedParty,
} from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  getCurrentUserOrganizationId,
  isAdminSession,
  isOwnedBy,
  requireRole,
} from './_utils';

// Server-side ownership checks. This module is NOT `'use server'`: its functions are not exposed as endpoints, they are only imported by the server actions in `queries/*.ts`. ADMIN can operate on any entity; everyone else only on their own organization's.

const PATHS = {
  catalog: '/tmf-api/productCatalogManagement/v4/catalog',
  productSpec: '/tmf-api/productCatalogManagement/v4/productSpecification',
  resourceSpec: '/tmf-api/resourceCatalog/v4/resourceSpecification',
  serviceSpec: '/tmf-api/serviceCatalogManagement/v4/serviceSpecification',
  offering: '/tmf-api/productCatalogManagement/v4/productOffering',
  price: '/tmf-api/productCatalogManagement/v4/productOfferingPrice',
  order: '/tmf-api/productOrderingManagement/v4/productOrder',
  product: '/tmf-api/productInventory/v4/product',
  agreement: '/tmf-api/agreementManagement/v4/agreement',
} as const;

const FORBIDDEN = 'Forbidden: la entidad no pertenece a tu organización';

const entityUrl = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;

async function assertDirectOwner(base: string, id: string): Promise<void> {
  await requireRole('SELLER');
  if (await isAdminSession()) return;
  const [orgId, entity] = await Promise.all([
    getCurrentUserOrganizationId(),
    apiFetch<{ relatedParty?: RelatedParty[] }>(entityUrl(base, id)),
  ]);
  if (!isOwnedBy(entity, orgId)) throw new Error(FORBIDDEN);
}

export const assertCatalogOwner = (id: string) => assertDirectOwner(PATHS.catalog, id);
export const assertProductSpecOwner = (id: string) => assertDirectOwner(PATHS.productSpec, id);
export const assertResourceSpecOwner = (id: string) => assertDirectOwner(PATHS.resourceSpec, id);
export const assertServiceSpecOwner = (id: string) => assertDirectOwner(PATHS.serviceSpec, id);

/** Offerings have no `relatedParty`: ownership is inherited from their `ProductSpecification`. */
export async function assertOfferingOwner(id: string): Promise<void> {
  await requireRole('SELLER');
  if (await isAdminSession()) return;
  const offering = await apiFetch<ProductOffering>(entityUrl(PATHS.offering, id));
  const specId = offering.productSpecification?.id;
  if (!specId) throw new Error(FORBIDDEN);
  await assertProductSpecOwner(specId);
}

/** Name of the `prodSpecCharValueUse` characteristic holding the owner organization. */
export const PRICE_OWNER_CHARACTERISTIC = 'provider';

/** `prodSpecCharValueUse` characteristic that marks a price as owned when created. */
export function priceOwnerCharacteristic(orgId: string) {
  return {
    name: PRICE_OWNER_CHARACTERISTIC,
    valueType: 'string',
    productSpecCharacteristicValue: [{ value: orgId }],
  };
}

// TMF returns a single-element list as a bare value: accept both forms.
const toArray = <T>(v: T | T[] | undefined | null): T[] => {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
};

function isPriceOwnedBy(price: ProductOfferingPrice, orgId: string): boolean {
  return toArray(price.prodSpecCharValueUse).some(
    (c) =>
      c.name === PRICE_OWNER_CHARACTERISTIC &&
      toArray(c.productSpecCharacteristicValue).some((v) => v.value === orgId),
  );
}

/**
 * Ids of the active organization's prices.
 *
 * @param prices - Already loaded full price list.
 */
export async function getOwnedPriceIds(prices?: ProductOfferingPrice[]): Promise<Set<string>> {
  const orgId = await getCurrentUserOrganizationId();
  const [allPrices, offerings] = await Promise.all([
    prices ?? apiFetchAll<ProductOfferingPrice>(PATHS.price),
    getOwnedOfferings(orgId),
  ]);
  const ids = new Set<string>();
  allPrices.forEach((p) => p.id && isPriceOwnedBy(p, orgId) && ids.add(p.id));
  offerings.forEach((o) => (o.productOfferingPrice ?? []).forEach((p) => p.id && ids.add(p.id)));
  return ids;
}

/** The organization's offerings (full list). */
export async function getOwnedOfferings(orgId: string): Promise<ProductOffering[]> {
  const [specs, offerings] = await Promise.all([
    apiFetchAll<ProductSpecification>(PATHS.productSpec),
    apiFetchAll<ProductOffering>(PATHS.offering),
  ]);
  const ownedSpecIds = new Set(specs.filter((s) => isOwnedBy(s, orgId)).map((s) => s.id));
  return offerings.filter(
    (o) => o.productSpecification?.id && ownedSpecIds.has(o.productSpecification.id),
  );
}

/** Ids of categories used by the organization's own catalogs or offerings. */
export async function getOwnedCategoryIds(): Promise<Set<string>> {
  const orgId = await getCurrentUserOrganizationId();
  const [catalogs, offerings] = await Promise.all([
    apiFetchAll<{ relatedParty?: RelatedParty[]; category?: { id?: string }[] }>(PATHS.catalog),
    getOwnedOfferings(orgId),
  ]);
  const ids = new Set<string>();
  [...catalogs.filter((c) => isOwnedBy(c, orgId)), ...offerings].forEach((e) =>
    (e.category ?? []).forEach((c) => c.id && ids.add(c.id)),
  );
  return ids;
}

export async function assertPricesOwned(priceIds: readonly string[]): Promise<void> {
  await requireRole('SELLER');
  if (priceIds.length === 0 || (await isAdminSession())) return;
  const owned = await getOwnedPriceIds();
  if (priceIds.some((id) => !owned.has(id))) throw new Error(FORBIDDEN);
}

export const assertPriceOwner = (id: string) => assertPricesOwned([id]);

/** Validates the spec and prices referenced in an offering payload. */
export async function assertOfferingRefsOwned(payload: {
  productSpecification?: { id?: string } | null;
  productOfferingPrice?: { id?: string }[];
}): Promise<void> {
  const specId = payload.productSpecification?.id;
  if (specId) await assertProductSpecOwner(specId);
  const priceIds = (payload.productOfferingPrice ?? [])
    .map((p) => p.id)
    .filter((id): id is string => !!id);
  await assertPricesOwned(priceIds);
}

async function assertMember(
  base: string,
  id: string,
  field: 'relatedParty' | 'engagedParty',
): Promise<void> {
  if (await isAdminSession()) return;
  const [orgId, entity] = await Promise.all([
    getCurrentUserOrganizationId(),
    apiFetch<Partial<Record<typeof field, RelatedParty[]>>>(entityUrl(base, id)),
  ]);
  const parties = field === 'relatedParty' ? entity.relatedParty : entity.engagedParty;
  if (!parties?.some((p) => p.id === orgId)) throw new Error(FORBIDDEN);
}

/** The active organization is buyer or seller of the order. */
export const assertOrderParty = (id: string) => assertMember(PATHS.order, id, 'relatedParty');
/** The active organization is a party to the agreement. */
export const assertAgreementParty = (id: string) => assertMember(PATHS.agreement, id, 'engagedParty');
/** The active organization is a party to the inventory product. */
export const assertProductParty = (id: string) => assertMember(PATHS.product, id, 'relatedParty');

/** The active organization is listed in a creation payload's parties. */
export async function assertSelfInParties(parties: RelatedParty[] | undefined): Promise<void> {
  if (await isAdminSession()) return;
  const orgId = await getCurrentUserOrganizationId();
  if (!parties?.some((p) => p.id === orgId)) {
    throw new Error('Forbidden: tu organización debe figurar entre las partes');
  }
}
