import { Elements } from '@stripe/react-stripe-js';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

import { formatEuro, stripePromise } from './constants';
import PaymentElementForm from './PaymentElementForm';

export interface PaymentStepProps {
  priceValue: string | null;
  feePercent: number;
  feeAmountEur: number;
  totalAmountEur: number;
  blocked: boolean;
  clientSecret: string | null;
  orderId: string | null;
  onBack: () => void;
  onCompleted: () => void;
  onError: (message: string | null) => void;
}

/**
 * PaymentStep - Step 3 of `CheckoutDrawer`: Stripe Elements payment
 *
 * @param {string|null} priceValue - Formatted offering price.
 * @param {number} feePercent - Marketplace fee percentage.
 * @param {number} feeAmountEur - Fee amount in euros.
 * @param {number} totalAmountEur - Total amount in euros.
 * @param {boolean} blocked - Provider cannot receive payments yet.
 * @param {string|null} clientSecret - Stripe `PaymentIntent` client secret.
 * @param {string|null} orderId - Order id.
 * @param {() => void} onBack - Go back.
 * @param {() => void} onCompleted - Called on payment success.
 * @param {(message: string|null) => void} onError - Called with the payment error.
 */
function PaymentStep({
  priceValue,
  feePercent,
  feeAmountEur,
  totalAmountEur,
  blocked,
  clientSecret,
  orderId,
  onBack,
  onCompleted,
  onError,
}: Readonly<PaymentStepProps>) {
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
              Comisión marketplace ({feePercent}%)
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

      {blocked && (
        <>
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon name="AlertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <Typography variant="small" className="text-amber-700">
              El proveedor de esta oferta todavía no ha completado la configuración de cobros y no
              es posible procesar el pago en este momento. Inténtalo de nuevo más tarde.
            </Typography>
          </div>
          <Button type="button" variant="outline" onClick={onBack}>
            <Icon name="ChevronLeft" size={14} className="mr-1" />
            Volver
          </Button>
        </>
      )}

      {!blocked && clientSecret && orderId && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentElementForm
            orderId={orderId}
            onBack={onBack}
            onCompleted={onCompleted}
            onError={onError}
          />
        </Elements>
      )}

      {!blocked && !clientSecret && (
        <Typography variant="small" color="gray">
          Preparando el pago...
        </Typography>
      )}
    </div>
  );
}

export default PaymentStep;
