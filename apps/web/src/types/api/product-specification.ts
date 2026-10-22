import {
  AttachmentRefOrValue,
  BundledProductSpecification,
  ProductSpecificationCharacteristic,
  ProductSpecificationRelationship,
  RelatedParty,
  ResourceSpecificationRef,
  ServiceSpecificationRef,
  TargetProductSchema,
  TimePeriod,
} from './shared';

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

// Type for ProductSpecification creation (without backend-generated fields)
export type NewProductSpecification = Omit<ProductSpecification, 'id' | 'href' | 'version'>;
