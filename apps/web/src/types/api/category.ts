import { CategoryRef, ProductOfferingRef, TimePeriod } from './shared';

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

// Type for category creation (without backend-generated fields)
export type NewCategory = Omit<Category, 'id' | 'href' | 'version'>;
