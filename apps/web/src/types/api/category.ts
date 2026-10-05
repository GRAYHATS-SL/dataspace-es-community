import type { CategoryRef, ProductOfferingRef, TimePeriod } from './shared';

/** TMF620 Category. */
export interface Category {
  id?: string;
  href?: string;
  description?: string;
  isRoot?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  parentId?: string;
  version?: string;
  productOffering?: ProductOfferingRef[];
  subCategory?: CategoryRef[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a Category (without server-generated fields). */
export type NewCategory = Omit<Category, 'id' | 'href' | 'version'>;
