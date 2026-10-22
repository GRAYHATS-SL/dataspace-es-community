import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { type FormEvent, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { useCompleteProductOrderPayment } from '@/hooks/queries';

import { FINALIZE_STEP_MESSAGES } from './constants';

export interface PaymentElementFormProps {
  orderId: string;
  onBack: () => void;
  onCompleted: () => void;
  onError: (message: string | null) => void;
}

/**
 * PaymentElementForm - Stripe Elements payment form
 *
 * @param {string} orderId - Order id.
 * @param {() => void} onBack - Go back.
 * @param {() => void} onCompleted - Called on success.
 * @param {(message: string|null) => void} onError - Called with the error, or `null` to clear it.
 */
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
      confirmParams: {
        return_url: returnUrl.toString(),
      },
    });

    if (confirmError) {
      setSubmitting(false);
      onError(confirmError.message ?? 'No se pudo procesar el pago.');
      return;
    }

    // If the method requires a full redirect, the browser has already left this page — `stripe.confirmPayment` does not resolve until it returns via `return_url`.
    if (paymentIntent?.status !== 'succeeded') {
      setSubmitting(false);
      onError('El pago no pudo completarse. Inténtalo de nuevo.');
      return;
    }

    try {
      // The status returned by the client is never proof of payment — it is re-verified server-side against Stripe before completing the order.
      const result = await completePayment(orderId);
      if (!result.ok) {
        onError(FINALIZE_STEP_MESSAGES[result.step] ?? result.message);
        return;
      }
      onCompleted();
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
