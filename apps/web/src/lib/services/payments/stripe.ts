'use server';

import Stripe from 'stripe';

import { patchOrganization } from '@/lib/services/queries/party';

let stripeClient: Stripe | null = null;

/** Returns a lazily created Stripe client, or `null` when `STRIPE_SECRET_KEY` is missing. */
function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

/** Returns the Stripe client or throws a clear error when it is not configured. */
function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) throw new Error('STRIPE_SECRET_KEY is not configured');
  return stripe;
}

const NOT_CONFIGURED_MESSAGE = 'Los pagos no están configurados.';

/** Price breakdown shown to the buyer (amounts in euros). */
export interface PriceBreakdown {
  feeAmountEur: number;
  totalAmountEur: number;
}

/** Computes the charge for an offering price (amounts in euros). */
function computeBreakdown(amountEur: number): PriceBreakdown & { totalAmountCents: number } {
  // Here you define your business logic (server-side pricing, fees/commission, taxes...).
  const totalAmountEur = amountEur;
  return { feeAmountEur: 0, totalAmountEur, totalAmountCents: Math.round(totalAmountEur * 100) };
}

/** Returns the price breakdown for an amount without creating any charge. */
export async function getPriceBreakdown(amountEur: number): Promise<PriceBreakdown> {
  const { feeAmountEur, totalAmountEur } = computeBreakdown(amountEur);
  return { feeAmountEur, totalAmountEur };
}

/** Result of `createPaymentIntent`. */
export type CreatePaymentIntentResult =
  | ({ ok: true; id: string; clientSecret: string } & PriceBreakdown)
  | { ok: false; message: string };

/** Creates a Stripe `PaymentIntent` for an offering purchase. */
export async function createPaymentIntent(
  amountEur: number,
  metadata: Record<string, string>,
): Promise<CreatePaymentIntentResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, message: NOT_CONFIGURED_MESSAGE };

  const { feeAmountEur, totalAmountEur, totalAmountCents } = computeBreakdown(amountEur);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      // Here you define your business logic (connected account destination, application fee...).
      metadata,
    });

    if (!paymentIntent.client_secret) {
      return { ok: false, message: 'Stripe no devolvió un client_secret para el pago.' };
    }

    return {
      ok: true,
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      feeAmountEur,
      totalAmountEur,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Error al crear el pago.' };
  }
}

/** Retrieves the current state of a `PaymentIntent` (source of truth for a charge). */
export async function retrievePaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  return requireStripe().paymentIntents.retrieve(paymentIntentId);
}

/** Cancels a `PaymentIntent` that has not been confirmed yet. No-op when Stripe is not configured. */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  await stripe.paymentIntents.cancel(paymentIntentId);
}

/** Checks that a Stripe Connect account exists and can receive charges and payouts. */
export async function verifyConnectAccount(
  accountId: string,
): Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean }> {
  const account = await requireStripe().accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
  };
}

/** Result of `saveStripeConnectAccountId`. */
export type SaveStripeAccountResult = { ok: true } | { ok: false; message: string };

/** Validates a provider's Stripe Connect account id and stores it on its organization. */
export async function saveStripeConnectAccountId(
  organizationId: string,
  stripeAccountId: string,
): Promise<SaveStripeAccountResult> {
  if (!getStripe()) return { ok: false, message: NOT_CONFIGURED_MESSAGE };

  let status: { chargesEnabled: boolean; payoutsEnabled: boolean };
  try {
    status = await verifyConnectAccount(stripeAccountId);
  } catch {
    return {
      ok: false,
      message: 'No se encontró esa cuenta en Stripe. Comprueba el identificador.',
    };
  }

  if (!status.chargesEnabled || !status.payoutsEnabled) {
    return {
      ok: false,
      message:
        'La cuenta existe pero todavía no puede recibir cobros y pagos. Completa su configuración en Stripe antes de guardarla.',
    };
  }

  // Here you define your business logic (where the payment account is stored).
  await patchOrganization(organizationId, {
    partyCharacteristic: [{ name: 'stripeConnectAccountId', value: stripeAccountId }],
  });

  return { ok: true };
}
