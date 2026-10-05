// TM Forum sub-types shared across entities.

/** Validity period of an entity. */
export interface TimePeriod {
  startDateTime?: string;
  endDateTime?: string;
}

/** Amount with a unit (e.g. duration or size). */
export interface Quantity {
  amount?: number;
  units?: string;
}

/** Generic TMF entity reference. */
export interface EntityRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** Reference to a Category. */
export interface CategoryRef extends EntityRef {
  version?: string;
}

/** Reference to a ProductSpecification. */
export interface ProductSpecificationRef extends EntityRef {
  version?: string;
}

/** Reference to a ProductOfferingPrice. */
export type ProductOfferingPriceRef = EntityRef;

/** Reference to a Place. */
export type PlaceRef = EntityRef;

/** Reference to a sales Channel. */
export type ChannelRef = EntityRef;

/** Reference to a MarketSegment. */
export type MarketSegmentRef = EntityRef;

/** Reference to an Agreement. */
export type AgreementRef = EntityRef;

/** Reference to a Service Level Agreement. */
export type SLARef = EntityRef;

/** Reference to a ResourceCandidate. */
export interface ResourceCandidateRef extends EntityRef {
  version?: string;
}

/** Reference to a ServiceCandidate. */
export interface ServiceCandidateRef extends EntityRef {
  version?: string;
}

/** Attachment reference or embedded value. */
export interface AttachmentRefOrValue {
  id?: string;
  href?: string;
  attachmentType?: string;
  content?: string;
  description?: string;
  mimeType?: string;
  name?: string;
  url?: string;
  size?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** Monetary amount with its currency unit. */
export interface Money {
  unit?: string;
  value?: number;
}

/** Price amounts with and without taxes. */
export interface Price {
  percentage?: number;
  taxRate?: number;
  dutyFreeAmount?: Money;
  taxIncludedAmount?: Money;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Reference to a party playing a role in an entity. */
export interface RelatedParty extends EntityRef {
  role?: string;
  '@referredType': string;
}

/** Reference to a ProductOffering. */
export type ProductOfferingRef = EntityRef;

/** Reference to a ResourceSpecification. */
export interface ResourceSpecificationRef extends EntityRef {
  version?: string;
}

/** Reference to a ServiceSpecification. */
export interface ServiceSpecificationRef extends EntityRef {
  version?: string;
}

/** Reference to a policy Constraint. */
export interface ConstraintRef extends EntityRef {
  version?: string;
}

/** Schema that describes the target entity of a specification. */
export interface TargetSchema {
  '@schemaLocation': string;
  '@type': string;
}

/** Schema of the products created from a ProductSpecification. */
export type TargetProductSchema = TargetSchema;

/** Possible value of a specification characteristic. */
export interface CharacteristicValueSpecification {
  isDefault?: boolean;
  rangeInterval?: string;
  regex?: string;
  unitOfMeasure?: string;
  valueFrom?: number;
  valueTo?: number;
  valueType?: string;
  validFor?: TimePeriod;
  value?: string | number | boolean | Record<string, unknown>;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Tax applied to a price. */
export interface TaxItem {
  id?: string;
  href?: string;
  taxCategory?: string;
  taxRate?: number;
  taxAmount?: Money;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Algorithm used to compute a price. */
export interface PricingLogicAlgorithm {
  id?: string;
  href?: string;
  description?: string;
  name?: string;
  plaSpecId?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Relationship between two product offering prices. */
export interface ProductOfferingPriceRelationship {
  id?: string;
  href?: string;
  name?: string;
  relationshipType?: string;
  role?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

/** Price contained in a bundled product offering price. */
export interface BundledProductOfferingPriceRelationship {
  id?: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Relationship between two product specification characteristics. */
export interface ProductSpecificationCharacteristicRelationship {
  id?: string;
  href?: string;
  charSpecSeq?: number;
  name?: string;
  relationshipType?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Characteristic of a ProductSpecification. */
export interface ProductSpecificationCharacteristic {
  id?: string;
  configurable?: boolean;
  description?: string;
  extensible?: boolean;
  isUnique?: boolean;
  maxCardinality?: number;
  minCardinality?: number;
  name?: string;
  regex?: string;
  valueType?: string;
  productSpecCharRelationship?: ProductSpecificationCharacteristicRelationship[];
  productSpecCharacteristicValue?: CharacteristicValueSpecification[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

/** Characteristic values used by a product offering price. */
export interface ProductSpecificationCharacteristicValueUse {
  id?: string;
  description?: string;
  maxCardinality?: number;
  minCardinality?: number;
  name?: string;
  valueType?: string;
  productSpecCharacteristicValue?: CharacteristicValueSpecification[];
  productSpecification?: ProductSpecificationRef;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Relationship between a feature characteristic and another characteristic. */
export interface FeatureSpecificationCharacteristicRelationship {
  characteristicId?: string;
  featureId?: string;
  name?: string;
  relationshipType?: string;
  resourceSpecificationHref?: string;
  resourceSpecificationId?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Characteristic of a feature specification. */
export interface FeatureSpecificationCharacteristic {
  id?: string;
  configurable?: boolean;
  description?: string;
  extensible?: boolean;
  isUnique?: boolean;
  maxCardinality?: number;
  minCardinality?: number;
  name?: string;
  regex?: string;
  valueType?: string;
  featureSpecCharRelationship?: FeatureSpecificationCharacteristicRelationship[];
  featureSpecCharacteristicValue?: CharacteristicValueSpecification[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@valueSchemaLocation'?: string;
}

/** Relationship between two feature specifications. */
export interface FeatureSpecificationRelationship {
  featureId?: string;
  name?: string;
  relationshipType?: string;
  resourceSpecificationHref?: string;
  resourceSpecificationId?: string;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Feature exposed by a service or resource specification. */
export interface FeatureSpecification {
  id?: string;
  isBundle?: boolean;
  isEnabled?: boolean;
  name?: string;
  constraint?: ConstraintRef[];
  featureSpecCharacteristic?: FeatureSpecificationCharacteristic[];
  featureSpecRelationship?: FeatureSpecificationRelationship[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}
