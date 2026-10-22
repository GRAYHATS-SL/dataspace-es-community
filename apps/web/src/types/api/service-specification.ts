import type {
  AttachmentRefOrValue,
  CharacteristicValueSpecification,
  ConstraintRef,
  FeatureSpecification,
  RelatedParty,
  ResourceSpecificationRef,
  TimePeriod,
} from './shared';

export interface CharacteristicSpecificationRelationship {
  characteristicSpecificationId?: string;
  name?: string;
  parentSpecificationHref?: string;
  parentSpecificationId?: string;
  relationshipType?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ServiceSpecCharacteristic {
  id?: string;
  name: string;
  configurable?: boolean;
  description?: string;
  extensible?: boolean;
  isUnique?: boolean;
  maxCardinality?: number;
  minCardinality?: number;
  regex?: string;
  valueType?: string;
  charSpecRelationship?: CharacteristicSpecificationRelationship[];
  characteristicValueSpecification?: CharacteristicValueSpecification[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

export interface ServiceLevelSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceSpecRelationship {
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

export interface EntitySpecificationRelationship {
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

export interface TargetEntitySchema {
  '@schemaLocation': string;
  '@type': string;
}

export interface ServiceSpecification {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  version?: string;
  attachment?: AttachmentRefOrValue[];
  constraint?: ConstraintRef[];
  entitySpecRelationship?: EntitySpecificationRelationship[];
  featureSpecification?: FeatureSpecification[];
  relatedParty?: RelatedParty[];
  resourceSpecification?: ResourceSpecificationRef[];
  serviceLevelSpecification?: ServiceLevelSpecificationRef[];
  specCharacteristic?: ServiceSpecCharacteristic[];
  serviceSpecRelationship?: ServiceSpecRelationship[];
  targetEntitySchema?: TargetEntitySchema;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type NewServiceSpecification = Omit<ServiceSpecification, 'id' | 'href' | 'version'>;
