import type { ProductOrderState } from '@/types/api';

/** States in which an order can still be cancelled. */
export const CANCELLABLE_STATES = new Set<ProductOrderState>([
  'acknowledged',
  'pending',
  'inProgress',
  'held',
]);

/** States in which an order payment is re-checked. */
// Here you define your business logic (which order states are worth re-checking).
export const RECONCILABLE_STATES = new Set<ProductOrderState>();

/** Label and badge classes per order state. */
export const STATE_LABEL: Partial<Record<ProductOrderState, { label: string; className: string }>> =
  {
    acknowledged: { label: 'Recibida', className: 'bg-gray-100 text-gray-700' },
    assessingCancellation: { label: 'Evaluando cancelación', className: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Cancelada', className: 'bg-orange-100 text-orange-700' },
    completed: { label: 'Completada', className: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'Fallida', className: 'bg-red-100 text-red-700' },
    held: { label: 'En espera', className: 'bg-amber-100 text-amber-700' },
    inProgress: { label: 'En progreso', className: 'bg-neutral-200 text-neutral-700' },
    partial: { label: 'Parcial', className: 'bg-orange-100 text-orange-700' },
    pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    pendingCancellation: { label: 'Cancelación pendiente', className: 'bg-yellow-100 text-yellow-700' },
    rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-700' },
  };

/** Readable label per order item action. */
export const ACTION_LABEL: Record<string, string> = {
  add: 'Alta',
  delete: 'Baja',
  modify: 'Modificación',
  noChange: 'Sin cambio',
};

/** Readable label per priority value. */
export const PRIORITY_LABEL: Record<string, string> = {
  '0': 'Crítica',
  '1': 'Alta',
  '2': 'Media',
  '3': 'Normal',
  '4': 'Baja',
};

/** Returns the badge config of a state (fallback for unknown states). */
export function getStateConfig(state?: ProductOrderState): { label: string; className: string } | null {
  if (!state) return null;
  return STATE_LABEL[state] ?? { label: state, className: 'bg-gray-100 text-gray-700' };
}

/** Formats an ISO date in long Spanish format (`null` when missing or invalid). */
export function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
