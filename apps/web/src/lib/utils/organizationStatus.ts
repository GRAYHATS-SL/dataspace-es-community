import type { Organization, ProductOffering, ProductSpecification } from '@/types/api';

/** Message when blocking a purchase from a deregistered provider. */
export const CLOSED_PROVIDER_MESSAGE =
  'Esta oferta ya no está disponible: la organización proveedora está dada de baja.';

/** An organization is active unless closed (`status=closed`). */
export function isOrganizationActive(org: Pick<Organization, 'status'>): boolean {
  return org.status !== 'closed';
}

/** Provider organization id of a specification. */
export function getSpecProviderId(
  spec: Pick<ProductSpecification, 'relatedParty'> | undefined,
): string | undefined {
  const parties = spec?.relatedParty ?? [];
  const provider = parties.find((p) => p.role?.toLowerCase() === 'provider') ?? parties[0];
  return provider?.id;
}

/** Ids of closed organizations. */
export function getClosedOrganizationIds(
  orgs: readonly Pick<Organization, 'id' | 'status'>[],
): Set<string> {
  const ids = new Set<string>();
  for (const org of orgs) if (org.id && !isOrganizationActive(org)) ids.add(org.id);
  return ids;
}

/** `true` if the specification provider is among the closed organizations. */
export function isProviderClosed(
  spec: Pick<ProductSpecification, 'relatedParty'> | undefined,
  closedOrgIds: ReadonlySet<string>,
): boolean {
  const providerId = getSpecProviderId(spec);
  return !!providerId && closedOrgIds.has(providerId);
}

/** Drops offerings whose provider is closed. */
export function filterOfferingsByActiveProvider(
  offerings: readonly ProductOffering[],
  specById: ReadonlyMap<string, Pick<ProductSpecification, 'relatedParty'>>,
  closedOrgIds: ReadonlySet<string>,
): ProductOffering[] {
  if (closedOrgIds.size === 0) return [...offerings];
  return offerings.filter((o) => {
    const specId = o.productSpecification?.id;
    return !(specId && isProviderClosed(specById.get(specId), closedOrgIds));
  });
}
