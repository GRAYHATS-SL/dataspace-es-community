import type { ProductOrder, RelatedParty } from '@/types/api';

/** Agreement wizard step. */
export type Step = 'parties' | 'terms' | 'confirm';

/** Ordered wizard steps. */
export const STEPS: Step[] = ['parties', 'terms', 'confirm'];

/** Labels of the step indicator. */
export const STEP_LABELS: Record<Step, string> = {
  parties: 'Partes',
  terms: 'Términos',
  confirm: 'Confirmación',
};

/** Returns the party of an order with the given role (case-insensitive). */
export function findParty(order: ProductOrder, role: 'buyer' | 'seller'): RelatedParty | undefined {
  return order.relatedParty?.find((p) => p.role?.toLowerCase() === role);
}

/** Returns the display name of the order's offering. */
export function getOfferingName(order: ProductOrder): string {
  const ref = order.productOrderItem?.[0]?.productOffering;
  return ref?.name ?? ref?.id ?? '—';
}
