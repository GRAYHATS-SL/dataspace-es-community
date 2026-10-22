import { CategoryRef, RelatedParty, TimePeriod } from './shared';

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

// Type for catalog creation (without backend-generated fields)
export type NewCatalog = Omit<Catalog, 'id' | 'href'>;
