import { registerTransaction } from '@/lib/services/transactionLog';
import {
  buildAgreementCharacteristics,
  buildTermOrConditions,
} from '@/lib/utils/buildAgreementPayload';
import { buildProductPayload } from '@/lib/utils/buildProductPayload';
import { trackError } from '@/lib/utils/sentry';
import { DEFAULT_AGREEMENT_TERMS } from '@/lib/validations/agreement.schema';
import type {
  Agreement,
  NewAgreement,
  ProductInventory,
  ProductOrder,
  ProductOrderState,
} from '@/types/api';

import { isBuyerRole } from './_utils';
import { createAgreement } from './agreement';
import { createProduct } from './productInventory';
import { linkAgreementToOrder } from './productOrder';
import { setOrderStateAsBackend } from './productOrderState';

export type FinalizeOrderStep = 'transition' | 'agreement' | 'link' | 'product';
export type CompleteOrderPaymentStep = FinalizeOrderStep | 'unauthorized' | 'payment';

export type FinalizeOrderResult =
  | { ok: true; order: ProductOrder; agreement?: Agreement; product?: ProductInventory }
  | { ok: false; step: FinalizeOrderStep; message: string };

export type CompleteOrderPaymentResult =
  | { ok: true; order: ProductOrder; agreement?: Agreement; product?: ProductInventory }
  | { ok: false; step: CompleteOrderPaymentStep; message: string };

const RECONCILABLE_STATES: readonly ProductOrderState[] = ['acknowledged', 'pending', 'held'];

/** v2: orders are created without `state` (pending payment). */
export function isReconcilableState(state: ProductOrderState | undefined): boolean {
  return state === undefined || RECONCILABLE_STATES.includes(state);
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido';
}

/**
 * @summary Completes an order and provisions the buyer's access in one step.
 *
 * @param {ProductOrder}  order - Order whose payment is verified as `succeeded`.
 * @returns {Promise<FinalizeOrderResult>} Created resources, or the step that failed.
 */
export async function finalizeCompletedOrder(order: ProductOrder): Promise<FinalizeOrderResult> {
  if (!order.id) {
    return { ok: false, step: 'transition', message: 'La orden no tiene un identificador válido.' };
  }

  let completedOrder: ProductOrder;
  try {
    completedOrder =
      order.state === 'completed' ? order : await setOrderStateAsBackend(order.id, 'completed');
  } catch (err) {
    return { ok: false, step: 'transition', message: errorMessage(err) };
  }

  if (completedOrder.agreement?.length) {
    return { ok: true, order: completedOrder };
  }

  const offeringRef = order.productOrderItem?.[0]?.productOffering;
  const agreementPayload: NewAgreement = {
    name: `Acuerdo — ${offeringRef?.name ?? offeringRef?.id ?? order.id}`,
    agreementType: 'dataSharing',
    status: 'approved',
    initialDate: new Date().toISOString(),
    engagedParty: completedOrder.relatedParty ?? order.relatedParty ?? [],
    agreementItem: [
      {
        productOffering: offeringRef ? [{ id: offeringRef.id, name: offeringRef.name }] : [],
        termOrCondition: buildTermOrConditions(DEFAULT_AGREEMENT_TERMS),
      },
    ],
    characteristic: buildAgreementCharacteristics(DEFAULT_AGREEMENT_TERMS),
  };

  let agreement: Agreement;
  try {
    agreement = await createAgreement(agreementPayload);
  } catch (err) {
    return { ok: false, step: 'agreement', message: errorMessage(err) };
  }

  try {
    await linkAgreementToOrder(order.id, agreement.id!, agreementPayload.name);
  } catch (err) {
    return { ok: false, step: 'link', message: errorMessage(err) };
  }

  let product: ProductInventory;
  try {
    product = await createProduct(buildProductPayload(agreement, completedOrder));
  } catch (err) {
    return { ok: false, step: 'product', message: errorMessage(err) };
  }

  await traceOrderPurchase(completedOrder, order);
  return { ok: true, order: completedOrder, agreement, product };
}

/**
 * @summary Records the purchase in the immutable ledger without affecting finalization.
 */
async function traceOrderPurchase(
  completedOrder: ProductOrder,
  order: ProductOrder,
): Promise<void> {
  const id_product_order = order.id;
  const id_product_offer = order.productOrderItem?.[0]?.productOffering?.id;
  const id_buyer = (completedOrder.relatedParty ?? order.relatedParty)?.find((p) =>
    isBuyerRole(p.role),
  )?.id;

  try {
    if (!id_product_order || !id_product_offer || !id_buyer) {
      throw new Error('TransactionLog: la orden no tiene oferta o comprador');
    }
    const receipt = await registerTransaction({ id_product_order, id_product_offer, id_buyer });
    if (receipt.blockchain.status !== 'confirmed') {
      trackError(new Error(`TransactionLog: blockchain.status=${receipt.blockchain.status}`), {
        orderId: id_product_order,
      });
    }
  } catch (err) {
    trackError(err, { orderId: id_product_order });
  }
}
