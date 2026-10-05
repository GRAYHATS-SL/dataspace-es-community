import type {
  EntityRef,
  Price,
  ProductOfferingPriceRef,
  ProductOfferingRef,
  ProductSpecificationRef,
  RelatedParty,
} from './shared';

/** TMF637 product lifecycle status. */
export type ProductStatus =
  | 'created'
  | 'pendingActive'
  | 'active'
  | 'suspended'
  | 'pendingTerminate'
  | 'terminated'
  | 'cancelled'
  | 'aborted';

/** Name/value characteristic of a product. */
export interface ProductCharacteristic {
  id?: string;
  name: string;
  valueType?: string;
  value?: unknown;
  '@type'?: string;
}

/** Reference to the agreement a product is bound to. */
export interface ProductAgreementRef extends EntityRef {
  agreementItemId?: string;
}

/** Reference to the order item that created or modified a product. */
export interface RelatedProductOrderItem {
  orderItemAction?: string;
  orderItemId?: string;
  productOrderId?: string;
  productOrderHref?: string;
  role?: string;
  '@type'?: string;
}

/** Price of a product instance. */
export interface ProductPrice {
  name?: string;
  description?: string;
  priceType?: string;
  recurringChargePeriod?: string;
  unitOfMeasure?: string;
  price?: Price;
  productOfferingPrice?: ProductOfferingPriceRef;
  '@type'?: string;
}

/** TMF637 Product (inventory item). */
export interface ProductInventory {
  id?: string;
  href?: string;
  name?: string;
  description?: string;
  isBundle?: boolean;
  isCustomerVisible?: boolean;
  orderDate?: string;
  startDate?: string;
  terminationDate?: string;
  productSerialNumber?: string;
  status?: ProductStatus;
  productOffering?: ProductOfferingRef;
  productSpecification?: ProductSpecificationRef;
  productOrderItem?: RelatedProductOrderItem[];
  productCharacteristic?: ProductCharacteristic[];
  productPrice?: ProductPrice[];
  relatedParty?: RelatedParty[];
  agreement?: ProductAgreementRef[];
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a Product (without server-generated fields). */
export type NewProductInventory = Omit<ProductInventory, 'id' | 'href'> & {
  status: ProductStatus;
};
