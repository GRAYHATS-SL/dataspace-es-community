import type { EntityRef, Money, RelatedParty, TimePeriod } from './shared';

/** TMF635 Usage status. */
export type UsageStatusType =
  | 'received'
  | 'rejected'
  | 'recycled'
  | 'guided'
  | 'rated'
  | 'rerated'
  | 'billed';

/** Name/value characteristic of a usage record. */
export interface UsageCharacteristic {
  id?: string;
  name: string;
  valueType?: string;
  value: unknown;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Reference to a UsageSpecification. */
export type UsageSpecificationRef = EntityRef;

/** Reference to a Product. */
export type ProductRef = EntityRef;

/** Rating information of a usage record for a product. */
export interface RatedProductUsage {
  isBilled?: boolean;
  isTaxExempt?: boolean;
  offerTariffType?: string;
  ratingAmountType?: string;
  ratingDate?: string;
  taxRate?: number;
  usageRatingTag?: string;
  bucketValueConvertedInAmount?: Money;
  productRef?: ProductRef;
  taxExcludedRatingAmount?: Money;
  taxIncludedRatingAmount?: Money;
}

/** TMF635 Usage. */
export interface Usage {
  id?: string;
  href?: string;
  description?: string;
  usageDate?: string;
  usageType?: string;
  ratedProductUsage?: RatedProductUsage[];
  relatedParty?: RelatedParty[];
  status?: UsageStatusType;
  usageCharacteristic?: UsageCharacteristic[];
  usageSpecification?: UsageSpecificationRef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a Usage (without server-generated fields). */
export type NewUsage = Omit<Usage, 'id' | 'href'>;

/** TMF635 UsageSpecification. */
export interface UsageSpecification {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  version?: string;
  relatedParty?: RelatedParty[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}
