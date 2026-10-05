import { loadStripe } from '@stripe/stripe-js';

import type { SmartFormField } from '@/components/organisms/SmartForm';
import type { CompleteOrderPaymentStep } from '@/lib/services/queries/productOrderPayment';
import type { OrderDetailsFormData } from '@/lib/validations/productOrder.schema';
import type { NewProductOrder, ProductOffering, ProductOfferingPrice, RelatedParty } from '@/types/api';

/** Checkout wizard step. */
export type Step = 'summary' | 'details' | 'payment' | 'confirm' | 'success';

/** Steps shown in the step indicator. */
export const STEPS: Exclude<Step, 'success'>[] = ['summary', 'details', 'payment', 'confirm'];

/** Labels of the step indicator. */
export const STEP_LABELS: Record<Exclude<Step, 'success'>, string> = {
  summary: 'Resumen',
  details: 'Detalles',
  payment: 'Pago',
  confirm: 'Confirmación',
};

/** Order priority options. */
export const PRIORITY_OPTIONS = [
  { value: '', label: 'Sin prioridad' },
  { value: '0', label: '0 — Crítica' },
  { value: '1', label: '1 — Alta' },
  { value: '2', label: '2 — Media' },
  { value: '3', label: '3 — Normal' },
  { value: '4', label: '4 — Baja' },
];

/** Readable label per priority value. */
export const PRIORITY_LABEL: Record<string, string> = {
  '0': 'Crítica',
  '1': 'Alta',
  '2': 'Media',
  '3': 'Normal',
  '4': 'Baja',
};

/** Fields of the order details form. */
export const DETAILS_FIELDS: SmartFormField<OrderDetailsFormData>[] = [
  {
    name: 'quantity',
    type: 'number',
    label: 'Cantidad',
    required: true,
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'priority',
    type: 'select',
    label: 'Prioridad',
    options: PRIORITY_OPTIONS,
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'requestedStartDate',
    type: 'text',
    label: 'Fecha de inicio solicitada',
    props: { type: 'date' },
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'requestedCompletionDate',
    type: 'text',
    label: 'Fecha límite solicitada',
    props: { type: 'date' },
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Notas adicionales',
    placeholder: 'Información adicional para el proveedor...',
  },
];

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/** Whether Stripe.js can be initialized in the browser. */
export const isStripeConfigured = Boolean(PUBLISHABLE_KEY);

/** Stripe.js instance, or `null` when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing. */
export const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

/** User-facing message per failed finalization step. */
export const FINALIZE_STEP_MESSAGES: Partial<Record<CompleteOrderPaymentStep, string>> = {
  unauthorized: 'No se pudo verificar la orden. Ciérrala y vuelve a intentarlo.',
  payment:
    'No se pudo confirmar el pago. Si el cargo se realizó, verifica el estado desde "Mis órdenes".',
  transition:
    'El pago se completó pero no se pudo actualizar la orden. Verifica su estado desde "Mis órdenes".',
  provisioning:
    'La orden se completó pero no se pudo activar el acceso. Verifica el estado desde "Mis órdenes".',
};

/** Sums the amounts of an offering's prices (display and free/paid branching only). */
export function getTotalAmount(offeringPrices: ProductOfferingPrice[]): number {
  return offeringPrices.reduce((sum, p) => sum + (p.price?.value ?? 0), 0);
}

/** Formats an amount in euros. */
export function formatEuro(amountEur: number): string {
  return amountEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/** Drawer title per step. */
export function getDrawerTitle(step: Step): string {
  if (step === 'details') return 'Configurar pedido';
  if (step === 'payment') return 'Datos de pago';
  if (step === 'confirm') return 'Confirmar pedido';
  return 'Solicitar acceso';
}

/** Formats a `YYYY-MM-DD` date in long Spanish format. */
export function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Seller information needed to place an order. */
export interface SellerInfo {
  party: RelatedParty | null;
  canReceivePayments: boolean;
}

/** Resolves the seller of an offering and whether it can receive payments. */
export async function resolveSeller(offering: ProductOffering): Promise<SellerInfo> {
  const info: SellerInfo = { party: null, canReceivePayments: true };
  // Here you define your business logic (seller party of `offering` and whether its payment
  // account can receive charges).
  return offering.id ? info : { ...info, canReceivePayments: false };
}

/** Builds the product order payload of a checkout. */
export function buildOrderPayload(
  offering: ProductOffering,
  values: OrderDetailsFormData,
  seller: RelatedParty | null,
  externalId?: string,
): NewProductOrder {
  return {
    description: values.description || undefined,
    requestedStartDate: values.requestedStartDate || undefined,
    requestedCompletionDate: values.requestedCompletionDate || undefined,
    priority: values.priority || undefined,
    externalId,
    relatedParty: seller ? [seller] : [],
    productOrderItem: [
      {
        id: '1',
        action: 'add',
        quantity: values.quantity,
        productOffering: { id: offering.id ?? '', name: offering.name },
      },
    ],
  };
}
