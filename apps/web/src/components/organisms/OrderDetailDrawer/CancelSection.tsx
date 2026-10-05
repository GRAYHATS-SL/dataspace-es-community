'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import { useCancelProductOrder } from '@/hooks/queries';

/** Props of `CancelSection`. */
export interface CancelSectionProps {
  orderId: string;
  onSuccess: () => void;
}

/** CancelSection - Request and confirm the cancellation of an order. */
function CancelSection({ orderId, onSuccess }: Readonly<CancelSectionProps>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutate: cancelOrder, isPending } = useCancelProductOrder();

  const handleConfirm = () => {
    setError(null);
    cancelOrder(
      { id: orderId, reason: reason || undefined },
      { onSuccess, onError: (err) => setError(err.message || 'Error al cancelar la orden') },
    );
  };

  if (!open) {
    return (
      <div className="border-t border-gray-100 pt-4">
        <Button variant="ghost" className="w-full" onClick={() => setOpen(true)}>
          Solicitar cancelación
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
      <Typography variant="small" className="font-medium text-red-700">
        ¿Confirmar cancelación?
      </Typography>
      <label htmlFor="cancel-reason" className="sr-only">
        Motivo de cancelación (opcional)
      </label>
      <textarea
        id="cancel-reason"
        className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-200 focus:outline-none"
        rows={2}
        placeholder="Motivo de cancelación (opcional)..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-describedby={error ? 'cancel-error' : undefined}
      />
      {error && (
        <Typography id="cancel-error" variant="small" className="text-red-700" role="alert">
          {error}
        </Typography>
      )}
      <div className="flex gap-2">
        <Button variant="primary" disabled={isPending} className="flex-1" onClick={handleConfirm}>
          {isPending ? 'Cancelando...' : 'Confirmar cancelación'}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>
          Volver
        </Button>
      </div>
    </div>
  );
}

export default CancelSection;
