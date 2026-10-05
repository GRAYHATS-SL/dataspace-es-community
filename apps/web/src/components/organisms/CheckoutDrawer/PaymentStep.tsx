'use client';

import { Elements } from '@stripe/react-stripe-js';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

import { formatEuro, isStripeConfigured, stripePromise } from './constants';
import PaymentElementForm from './PaymentElementForm';

/** Props of `PaymentStep`. */
export interface PaymentStepProps {
  priceValue: string | null;
  feeAmountEur: number;
  totalAmountEur: number;
  blocked: boolean;
  clientSecret: string | null;
  orderId: string | null;
  onBack: () => void;
  onCompleted: () => void;
  onError: (message: string | null) => void;
}

/** PaymentStep - Step 3 of the checkout: price breakdown and Stripe Elements form. */
function PaymentStep({
  priceValue,
  feeAmountEur,
  totalAmountEur,
  blocked,
  clientSecret,
  orderId,
  onBack,
  onCompleted,
  onError,
}: Readonly<PaymentStepProps>) {
  const paymentsDisabled = !isStripeConfigured || !stripePromise;
  const isBlocked = blocked || paymentsDisabled;
  const blockedMessage = paymentsDisabled
    ? 'Los pagos no están configurados en esta instalación. No es posible procesar el pago.'
    : 'El proveedor de esta oferta todavía no puede recibir pagos. Inténtalo de nuevo más tarde.';

  return (
    <div className="flex flex-col gap-5">
      {feeAmountEur > 0 ? (
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <Typography variant="small" color="gray">
              Precio de la oferta
            </Typography>
            <Typography variant="small">{priceValue ?? '—'}</Typography>
          </div>
          <div className="flex items-center justify-between">
            <Typography variant="small" color="gray">
              Comisiones
            </Typography>
            <Typography variant="small">{formatEuro(feeAmountEur)}</Typography>
          </div>
          <div className="flex items-center justify-between">
            <Typography variant="small" color="gray">
              Total a pagar
            </Typography>
            <Typography variant="small" className="font-semibold">
              {formatEuro(totalAmountEur)}
            </Typography>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <Typography variant="small" color="gray">
            Total a pagar
          </Typography>
          <Typography variant="small" className="font-semibold">
            {priceValue ?? '—'}
          </Typography>
        </div>
      )}

      {isBlocked && (
        <>
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" role="alert">
            <Icon name="AlertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <Typography variant="small" className="text-amber-700">
              {blockedMessage}
            </Typography>
          </div>
          <Button type="button" variant="outline" onClick={onBack}>
            <Icon name="ChevronLeft" size={14} className="mr-1" />
            Volver
          </Button>
        </>
      )}

      {!isBlocked && clientSecret && orderId && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentElementForm
            orderId={orderId}
            onBack={onBack}
            onCompleted={onCompleted}
            onError={onError}
          />
        </Elements>
      )}

      {!isBlocked && !clientSecret && (
        <Typography variant="small" color="gray" role="status">
          Preparando el pago...
        </Typography>
      )}
    </div>
  );
}

export default PaymentStep;
