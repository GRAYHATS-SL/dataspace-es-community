import type {
  AgreementRef,
  AttachmentRefOrValue,
  CategoryRef,
  ChannelRef,
  MarketSegmentRef,
  PlaceRef,
  ProductOfferingPriceRef,
  ProductSpecificationRef,
  Quantity,
  ResourceCandidateRef,
  ServiceCandidateRef,
  SLARef,
  TimePeriod,
} from './shared';

/** TMF620 ProductOffering lifecycle status. */
export type ProductOfferingLifecycleStatus =
  | 'In study'
  | 'In design'
  | 'In test'
  | 'Active'
  | 'Launched'
  | 'Retired'
  | 'Obsolete'
  | 'Rejected';

/** Option limits of an offering inside a bundle. */
export interface BundledProductOfferingOption {
  numberRelOfferDefault?: number;
  numberRelOfferLowerLimit?: number;
  numberRelOfferUpperLimit?: number;
}

/** Offering contained in a bundled offering. */
export interface BundledProductOffering {
  id?: string;
  href?: string;
  lifecycleStatus?: string;
  name?: string;
  bundledProductOfferingOption?: BundledProductOfferingOption;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Relationship between two product offerings. */
export interface ProductOfferingRelationship {
  id?: string;
  href?: string;
  name?: string;
  relationshipType?: string;
  role?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** Commitment term of a product offering. */
export interface ProductOfferingTerm {
  name?: string;
  description?: string;
  duration?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** TMF620 ProductOffering. */
export interface ProductOffering {
  id?: string;
  href?: string;
  name?: string;
  description?: string;
  version?: string;
  lifecycleStatus?: ProductOfferingLifecycleStatus;
  statusReason?: string;
  isBundle?: boolean;
  isSellable?: boolean;
  lastUpdate?: string;
  validFor?: TimePeriod;
  agreement?: AgreementRef[];
  attachment?: AttachmentRefOrValue[];
  bundledProductOffering?: BundledProductOffering[];
  category?: CategoryRef[];
  channel?: ChannelRef[];
  marketSegment?: MarketSegmentRef[];
  place?: PlaceRef[];
  productOfferingPrice?: ProductOfferingPriceRef[];
  productOfferingRelationship?: ProductOfferingRelationship[];
  productOfferingTerm?: ProductOfferingTerm[];
  productSpecification?: ProductSpecificationRef;
  resourceCandidate?: ResourceCandidateRef;
  serviceCandidate?: ServiceCandidateRef;
  serviceLevelAgreement?: SLARef;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a ProductOffering (without server-generated fields). */
export type NewProductOffering = Omit<ProductOffering, 'id' | 'href' | 'lastUpdate'>;
