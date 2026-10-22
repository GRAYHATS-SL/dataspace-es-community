// Types shared between TMF entities

export interface Addressable {
  id?: string;
  href?: string;
}

export interface AgreementRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface Attachment {
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
}

export interface AttachmentRef {
  id: string;
  href?: string;
  description?: string;
  name?: string;
  url?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface AttachmentRefOrValue extends AttachmentRef {
  attachmentType?: string;
  content?: string;
  mimeType?: string;
  size?: Quantity;
  validFor?: TimePeriod;
}

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

export interface BundledProductOfferingOption {
  numberRelOfferDefault?: number;
  numberRelOfferLowerLimit?: number;
  numberRelOfferUpperLimit?: number;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface BundledProductOfferingPriceRelationship {
  id?: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface BundledProductSpecification {
  id?: string;
  href?: string;
  lifecycleStatus?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface CategoryRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ChannelRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface CharacteristicValueSpecification {
  isDefault?: boolean;
  rangeInterval?: string;
  regex?: string;
  unitOfMeasure?: string;
  valueFrom?: number;
  valueTo?: number;
  valueType?: string;
  validFor?: TimePeriod;
  value?: string | number | Record<string, unknown>;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ConstraintRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface Duration {
  amount?: number;
  units?: string;
}

export interface MarketSegmentRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface Money {
  unit?: string;
  value?: number;
}

export interface PlaceRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface POPAlteration {
  id?: string;
  href?: string;
  description?: string;
  name?: string;
  priceType: string;
  priority?: number;
  recurringChargePeriod?: string;
  applicationDuration?: Duration;
  price: ProductPriceValue;
  unitOfMeasure?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface POPCharge {
  id?: string;
  href?: string;
  description?: string;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  priceType?: string;
  recurringChargePeriod?: string;
  recurringChargePeriodLength?: number;
  version?: string;
  constraint?: ConstraintRef[];
  price?: ProductPriceValue;
  priceAlteration?: POPAlteration[];
  unitOfMeasure?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

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

export interface ProductOfferingRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

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

export interface ProductOfferingTerm {
  description?: string;
  name?: string;
  duration?: Duration;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductOfferingPriceRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

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

export interface ProductPriceValue {
  percentage?: number;
  taxCategory?: string;
  taxRate?: number;
  dutyFreeAmount?: Money;
  taxIncludedAmount?: Money;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export interface ProductSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  targetProductSchema?: TargetProductSchema;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

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

export interface Quantity {
  amount?: number;
  units?: string;
}

export interface RelatedParty {
  id: string;
  href?: string;
  name?: string;
  role?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType': string;
}

export interface ResourceCandidateRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ResourceSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceCandidateRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface ServiceSpecificationRef {
  id: string;
  href?: string;
  name?: string;
  version?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface SLARef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface TargetProductSchema {
  '@schemaLocation': string;
  '@type': string;
}

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

export interface TimePeriod {
  endDateTime?: string;
  startDateTime?: string;
}

export interface CatalogRef {
  id: string;
  href?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface AccountRef {
  id: string;
  href?: string;
  description?: string;
  name?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

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

export interface ProductOfferingPriceRefOrValue extends ProductOfferingPriceRef {
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  percentage?: number;
  priceType?: string;
  recurringChargePeriodLength?: number;
  recurringChargePeriodType?: string;
  version?: string;
  bundledPopRelationship?: BundledProductOfferingPriceRelationship[];
  constraint?: ConstraintRef[];
  popRelationship?: ProductOfferingPriceRelationship[];
  price?: ProductPriceValue;
  priceAlteration?: POPAlteration[];
  pricingLogicAlgorithm?: PricingLogicAlgorithm[];
  prodSpecCharValueUse?: ProductSpecificationCharacteristicValueUse[];
  tax?: TaxItem[];
  unitOfMeasure?: Quantity;
  validFor?: TimePeriod;
}
