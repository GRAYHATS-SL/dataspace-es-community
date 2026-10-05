import type { ProductOfferingTerm } from './product-offering';
import type {
  BundledProductOfferingPriceRelationship,
  ConstraintRef,
  Money,
  PlaceRef,
  PricingLogicAlgorithm,
  ProductOfferingPriceRelationship,
  ProductSpecificationCharacteristicValueUse,
  Quantity,
  TaxItem,
  TimePeriod,
} from './shared';

/** TMF620 ProductOfferingPrice. */
export interface ProductOfferingPrice {
  id?: string;
  href?: string;
  description?: string;
  isBundle?: boolean;
  lastUpdate?: string;
  lifecycleStatus?: string;
  name?: string;
  percentage?: number;
  priceType?: string;
  recurringChargePeriodLength?: number;
  recurringChargePeriodType?: string;
  version?: string;
  bundledPopRelationship?: BundledProductOfferingPriceRelationship[];
  constraint?: ConstraintRef[];
  place?: PlaceRef[];
  popRelationship?: ProductOfferingPriceRelationship[];
  price?: Money;
  pricingLogicAlgorithm?: PricingLogicAlgorithm[];
  prodSpecCharValueUse?: ProductSpecificationCharacteristicValueUse[];
  productOfferingTerm?: ProductOfferingTerm[];
  tax?: TaxItem[];
  unitOfMeasure?: Quantity;
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a ProductOfferingPrice (without server-generated fields). */
export type NewProductOfferingPrice = Omit<ProductOfferingPrice, 'id' | 'href' | 'version'>;
