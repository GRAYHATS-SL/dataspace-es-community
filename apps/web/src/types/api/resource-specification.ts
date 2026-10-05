import type {
  AttachmentRefOrValue,
  CharacteristicValueSpecification,
  FeatureSpecification,
  RelatedParty,
  TargetSchema,
  TimePeriod,
} from './shared';

/** Characteristic of a ResourceSpecification. */
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
  resourceSpecCharacteristicValue?: CharacteristicValueSpecification[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

/** Schema of the resources created from a ResourceSpecification. */
export type TargetResourceSchema = TargetSchema;

/** Relationship between two resource specifications. */
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

/** TMF634 ResourceSpecification. */
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

/** Create payload for a ResourceSpecification (without server-generated fields). */
export type NewResourceSpecification = Omit<ResourceSpecification, 'id' | 'href' | 'version'>;
