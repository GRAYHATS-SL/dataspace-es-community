import { loadStripe } from '@stripe/stripe-js';

import type { SmartFormField } from '@/components/organisms/SmartForm';
import type { CompleteOrderPaymentStep } from '@/lib/services/queries/productOrderFinalize';
import type { OrderDetailsFormData } from '@/lib/validations/productOrder.schema';
import type { ProductOfferingPrice } from '@/types/api';

export type Step = 'summary' | 'details' | 'payment' | 'confirm' | 'success';

export const STEPS: Exclude<Step, 'success'>[] = ['summary', 'details', 'payment', 'confirm'];

export const STEP_LABELS: Record<Exclude<Step, 'success'>, string> = {
  summary: 'Resumen',
  details: 'Detalles',
  payment: 'Pago',
  confirm: 'Confirmación',
};

export const PRIORITY_OPTIONS = [
  { value: '', label: 'Sin prioridad' },
  { value: '0', label: '0 — Crítica' },
  { value: '1', label: '1 — Alta' },
  { value: '2', label: '2 — Media' },
  { value: '3', label: '3 — Normal' },
  { value: '4', label: '4 — Baja' },
];

export const PRIORITY_LABEL: Record<string, string> = {
  '0': 'Crítica',
  '1': 'Alta',
  '2': 'Media',
  '3': 'Normal',
  '4': 'Baja',
};

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

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

export const FINALIZE_STEP_MESSAGES: Partial<Record<CompleteOrderPaymentStep, string>> = {
  unauthorized: 'No se pudo verificar la orden. Ciérrala y vuelve a intentarlo.',
  payment:
    'No se pudo confirmar el pago con el proveedor. Si el cargo se realizó, verifica el estado desde "Mis órdenes".',
  transition:
    'El pago se completó pero no se pudo actualizar la orden. Verifica su estado desde "Mis órdenes".',
  agreement:
    'El pago se completó pero no se pudo crear el acuerdo. Verifica el estado desde "Mis órdenes".',
  link: 'El acuerdo se creó pero no se pudo vincular a la orden. Verifica el estado desde "Mis órdenes".',
  product:
    'El acuerdo se creó pero no se pudo activar el producto. Verifica el estado desde "Mis órdenes".',
};

export function getTotalAmount(offeringPrices: ProductOfferingPrice[]): number {
  return offeringPrices.reduce((sum, p) => sum + (p.price?.value ?? 0), 0);
}

export function formatEuro(amountEur: number): string {
  return amountEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function getDrawerTitle(step: Step): string {
  if (step === 'details') return 'Configurar pedido';
  if (step === 'payment') return 'Datos de pago';
  if (step === 'confirm') return 'Confirmar pedido';
  return 'Solicitar acceso';
}

export function formatDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
