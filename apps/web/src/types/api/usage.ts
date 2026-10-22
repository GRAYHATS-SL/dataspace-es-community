import type { Money, RelatedParty, TimePeriod } from './shared';

export type UsageStatusType =
  | 'received'
  | 'rejected'
  | 'recycled'
  | 'guided'
  | 'rated'
  | 'rerated'
  | 'billed';

export interface UsageCharacteristic {
  id?: string;
  name: string;
  valueType?: string;
  value: unknown;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface UsageSpecificationRef {
  id?: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ProductRef {
  id?: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

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

export type NewUsage = Omit<Usage, 'id' | 'href'>;

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
