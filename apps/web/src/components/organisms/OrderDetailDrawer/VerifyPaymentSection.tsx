import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import { useReconcileProductOrderPayment } from '@/hooks/queries';
import type { ProductOrder } from '@/types/api';

import { STATE_LABEL } from './constants';

export interface VerifyPaymentSectionProps {
  order: ProductOrder;
}

/**
 * VerifyPaymentSection - Button to manually reconcile an order's payment
 *
 * @param {ProductOrder} order - Order to verify.
 */
function VerifyPaymentSection({ order }: Readonly<VerifyPaymentSectionProps>) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate: reconcilePayment, isPending } = useReconcileProductOrderPayment();

  const handleVerify = () => {
    setMessage(null);
    setError(null);
    reconcilePayment(order, {
      onSuccess: (updated) => {
        setMessage(
          updated
            ? `Estado actualizado: ${STATE_LABEL[updated.state ?? 'acknowledged']?.label ?? updated.state}.`
            : 'El pago todavía no se ha completado. Vuelve a intentarlo más tarde.',
        );
      },
      onError: (err) =>
        setError(err instanceof Error ? err.message : 'Error al verificar el estado del pago'),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
      <Button variant="outline" className="w-full" disabled={isPending} onClick={handleVerify}>
        {isPending ? 'Verificando...' : 'Verificar estado del pago'}
      </Button>
      {message && (
        <Typography variant="small" color="gray">
          {message}
        </Typography>
      )}
      {error && (
        <Typography variant="small" className="text-red-700">
          {error}
        </Typography>
      )}
    </div>
  );
}

export default VerifyPaymentSection;
