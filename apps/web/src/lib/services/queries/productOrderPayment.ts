'use server';

import type Stripe from 'stripe';

import { retrievePaymentIntent } from '@/lib/services/payments/stripe';
import type { ProductOrder } from '@/types/api';

import { getCurrentUser } from './_utils';
import { fetchProductOrderById, transitionProductOrderState } from './productOrder';

/** Step of the order finalization that failed. */
export type FinalizeOrderStep = 'transition' | 'provisioning';
/** Step of the payment completion that failed. */
export type CompleteOrderPaymentStep = FinalizeOrderStep | 'unauthorized' | 'payment';

/** Result of `finalizeCompletedOrder`. */
export type FinalizeOrderResult =
  | { ok: true; order: ProductOrder }
  | { ok: false; step: FinalizeOrderStep; message: string };

/** Result of `completeProductOrderPayment`. */
export type CompleteOrderPaymentResult =
  | { ok: true; order: ProductOrder }
  | { ok: false; step: CompleteOrderPaymentStep; message: string };

/** Normalizes an unknown error into a message. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido';
}

/** Completes an order whose payment is verified and provisions the buyer's access. */
export async function finalizeCompletedOrder(order: ProductOrder): Promise<FinalizeOrderResult> {
  if (!order.id) {
    return { ok: false, step: 'transition', message: 'La orden no tiene un identificador válido.' };
  }

  let completedOrder: ProductOrder;
  try {
    completedOrder =
      order.state === 'completed'
        ? order
        : await transitionProductOrderState(order.id, 'completed');
  } catch (err) {
    return { ok: false, step: 'transition', message: errorMessage(err) };
  }

  // Here you define your business logic (create the agreement/product and link them to the
  // order; return `{ ok: false, step: 'provisioning', message }` when a step fails).
  return { ok: true, order: completedOrder };
}

/** Verifies server-side that an order's payment succeeded and completes the order. */
export async function completeProductOrderPayment(
  orderId: string,
): Promise<CompleteOrderPaymentResult> {
  try {
    await getCurrentUser();
  } catch {
    return { ok: false, step: 'unauthorized', message: 'No hay una sesión activa.' };
  }

  let order: ProductOrder;
  try {
    order = await fetchProductOrderById(orderId);
  } catch (err) {
    return { ok: false, step: 'unauthorized', message: errorMessage(err) };
  }

  // Here you define your business logic (check that the order belongs to the current buyer).

  // No external payment id: free order, nothing to verify against Stripe.
  if (!order.externalId) return finalizeCompletedOrder(order);

  let paymentIntent: Stripe.PaymentIntent;
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

/** Re-checks an orphaned order's payment against Stripe and completes or rejects it. */
// eslint-disable-next-line sonarjs/no-invariant-returns
export async function reconcileProductOrderPayment(
  order: ProductOrder,
): Promise<ProductOrder | null> {
  if (!order.id || !order.externalId) return null;

  try {
    await retrievePaymentIntent(order.externalId);
  } catch {
    return null;
  }

  // Here you define your business logic (map the payment status to the order state: complete,
  // reject or leave untouched).
  return null;
}
