import type {
  AttachmentRefOrValue,
  CharacteristicValueSpecification,
  ConstraintRef,
  EntityRef,
  FeatureSpecification,
  RelatedParty,
  ResourceSpecificationRef,
  TargetSchema,
  TimePeriod,
} from './shared';

/** Relationship between two characteristic specifications. */
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

/** Characteristic of a ServiceSpecification. */
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

/** Reference to a ServiceLevelSpecification. */
export type ServiceLevelSpecificationRef = EntityRef;

/** Relationship between two service specifications. */
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

/** Relationship between a service specification and another entity specification. */
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

/** Schema of the entities created from a ServiceSpecification. */
export type TargetEntitySchema = TargetSchema;

/** TMF633 ServiceSpecification. */
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

/** Create payload for a ServiceSpecification (without server-generated fields). */
export type NewServiceSpecification = Omit<ServiceSpecification, 'id' | 'href' | 'version'>;
