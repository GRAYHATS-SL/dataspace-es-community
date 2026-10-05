import type {
  AttachmentRefOrValue,
  ProductSpecificationCharacteristic,
  RelatedParty,
  ResourceSpecificationRef,
  ServiceSpecificationRef,
  TargetProductSchema,
  TimePeriod,
} from './shared';

/** Specification contained in a bundled product specification. */
export interface BundledProductSpecification {
  id?: string;
  href?: string;
  lifecycleStatus?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Relationship between two product specifications. */
export interface ProductSpecificationRelationship {
  id?: string;
  href?: string;
  name?: string;
  relationshipType?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** TMF620 ProductSpecification. */
export interface ProductSpecification {
  id?: string;
  href?: string;
  brand?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  productNumber?: string;
  version?: string;
  attachment?: AttachmentRefOrValue[];
  bundledProductSpecification?: BundledProductSpecification[];
  productSpecCharacteristic?: ProductSpecificationCharacteristic[];
  productSpecificationRelationship?: ProductSpecificationRelationship[];
  relatedParty?: RelatedParty[];
  resourceSpecification?: ResourceSpecificationRef[];
  serviceSpecification?: ServiceSpecificationRef[];
  targetProductSchema?: TargetProductSchema;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a ProductSpecification (without server-generated fields). */
export type NewProductSpecification = Omit<ProductSpecification, 'id' | 'href' | 'version'>;
