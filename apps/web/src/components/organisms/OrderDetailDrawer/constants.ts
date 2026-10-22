import type { ProductOrderState } from '@/types/api';

export const CANCELLABLE_STATES = new Set<ProductOrderState>([
  'acknowledged',
  'pending',
  'inProgress',
  'held',
]);

// Intermediate states in which an order with an associated payment may have been left orphaned (the browser never returned from checkout) and deserves re-checking against Stripe.
export const RECONCILABLE_STATES = new Set<ProductOrderState>(['acknowledged', 'pending', 'held']);

// v2: the order is created without `state`; absence is equivalent to "pending payment".
export const isCancellableState = (state?: ProductOrderState) =>
  state === undefined || CANCELLABLE_STATES.has(state);

export const isReconcilableState = (state?: ProductOrderState) =>
  state === undefined || RECONCILABLE_STATES.has(state);

export const STATE_LABEL: Partial<Record<ProductOrderState, { label: string; className: string }>> =
  {
    acknowledged: { label: 'Recibida', className: 'bg-gray-100 text-gray-700' },
    assessingCancellation: {
      label: 'Evaluando cancelación',
      className: 'bg-yellow-100 text-yellow-700',
    },
    cancelled: { label: 'Cancelada', className: 'bg-orange-100 text-orange-700' },
    completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Fallida', className: 'bg-red-100 text-red-700' },
    held: { label: 'En espera', className: 'bg-amber-100 text-amber-700' },
    inProgress: { label: 'En progreso', className: 'bg-blue-100 text-blue-700' },
    partial: { label: 'Parcial', className: 'bg-orange-100 text-orange-700' },
    pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    pendingCancellation: {
      label: 'Cancelación pendiente',
      className: 'bg-yellow-100 text-yellow-700',
    },
    rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  };

export const ACTION_LABEL: Record<string, string> = {
  add: 'Alta',
  delete: 'Baja',
  modify: 'Modificación',
  noChange: 'Sin cambio',
};

export const PRIORITY_LABEL: Record<string, string> = {
  '0': 'Crítica',
  '1': 'Alta',
  '2': 'Media',
  '3': 'Normal',
  '4': 'Baja',
};

const STATE_LABEL_BY_STATE = new Map<string, { label: string; className: string }>(
  Object.entries(STATE_LABEL).map(([state, config]) => [state, config]),
);

export function getStateConfig(state?: ProductOrderState) {
  if (!state) return { label: 'Pendiente de pago', className: 'bg-gray-100 text-gray-700' };
  return STATE_LABEL_BY_STATE.get(state) ?? { label: state, className: 'bg-gray-100 text-gray-700' };
}

export function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
