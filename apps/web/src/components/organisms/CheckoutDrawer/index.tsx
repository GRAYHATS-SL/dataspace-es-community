'use client';

import { useState } from 'react';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import Drawer from '@/components/molecules/Drawer';
import {
  useCompleteProductOrderPayment,
  useCreateProductOrder,
  useProductOfferingPrices,
} from '@/hooks/queries';
import {
  cancelPaymentIntent,
  createPaymentIntent,
  getPriceBreakdown,
} from '@/lib/services/payments/stripe';
import { buildPriceValue, getOfferingPrices } from '@/lib/utils/offeringMetadata';
import type { OrderDetailsFormData } from '@/lib/validations/productOrder.schema';
import type { ProductOffering, RelatedParty } from '@/types/api';

import ConfirmStep from './ConfirmStep';
import {
  buildOrderPayload,
  FINALIZE_STEP_MESSAGES,
  getDrawerTitle,
  getTotalAmount,
  resolveSeller,
  type Step,
} from './constants';
import DetailsStep from './DetailsStep';
import PaymentStep from './PaymentStep';
import StepIndicator from './StepIndicator';
import SuccessStep from './SuccessStep';
import SummaryStep from './SummaryStep';

/** Props of `CheckoutDrawer`. */
export interface CheckoutDrawerProps {
  offering: ProductOffering | null;
  onClose: () => void;
}

interface PaymentState {
  seller: RelatedParty | null;
  blocked: boolean;
  clientSecret: string | null;
  paymentIntentId: string | null;
  orderId: string | null;
  feeAmountEur: number;
  totalAmountEur: number;
}

const INITIAL_PAYMENT: PaymentState = {
  seller: null,
  blocked: false,
  clientSecret: null,
  paymentIntentId: null,
  orderId: null,
  feeAmountEur: 0,
  totalAmountEur: 0,
};

/** Returns an error message from an unknown error. */
const toMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/** CheckoutDrawer - Multi-step checkout (summary, details, Stripe payment, confirmation) for an offering. */
export default function CheckoutDrawer({ offering, onClose }: Readonly<CheckoutDrawerProps>) {
  const [step, setStep] = useState<Step>('summary');
  const [formValues, setFormValues] = useState<OrderDetailsFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [payment, setPayment] = useState<PaymentState>(INITIAL_PAYMENT);

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateProductOrder();
  const { mutateAsync: completePayment, isPending: isCompleting } =
    useCompleteProductOrderPayment();
  const { data: allPrices = [] } = useProductOfferingPrices({ enabled: offering !== null });

  const offeringPrices = getOfferingPrices(offering, allPrices);
  const priceValue = buildPriceValue(offeringPrices);
  const totalAmount = getTotalAmount(offeringPrices);

  // An unconfirmed PaymentIntent is released so no orphan charge is left behind.
  const releaseUnconfirmedIntent = () => {
    if (payment.paymentIntentId) cancelPaymentIntent(payment.paymentIntentId).catch(() => {});
  };

  const handleClose = () => {
    releaseUnconfirmedIntent();
    setStep('summary');
    setFormValues(null);
    setError(null);
    setPayment(INITIAL_PAYMENT);
    onClose();
  };

  const handleBackToDetails = () => {
    releaseUnconfirmedIntent();
    setPayment(INITIAL_PAYMENT);
    setError(null);
    setStep('details');
  };

  /** Prepares a paid order: PaymentIntent first, then the order linked to it. */
  const preparePaidOrder = async (
    target: ProductOffering,
    data: OrderDetailsFormData,
    seller: RelatedParty | null,
  ) => {
    const intent = await createPaymentIntent(totalAmount, { offeringId: target.id ?? '' });
    if (!intent.ok) {
      setError(intent.message);
      return;
    }
    try {
      // The order is created before paying: a full redirect may never come back to this component.
      const order = await createOrder(buildOrderPayload(target, data, seller, intent.id));
      setPayment({
        seller,
        blocked: false,
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.id,
        orderId: order.id ?? null,
        feeAmountEur: intent.feeAmountEur,
        totalAmountEur: intent.totalAmountEur,
      });
      setStep('payment');
    } catch (err) {
      cancelPaymentIntent(intent.id).catch(() => {});
      throw err;
    }
  };

  const handleDetailsNext = async (data: OrderDetailsFormData) => {
    if (!offering) return;
    setFormValues(data);
    setError(null);
    setPreparing(true);
    try {
      const seller = await resolveSeller(offering);
      if (totalAmount <= 0) {
        setPayment({ ...INITIAL_PAYMENT, seller: seller.party });
        setStep('confirm');
        return;
      }
      if (!seller.canReceivePayments) {
        const preview = await getPriceBreakdown(totalAmount);
        setPayment({ ...INITIAL_PAYMENT, ...preview, seller: seller.party, blocked: true });
        setStep('payment');
        return;
      }
      await preparePaidOrder(offering, data, seller.party);
    } catch (err) {
      setError(toMessage(err, 'Error al preparar el pago'));
    } finally {
      setPreparing(false);
    }
  };

  const handlePaymentCompleted = () => {
    setPayment((prev) => ({ ...prev, paymentIntentId: null }));
    setError(null);
    setStep('success');
  };

  const handleConfirm = async () => {
    if (!offering || !formValues) return;
    setError(null);
    try {
      const order = await createOrder(buildOrderPayload(offering, formValues, payment.seller));
      if (!order.id) {
        setError('La orden se creó pero no devolvió un identificador válido.');
        return;
      }
      const result = await completePayment(order.id);
      if (result.ok) setStep('success');
      else setError(FINALIZE_STEP_MESSAGES[result.step] ?? result.message);
    } catch (err) {
      setError(toMessage(err, 'Error al crear la orden'));
    }
  };

  return (
    <Drawer
      open={offering !== null}
      onClose={handleClose}
      title={getDrawerTitle(step)}
      description={step === 'summary' ? (offering?.name ?? undefined) : undefined}
    >
      {step !== 'success' && <StepIndicator current={step} />}

      {error && step !== 'summary' && (
        <div
          role="alert"
          className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-500" />
          <Typography variant="small" className="text-red-700">
            {error}
          </Typography>
        </div>
      )}

      {offering && step === 'summary' && (
        <SummaryStep offering={offering} onNext={() => setStep('details')} onCancel={handleClose} />
      )}
      {offering && step === 'details' && (
        <DetailsStep
          defaultValues={formValues}
          onBack={() => setStep('summary')}
          onNext={handleDetailsNext}
        />
      )}
      {offering && step === 'payment' && (
        <PaymentStep
          priceValue={priceValue}
          feeAmountEur={payment.feeAmountEur}
          totalAmountEur={payment.totalAmountEur}
          blocked={payment.blocked}
          clientSecret={payment.clientSecret}
          orderId={payment.orderId}
          onBack={handleBackToDetails}
          onCompleted={handlePaymentCompleted}
          onError={setError}
        />
      )}
      {step === 'success' && <SuccessStep onClose={handleClose} />}
      {offering && step === 'confirm' && formValues && (
        <ConfirmStep
          offering={offering}
          values={formValues}
          onBack={handleBackToDetails}
          onConfirm={handleConfirm}
          isLoading={isCreatingOrder || isCompleting || preparing}
        />
      )}
    </Drawer>
  );
}
