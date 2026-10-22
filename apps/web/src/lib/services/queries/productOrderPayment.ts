'use server';

import { assertBackendCredentialConfigured } from '@/lib/services/backendCredential';
import { retrievePaymentIntent } from '@/lib/services/payments/stripe';
import { getSession } from '@/lib/session';
import type { ProductOrder } from '@/types/api';

import { isBuyerRole } from './_utils';
import { fetchProductOrderById } from './productOrder';
import {
  type CompleteOrderPaymentResult,
  errorMessage,
  finalizeCompletedOrder,
  isReconcilableState,
} from './productOrderFinalize';
import { setOrderStateAsBackend } from './productOrderState';

/**
 * @summary Verifies server-side that an order's payment completed and provisions it.
 *
 * @param {string}  orderId - Order id.
 * @returns {Promise<CompleteOrderPaymentResult>} Provisioning result, or the step that failed.
 */
export async function completeProductOrderPayment(
  orderId: string,
): Promise<CompleteOrderPaymentResult> {
  const { userProfile } = await getSession();
  const buyerOrgId = userProfile?.organizationId;
  if (!buyerOrgId) {
    return { ok: false, step: 'unauthorized', message: 'No hay una sesión activa.' };
  }

  let order: ProductOrder;
  try {
    order = await fetchProductOrderById(orderId);
  } catch (err) {
    return { ok: false, step: 'unauthorized', message: errorMessage(err) };
  }

  const isBuyer = order.relatedParty?.some((p) => p.id === buyerOrgId && isBuyerRole(p.role));
  if (!isBuyer) {
    return {
      ok: false,
      step: 'unauthorized',
      message: 'Esta orden no pertenece a tu organización.',
    };
  }

  if (!order.externalId) {
    return finalizeCompletedOrder(order);
  }

  let paymentIntent;
  try {
    paymentIntent = await retrievePaymentIntent(order.externalId);
  } catch (err) {
    return { ok: false, step: 'payment', message: errorMessage(err) };
  }

  if (paymentIntent.status !== 'succeeded') {
    return {
      ok: false,
      step: 'payment',
      message: `El pago todavía no se ha completado (estado: ${paymentIntent.status}).`,
    };
  }

  return finalizeCompletedOrder(order);
}

/**
 * @summary Reconciles an orphaned order by re-checking its payment in Stripe.
 *
 * @param {ProductOrder}  clientOrder - Intermediate-state order (only its `id` is used).
 * @returns {Promise<ProductOrder | null>} The updated order if its state changed, or `null` if nothing to reconcile.
 *
 * @throws {Error} If the state must change and the backend credential is missing.
 */
export async function reconcileProductOrderPayment(
  clientOrder: ProductOrder,
): Promise<ProductOrder | null> {
  if (!clientOrder.id) return null;

  // The order coming from the browser cannot be trusted (`externalId`, `state`): it is re-read on the server, which also validates that the session's organization is part of the order.
  let order: ProductOrder;
  try {
    order = await fetchProductOrderById(clientOrder.id);
  } catch {
    return null;
  }

  if (!order.id || !order.externalId || !isReconcilableState(order.state)) {
    return null;
  }

  let paymentIntent;
  try {
    paymentIntent = await retrievePaymentIntent(order.externalId);
  } catch {
    return null;
  }

  if (paymentIntent.status === 'succeeded') {
    assertBackendCredentialConfigured();
    const result = await finalizeCompletedOrder(order);
    return result.ok ? result.order : null;
  }

  if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
    assertBackendCredentialConfigured();
    try {
      return await setOrderStateAsBackend(order.id, 'rejected');
    } catch {
      return null;
    }
  }

  return null;
}
