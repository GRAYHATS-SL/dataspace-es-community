'use server';

import type { NewProductOrder, ProductOrder, ProductOrderState } from '@/types/api';

import {
  apiFetch,
  apiFetchAll,
  filterAsBuyer,
  filterAsSeller,
  getCurrentUserOrganizationId,
  getSessionRoles,
  isBuyerRole,
  requireRole,
  withoutRelatedParty,
} from './_utils';
import { assertOfferingsProviderActive } from './offeringProvider';
import { assertAgreementParty, assertOrderParty, assertSelfInParties } from './ownership';
import { setOrderStateAsBackend } from './productOrderState';

const BASE = '/tmf-api/productOrderingManagement/v4/productOrder';

/**
 * @summary Gets all product orders.
 *
 * @returns {Promise<ProductOrder[]>} All product orders.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const orders = await fetchProductOrders();
 */
// Internal (not exported): a `'use server'` exports every function as an endpoint and this one returns orders for ALL organizations. Use `fetchProductOrdersAsBuyer/AsSeller`.
async function fetchProductOrders(): Promise<ProductOrder[]> {
  return apiFetchAll<ProductOrder>(BASE);
}

/**
 * @summary Gets the product orders where the active organization is the buyer.
 *
 * @returns {Promise<ProductOrder[]>} Orders filtered by role `Customer` (v2) or `buyer` (legacy).
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const purchases = await fetchProductOrdersAsBuyer();
 */
export async function fetchProductOrdersAsBuyer(): Promise<ProductOrder[]> {
  const roles = await getSessionRoles();
  if (!roles.has('BUYER') && !roles.has('ADMIN')) return [];
  const orders = await fetchProductOrders();
  return filterAsBuyer(orders);
}

/**
 * @summary Gets the product orders where the active organization is the seller.
 *
 * @returns {Promise<ProductOrder[]>} Orders filtered by role `seller`.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const sales = await fetchProductOrdersAsSeller();
 */
export async function fetchProductOrdersAsSeller(): Promise<ProductOrder[]> {
  if (!(await getSessionRoles()).has('ADMIN')) return [];
  const orders = await fetchProductOrders();
  return filterAsSeller(orders);
}

/**
 * @summary Gets a product order by id.
 *
 * @param {string}  id - Order id.
 * @returns {Promise<ProductOrder>} The product order.
 *
 * @throws {Error} HTTP 404 if not found; HTTP 5xx otherwise.
 *
 * @example
 * const order = await fetchProductOrderById('urn:ngsi-ld:productOrder:ord1');
 */
export async function fetchProductOrderById(id: string): Promise<ProductOrder> {
  const order = await apiFetch<ProductOrder>(`${BASE}/${id}`);
  await assertSelfInParties(order.relatedParty);
  return order;
}

/**
 * @summary Creates a product order with the active organization as buyer.
 *
 * @param {NewProductOrder}  payload - Order to create.
 * @returns {Promise<ProductOrder>} The created order.
 *
 * @throws {Error} If a provider is closed; HTTP 4xx/5xx on backend failure.
 *
 * @example
 * const order = await createProductOrder({
 *   productOrderItem: [{ id: '1', action: 'add', productOffering: { id: 'urn:...' } }],
 * });
 */
export async function createProductOrder(payload: NewProductOrder): Promise<ProductOrder> {
  await requireRole('BUYER');
  const orgId = await getCurrentUserOrganizationId();
  // Offerings from a deregistered organization cannot be purchased (the UI is not the barrier).
  await assertOfferingsProviderActive(
    (payload.productOrderItem ?? []).flatMap((i) =>
      i.productOffering?.id ? [i.productOffering.id] : [],
    ),
  );
  const relatedParty = [
    ...(payload.relatedParty ?? []).filter((p) => !isBuyerRole(p.role)),
    { id: orgId, role: 'Customer', '@referredType': 'Organization' },
  ];
  const body: NewProductOrder = { ...payload, relatedParty };
  delete body.state;
  return apiFetch<ProductOrder>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * @summary Partially updates an existing product order.
 *
 * @param {string}                  id - Order id.
 * @param {Partial<ProductOrder>}   payload - Fields to update.
 * @returns {Promise<ProductOrder>} The updated order.
 *
 * @throws {Error} HTTP 4xx/5xx if the backend call fails.
 *
 * @example
 * const updated = await patchProductOrder('urn:ngsi-ld:productOrder:ord1', { state: 'completed' });
 */
export async function patchProductOrder(
  id: string,
  payload: Partial<ProductOrder>,
): Promise<ProductOrder> {
  await assertOrderParty(id);
  return apiFetch<ProductOrder>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(withoutRelatedParty(payload)),
  });
}

/**
 * @summary Changes a product order's state from the UI.
 *
 * @param {string}            id - Order id.
 * @param {ProductOrderState} state - New order state.
 * @returns {Promise<ProductOrder>} The order with the new state.
 *
 * @throws {Error} HTTP 4xx/5xx on backend failure; error if `completed` is requested.
 *
 * @example
 * const order = await transitionProductOrderState('urn:ngsi-ld:productOrder:ord1', 'cancelled');
 */
export async function transitionProductOrderState(
  id: string,
  state: ProductOrderState,
): Promise<ProductOrder> {
  if (state === 'cancelled') return cancelProductOrder(id);
  if (state === 'completed') {
    throw new Error('Un pedido solo pasa a completado tras verificar el pago en el servidor.');
  }
  return patchProductOrder(id, { state });
}

export async function linkAgreementToOrder(
  orderId: string,
  agreementId: string,
  agreementName?: string,
): Promise<ProductOrder> {
  await assertOrderParty(orderId);
  await assertAgreementParty(agreementId);
  return apiFetch<ProductOrder>(`${BASE}/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ agreement: [{ id: agreementId, name: agreementName }] }),
  });
}

/**
 * @summary Cancels a product order.
 *
 * @param {string}  orderId - Order id.
 * @returns {Promise<ProductOrder>} The order with `state: 'cancelled'`.
 *
 * @throws {Error} `Forbidden` if the organization is not a party; HTTP 4xx/5xx from the backend.
 *
 * @example
 * const order = await cancelProductOrder('urn:ngsi-ld:productOrder:ord1');
 */
export async function cancelProductOrder(orderId: string): Promise<ProductOrder> {
  return setOrderStateAsBackend(orderId, 'cancelled');
}
