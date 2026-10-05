'use server';

import type {
  CancelProductOrder,
  NewProductOrder,
  ProductOrder,
  ProductOrderState,
} from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/productOrderingManagement/v4/productOrder';
const CANCEL_BASE = '/tmf-api/productOrderingManagement/v4/cancelProductOrder';

/** Lists product orders. */
export async function fetchProductOrders(): Promise<ProductOrder[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ProductOrder[]>(withLimit(BASE));
}

/** Fetches a single product order by id. */
export async function fetchProductOrderById(id: string): Promise<ProductOrder> {
  // Here you define your business logic.
  return apiFetch<ProductOrder>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates a product order. */
export async function createProductOrder(payload: NewProductOrder): Promise<ProductOrder> {
  // Here you define your business logic (related parties, initial state, validations...).
  return apiFetch<ProductOrder>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Partially updates a product order. */
export async function patchProductOrder(
  id: string,
  payload: Partial<ProductOrder>,
): Promise<ProductOrder> {
  // Here you define your business logic.
  return apiFetch<ProductOrder>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Moves a product order to a new state. */
export async function transitionProductOrderState(
  id: string,
  state: ProductOrderState,
): Promise<ProductOrder> {
  // Here you define your business logic (allowed state transitions...).
  return patchProductOrder(id, { state });
}

/** Links an agreement to a product order. */
export async function linkAgreementToOrder(
  orderId: string,
  agreementId: string,
  agreementName?: string,
): Promise<ProductOrder> {
  // Here you define your business logic.
  return apiFetch<ProductOrder>(`${BASE}/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ agreement: [{ id: agreementId, name: agreementName }] }),
  });
}

/** Requests the cancellation of a product order. */
export async function cancelProductOrder(
  orderId: string,
  cancellationReason?: string,
): Promise<CancelProductOrder> {
  // Here you define your business logic (cancellation rules...).
  const body: Omit<CancelProductOrder, 'id' | 'href'> = {
    productOrder: { id: orderId },
    ...(cancellationReason ? { cancellationReason } : {}),
  };
  return apiFetch<CancelProductOrder>(CANCEL_BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
