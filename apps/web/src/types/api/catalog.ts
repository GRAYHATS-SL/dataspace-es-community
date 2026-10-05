import type { CategoryRef, RelatedParty, TimePeriod } from './shared';

/** TMF620 Catalog. */
export interface Catalog {
  id?: string;
  href?: string;
  catalogType?: string;
  description?: string;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  version?: string;
  category?: CategoryRef[];
  relatedParty?: RelatedParty[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a Catalog (without server-generated fields). */
export type NewCatalog = Omit<Catalog, 'id' | 'href'>;
