'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import { useReconcileProductOrderPayment } from '@/hooks/queries';
import type { ProductOrder } from '@/types/api';

import { getStateConfig } from './constants';

/** Props of `VerifyPaymentSection`. */
export interface VerifyPaymentSectionProps {
  order: ProductOrder;
}

/** VerifyPaymentSection - Manually re-checks the payment of a possibly orphaned order. */
function VerifyPaymentSection({ order }: Readonly<VerifyPaymentSectionProps>) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate: reconcilePayment, isPending } = useReconcileProductOrderPayment();

  const handleVerify = () => {
    setMessage(null);
    setError(null);
    reconcilePayment(order, {
      onSuccess: (updated) =>
        setMessage(
          updated
            ? `Estado actualizado: ${getStateConfig(updated.state)?.label ?? '—'}.`
            : 'El pago todavía no se ha completado. Vuelve a intentarlo más tarde.',
        ),
      onError: (err) => setError(err.message || 'Error al verificar el estado del pago'),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
      <Button variant="outline" className="w-full" disabled={isPending} onClick={handleVerify}>
        {isPending ? 'Verificando...' : 'Verificar estado del pago'}
      </Button>
      {message && (
        <Typography variant="small" color="gray" role="status">
          {message}
        </Typography>
      )}
      {error && (
        <Typography variant="small" className="text-red-700" role="alert">
          {error}
        </Typography>
      )}
    </div>
  );
}

export default VerifyPaymentSection;
