'use server';

import Stripe from 'stripe';

import { getMarketplaceFeePercent } from '@/lib/constants/payments';
import { getCurrentUserOrganizationId, requireRole } from '@/lib/services/queries/_utils';
import { fetchOrganizationById, upsertOrganizationCharacteristics } from '@/lib/services/queries/party';
import { fetchProductOfferingById } from '@/lib/services/queries/productOffering';
import { getProductSpecificationById } from '@/lib/services/queries/productSpecification';
import {
  CLOSED_PROVIDER_MESSAGE,
  getSpecProviderId,
  isOrganizationActive,
} from '@/lib/utils/organizationStatus';
import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está configurada');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function resolveOfferingDestinationAccount(offeringId: string): Promise<string> {
  const offering = await fetchProductOfferingById(offeringId);
  const specId = offering.productSpecification?.id;
  if (!specId) throw new Error('La oferta no tiene especificación; no se puede cobrar.');
  const spec = await getProductSpecificationById(specId);
  const sellerOrgId = getSpecProviderId(spec);
  if (!sellerOrgId) throw new Error('No se pudo determinar el proveedor de la oferta.');
  const sellerOrg = await fetchOrganizationById(sellerOrgId);
  if (!isOrganizationActive(sellerOrg)) throw new Error(CLOSED_PROVIDER_MESSAGE);
  const account = getLatestCharacteristicValue(sellerOrg.partyCharacteristic, 'stripeConnectAccountId');
  const payoutsEnabled = getLatestCharacteristicValue(
    sellerOrg.partyCharacteristic,
    'stripePayoutsEnabled',
  );
  if (typeof account !== 'string' || !account || payoutsEnabled !== true) {
    throw new Error('El proveedor todavía no puede recibir cobros.');
  }
  return account;
}

function computeBreakdown(amountEur: number) {
  const feePercent = getMarketplaceFeePercent();
  const baseAmountCents = Math.round(amountEur * 100);
  const feeAmountCents = Math.round((baseAmountCents * feePercent) / 100);
  const totalAmountCents = baseAmountCents + feeAmountCents;

  return {
    feePercent,
    feeAmountCents,
    totalAmountCents,
    feeAmountEur: feeAmountCents / 100,
    totalAmountEur: totalAmountCents / 100,
  };
}

/**
 * @summary Computes the price and marketplace fee breakdown without creating a charge.
 *
 * @param {number}  amountEur - Offer price in euros.
 * @returns {Promise<{ feePercent: number; feeAmountEur: number; totalAmountEur: number }>}
 */
export async function getPriceBreakdown(amountEur: number): Promise<{
  feePercent: number;
  feeAmountEur: number;
  totalAmountEur: number;
}> {
  const { feePercent, feeAmountEur, totalAmountEur } = computeBreakdown(amountEur);
  return { feePercent, feeAmountEur, totalAmountEur };
}

/**
 * @summary Creates a `PaymentIntent` with automatic capture and transfer to the provider.
 *
 * @param {number}                  amountEur - Offer price in euros (what the provider receives).
 * @param {string}                  destinationAccountId - Provider's Stripe Connect account.
 * @param {Record<string, string>}  metadata - Metadata for traceability.
 * @returns {Promise<{ id: string; clientSecret: string; feePercent: number; feeAmountEur: number; totalAmountEur: number }>} `PaymentIntent` id and `client_secret` plus fee breakdown and total.
 *
 * @throws {Error} If the Stripe call fails or no `client_secret` is returned.
 */
export async function createPaymentIntent(
  amountEur: number,
  offeringId: string,
  metadata: Record<string, string>,
): Promise<{
  id: string;
  clientSecret: string;
  feePercent: number;
  feeAmountEur: number;
  totalAmountEur: number;
}> {
  await requireRole('BUYER');
  if (!Number.isFinite(amountEur) || amountEur <= 0) {
    throw new Error('Importe no válido');
  }
  // The destination account is resolved on the server (offer -> spec -> provider organization): the client cannot direct the charge to an arbitrary account.
  const destinationAccountId = await resolveOfferingDestinationAccount(offeringId);
  const { feePercent, feeAmountCents, totalAmountCents, feeAmountEur, totalAmountEur } =
    computeBreakdown(amountEur);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmountCents,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    transfer_data: { destination: destinationAccountId },
    application_fee_amount: feeAmountCents, // Marketplace fee in cents.
    metadata: { ...metadata, offeringId },
  });

  if (!paymentIntent.client_secret) {
    throw new Error('Stripe no devolvió un client_secret para el PaymentIntent creado.');
  }

  return {
    id: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    feePercent,
    feeAmountEur,
    totalAmountEur,
  };
}

/**
 * @summary Retrieves the current state of a `PaymentIntent` from Stripe.
 *
 * @param {string}  paymentIntentId - `PaymentIntent` id.
 * @returns {Promise<Stripe.PaymentIntent>} The `PaymentIntent`.
 *
 * @throws {Error} If the Stripe call fails.
 */
export async function retrievePaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * @summary Cancels a `PaymentIntent` that has not been confirmed yet.
 *
 * @param {string}  paymentIntentId - `PaymentIntent` id.
 * @returns {Promise<Stripe.PaymentIntent>} The canceled `PaymentIntent`.
 *
 * @throws {Error} If the Stripe call fails.
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  await requireRole('BUYER');
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * @summary Checks that a Stripe Connect account exists and can receive charges and payouts.
 *
 * @param {string}  accountId - Stripe Connect account id (`acct_...`).
 * @returns {Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean }>} Account status.
 *
 * @throws {Error} If the account does not exist or the Stripe call fails.
 */
async function verifyConnectAccount(
  accountId: string,
): Promise<{ chargesEnabled: boolean; payoutsEnabled: boolean }> {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
  };
}

export type SaveStripeAccountResult = { ok: true } | { ok: false; message: string };

/**
 * @summary Validates and saves the provider's `stripeConnectAccountId`.
 *
 * @param {string}  stripeAccountId - Stripe Connect account id (`acct_...`).
 * @returns {Promise<object>} `{ ok: true }` if saved, or `{ ok: false, message }` with the reason.
 */
export async function saveStripeConnectAccountId(
  stripeAccountId: string,
): Promise<SaveStripeAccountResult> {
  await requireRole('SELLER');
  // The organization always comes from the server session, never from the client.
  const organizationId = await getCurrentUserOrganizationId();
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

  // v2: the PATCH replaces the list -- merged with the existing characteristics (did, etc.).
  await upsertOrganizationCharacteristics(organizationId, [
    { name: 'stripeConnectAccountId', value: stripeAccountId },
    { name: 'stripePayoutsEnabled', value: true },
  ]);

  return { ok: true };
}
