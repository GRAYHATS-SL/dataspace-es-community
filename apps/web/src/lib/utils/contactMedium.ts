import type { ContactMedium } from '@/types/api';

/**
 * @summary Replaces (or adds) the entry of a given `mediumType` in a `ContactMedium` array.
 *
 * @param  {ContactMedium[] | undefined}  existing   - Current `contactMedium` of the entity.
 * @param  {string}                       mediumType - Medium type to replace.
 * @param  {ContactMedium}                entry      - New entry for that `mediumType`.
 * @returns {ContactMedium[]} Rebuilt array.
 */
export function replaceContactMedium(
  existing: ContactMedium[] | undefined,
  mediumType: string,
  entry: ContactMedium,
): ContactMedium[] {
  const preserved = (existing ?? []).filter((cm) => cm.mediumType !== mediumType);
  return [...preserved, entry];
}
