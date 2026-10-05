'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { useCompleteProductOrderPayment } from '@/hooks/queries';

/** Return route after a full Stripe redirect: re-verifies the order's payment server-side. */
export default function PagoRetornoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { mutate: completePayment } = useCompleteProductOrderPayment();
  const [status, setStatus] = useState<'checking' | 'error'>('checking');
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!orderId || started.current) return;
    started.current = true;

    // Only `orderId` is trusted: the payment state is always re-read on the server.
    completePayment(orderId, {
      onSuccess: (result) => {
        if (result.ok) {
          router.replace('/dashboard/ordenes-producto');
          return;
        }
        setStatus('error');
        setMessage(result.message);
      },
      onError: (err) => {
        setStatus('error');
        setMessage(err.message || 'Error al verificar el pago.');
      },
    });
  }, [orderId, completePayment, router]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      {!orderId && (
        <Typography variant="body" color="gray">
          Falta el identificador de la orden en la URL de retorno.
        </Typography>
      )}

      {orderId && status === 'checking' && (
        <>
          <Icon name="Loader2" size={28} className="animate-spin text-primary" aria-hidden="true" />
          <Typography variant="body" color="gray">
            Verificando el estado de tu pago...
          </Typography>
        </>
      )}

      {orderId && status === 'error' && (
        <>
          <Icon name="AlertCircle" size={28} className="text-red-500" aria-hidden="true" />
          <Typography variant="body" className="text-red-700">
            {message ?? 'No se pudo verificar el pago.'}
          </Typography>
          <Typography variant="small" color="gray">
            Puedes revisar el estado de tu orden desde &quot;Mis órdenes&quot; o volver a intentarlo
            con &quot;Verificar estado del pago&quot;.
          </Typography>
        </>
      )}
    </Container>
  );
}
