import type { QuotaStatus, QuotaView } from '@/lib/utils/quota';

const STATUS_NOTE: Readonly<Record<QuotaStatus, string | null>> = {
  active: null,
  unlimited: 'Esta oferta no tiene límites que medir.',
  exhausted:
    'Cuota agotada. Un pedido cancelado produce el mismo bloqueo (403): comprueba el estado del pedido en «Órdenes de producto».',
  'not-activated':
    'El provider aún no aplica la compra. Tras el pago puede tardar unos 20 segundos; si persiste, contacta con el provider.',
};

const CANCELLED_NOTE =
  'Pedido cancelado: no tienes acceso aunque quede cuota (lo comprado sigue contando).';
const CANCELLED_EXHAUSTED_NOTE = 'Cuota agotada y pedido cancelado: ambos causan el bloqueo (403).';
const CANCELLED_NEVER_ACTIVE_NOTE = 'Pedido cancelado sin compra aplicada en el provider.';

/** Explanatory note for a quota state; `null` if none. */
export const getQuotaNote = (view: QuotaView, cancelledOnly: boolean): string | null => {
  if (!cancelledOnly) return STATUS_NOTE[view.status];
  if (view.status === 'not-activated') return CANCELLED_NEVER_ACTIVE_NOTE;
  return view.status === 'exhausted' ? CANCELLED_EXHAUSTED_NOTE : CANCELLED_NOTE;
};
