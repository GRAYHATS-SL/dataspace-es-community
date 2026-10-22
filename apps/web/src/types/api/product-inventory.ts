import type { Money, ProductOfferingRef, ProductSpecificationRef, RelatedParty } from './shared';

export type ProductStatus =
  | 'created'
  | 'pendingActive'
  | 'active'
  | 'suspended'
  | 'pendingTerminate'
  | 'terminated'
  | 'cancelled'
  | 'aborted';

export interface ProductCharacteristic {
  id?: string;
  name: string;
  valueType?: string;
  value?: unknown;
  '@type'?: string;
}

export interface ProductAgreementRef {
  id: string;
  href?: string;
  name?: string;
  agreementItemId?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
  '@referredType'?: string;
}

export interface RelatedProductOrderItem {
  orderItemAction?: string;
  orderItemId?: string;
  productOrderId?: string;
  productOrderHref?: string;
  role?: string;
  '@type'?: string;
}

/** Price paid for the token, frozen at purchase time. */
export interface ProductPrice {
  price: Money;
}

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

export type NewProductInventory = Omit<ProductInventory, 'id' | 'href'> & {
  status: ProductStatus;
};
