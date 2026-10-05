import type { ContactMedium } from '@/types/api';

/** Replaces (or appends) the entry of a given `mediumType` in a `ContactMedium` array. */
export function replaceContactMedium(
  existing: ContactMedium[] | undefined,
  mediumType: string,
  entry: ContactMedium,
): ContactMedium[] {
  const preserved = (existing ?? []).filter((cm) => cm.mediumType !== mediumType);
  return [...preserved, entry];
}
