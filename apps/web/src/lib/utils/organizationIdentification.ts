import type { Organization } from '@/types/api';

type OrganizationIdentification = NonNullable<Organization['organizationIdentification']>[number];

/**
 * @summary Reads the latest organization identification by type.
 *
 * @param  {OrganizationIdentification[] | undefined}  identifications - Organization identifications.
 * @param  {string}  type - `identificationType` to look for.
 * @returns {OrganizationIdentification | undefined} Latest identification, or `undefined`.
 */
export function getIdentification(
  identifications: OrganizationIdentification[] | undefined,
  type: string,
): OrganizationIdentification | undefined {
  return [...(identifications ?? [])].reverse().find((i) => i.identificationType === type);
}
