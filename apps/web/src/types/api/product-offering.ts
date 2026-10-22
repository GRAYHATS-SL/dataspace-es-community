import {
  AgreementRef,
  AttachmentRefOrValue,
  BundledProductOffering,
  CatalogRef,
  CategoryRef,
  ChannelRef,
  MarketSegmentRef,
  PlaceRef,
  ProductOfferingPriceRefOrValue,
  ProductOfferingRelationship,
  ProductOfferingTerm,
  ProductSpecificationCharacteristicValueUse,
  ProductSpecificationRef,
  RelatedParty,
  ResourceCandidateRef,
  ServiceCandidateRef,
  SLARef,
  TimePeriod,
} from './shared';

export interface ProductOffering {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  isSellable?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: 'Active' | 'In design' | 'In test' | 'Launched' | 'Retired' | 'Obsolete';
  name?: string;
  statusReason?: string;
  version?: string;
  agreement?: AgreementRef[];
  attachment?: AttachmentRefOrValue[];
  bundledProductOffering?: BundledProductOffering[];
  category?: CategoryRef[];
  channel?: ChannelRef[];
  marketSegment?: MarketSegmentRef[];
  place?: PlaceRef[];
  prodSpecCharValueUse?: ProductSpecificationCharacteristicValueUse[];
  productOfferingPrice?: ProductOfferingPriceRefOrValue[];
  productOfferingRelationship?: ProductOfferingRelationship[];
  productOfferingTerm?: ProductOfferingTerm[];
  catalog?: CatalogRef[];
  productSpecification?: ProductSpecificationRef;
  relatedParty?: RelatedParty[];
  resourceCandidate?: ResourceCandidateRef;
  serviceCandidate?: ServiceCandidateRef;
  serviceLevelAgreement?: SLARef;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

// Type for ProductOffering creation (without backend-generated fields)
export type NewProductOffering = Omit<ProductOffering, 'id' | 'href' | 'version'>;

// ProductOfferingRef is in shared.ts

// ProductOfferingRelationship and ProductOfferingTerm are in shared.ts
