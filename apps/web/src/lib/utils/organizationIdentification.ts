import type { Organization } from '@/types/api';

type OrganizationIdentification = NonNullable<Organization['organizationIdentification']>[number];

/** Returns the latest organization identification of the given type. */
export function getIdentification(
  identifications: OrganizationIdentification[] | undefined,
  type: string,
): OrganizationIdentification | undefined {
  return [...(identifications ?? [])].reverse().find((i) => i.identificationType === type);
}
