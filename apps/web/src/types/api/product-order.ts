import type {
  AgreementRef,
  ProductOfferingRef,
  ProductSpecificationRef,
  RelatedParty,
  TimePeriod,
} from './shared';

export type ProductOrderState =
  | 'acknowledged'
  | 'rejected'
  | 'pending'
  | 'held'
  | 'inProgress'
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'assessingCancellation'
  | 'pendingCancellation';

export type ProductOrderItemAction = 'add' | 'modify' | 'delete' | 'noChange';

export interface OrderItemProduct {
  id?: string;
  href?: string;
  productSpecification?: ProductSpecificationRef;
  '@type'?: string;
}

export interface OrderPrice {
  name?: string;
  priceType?: string;
  description?: string;
  /** Quote frozen at purchase time. */
  value?: number;
  unit?: string;
  '@type'?: string;
}

export interface ProductOrderItem {
  id: string;
  quantity?: number;
  action?: ProductOrderItemAction;
  state?: ProductOrderState;
  productOffering?: ProductOfferingRef;
  product?: OrderItemProduct;
  itemPrice?: OrderPrice[];
  itemTotalPrice?: OrderPrice[];
  productOrderItem?: ProductOrderItem[];
  '@type'?: string;
}

export interface ProductOrderNote {
  id?: string;
  author?: string;
  date?: string;
  text?: string;
  '@type'?: string;
}

export interface ProductOrder {
  id?: string;
  href?: string;
  orderDate?: string;
  completionDate?: string;
  requestedCompletionDate?: string;
  requestedStartDate?: string;
  expectedCompletionDate?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  category?: string;
  description?: string;
  externalId?: string;
  priority?: string;
  state?: ProductOrderState;
  agreement?: AgreementRef[];
  productOrderItem: ProductOrderItem[];
  relatedParty?: RelatedParty[];
  note?: ProductOrderNote[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

export type NewProductOrder = Omit<ProductOrder, 'id' | 'href'>;
