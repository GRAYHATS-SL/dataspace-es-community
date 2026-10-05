import type {
  AgreementRef,
  EntityRef,
  Price,
  ProductOfferingRef,
  ProductSpecificationRef,
  RelatedParty,
  TimePeriod,
} from './shared';

/** TMF622 ProductOrder state. */
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

/** Action requested on an order item. */
export type ProductOrderItemAction = 'add' | 'modify' | 'delete' | 'noChange';

/** Product configured by an order item. */
export interface OrderItemProduct {
  id?: string;
  href?: string;
  productSpecification?: ProductSpecificationRef;
  '@type'?: string;
}

/** Price of an order item. */
export interface OrderPrice {
  name?: string;
  description?: string;
  priceType?: string;
  recurringChargePeriod?: string;
  unitOfMeasure?: string;
  price?: Price;
  '@type'?: string;
}

/** Item of a product order. */
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

/** Note attached to a product order. */
export interface ProductOrderNote {
  id?: string;
  author?: string;
  date?: string;
  text?: string;
  '@type'?: string;
}

/** TMF622 ProductOrder. */
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
  orderTotalPrice?: OrderPrice[];
  validFor?: TimePeriod;
  '@baseType'?: string;
  '@schemaLocation'?: string;
  '@type'?: string;
}

/** Create payload for a ProductOrder (without server-generated fields). */
export type NewProductOrder = Omit<ProductOrder, 'id' | 'href'>;

/** TMF622 CancelProductOrder task. */
export interface CancelProductOrder {
  id?: string;
  href?: string;
  cancellationReason?: string;
  requestedCancellationDate?: string;
  state?: string;
  productOrder: Pick<EntityRef, 'id' | 'href'>;
  relatedParty?: RelatedParty[];
  '@type'?: string;
}
