import type {
  AttachmentRefOrValue,
  FeatureSpecification,
  RelatedParty,
  TimePeriod,
} from './shared';

export interface ResourceSpecCharacteristic {
  id?: string;
  name: string;
  description?: string;
  configurable?: boolean;
  extensible?: boolean;
  isUnique?: boolean;
  maxCardinality?: number;
  minCardinality?: number;
  regex?: string;
  valueType?: string;
  resourceSpecCharacteristicValue?: {
    value?: string | number | Record<string, unknown>;
    isDefault?: boolean;
    validFor?: TimePeriod;
  }[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

export interface TargetResourceSchema {
  '@schemaLocation': string;
  '@type': string;
}

export interface ResourceSpecificationRelationship {
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

export interface ResourceSpecification {
  id?: string;
  href?: string;
  category?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  version?: string;
  attachment?: AttachmentRefOrValue[];
  featureSpecification?: FeatureSpecification[];
  relatedParty?: RelatedParty[];
  resourceSpecCharacteristic?: ResourceSpecCharacteristic[];
  resourceSpecRelationship?: ResourceSpecificationRelationship[];
  targetResourceSchema?: TargetResourceSchema;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type NewResourceSpecification = Omit<ResourceSpecification, 'id' | 'href' | 'version'>;
