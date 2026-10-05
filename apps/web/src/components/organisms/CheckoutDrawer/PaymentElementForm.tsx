'use client';

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { type FormEvent, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useCompleteProductOrderPayment } from '@/hooks/queries';

import { FINALIZE_STEP_MESSAGES } from './constants';

/** Props of `PaymentElementForm`. */
export interface PaymentElementFormProps {
  orderId: string;
  onBack: () => void;
  onCompleted: () => void;
  onError: (message: string | null) => void;
}

/** PaymentElementForm - Stripe Payment Element; confirms the payment and completes the order server-side. */
function PaymentElementForm({
  orderId,
  onBack,
  onCompleted,
  onError,
}: Readonly<PaymentElementFormProps>) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const { mutateAsync: completePayment } = useCompleteProductOrderPayment();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    onError(null);
    setSubmitting(true);

    const returnUrl = new URL('/dashboard/ordenes-producto/pago-retorno', window.location.origin);
    returnUrl.searchParams.set('orderId', orderId);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: returnUrl.toString() },
    });

    if (confirmError || paymentIntent?.status !== 'succeeded') {
      setSubmitting(false);
      onError(confirmError?.message ?? 'El pago no pudo completarse. Inténtalo de nuevo.');
      return;
    }

    try {
      // The client-side status is never proof of payment: it is re-verified server-side.
      const result = await completePayment(orderId);
      if (result.ok) onCompleted();
      else onError(FINALIZE_STEP_MESSAGES[result.step] ?? result.message);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Error al verificar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement />
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={!stripe || submitting} className="flex-1">
          {submitting ? 'Procesando...' : 'Pagar y solicitar acceso'}
        </Button>
        <Button type="button" variant="outline" disabled={submitting} onClick={onBack}>
          <Icon name="ChevronLeft" size={14} className="mr-1" />
          Volver
        </Button>
      </div>
    </form>
  );
}

export default PaymentElementForm;
