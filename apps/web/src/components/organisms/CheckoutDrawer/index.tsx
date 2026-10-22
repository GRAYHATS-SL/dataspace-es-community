'use client';

import { useState } from 'react';

import OfertasDrawer from '@/app/(private)/dashboard/ofertas/_sections/OfertasDrawer';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { useCompleteProductOrderPayment, useCreateProductOrder } from '@/hooks/queries';
import { useProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useTokenOfferingQuote } from '@/hooks/useTokenOfferingQuote';
import {
  cancelPaymentIntent,
  createPaymentIntent,
  getPriceBreakdown,
} from '@/lib/services/payments/stripe';
import { fetchOrganizationById } from '@/lib/services/queries/party';
import { getProductSpecificationById } from '@/lib/services/queries/productSpecification';
import { buildPriceValue } from '@/lib/utils/offeringMetadata';
import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';
import type { OrderDetailsFormData } from '@/lib/validations/productOrder.schema';
import type { NewProductOrder, ProductOffering } from '@/types/api';

import ConfirmStep from './ConfirmStep';
import { FINALIZE_STEP_MESSAGES, getDrawerTitle, getTotalAmount, type Step } from './constants';
import DetailsStep from './DetailsStep';
import PaymentStep from './PaymentStep';
import StepIndicator from './StepIndicator';
import SuccessStep from './SuccessStep';
import SummaryStep from './SummaryStep';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckoutDrawerProps {
  offering: ProductOffering | null;
  onClose: () => void;
}

// ─── CheckoutDrawer ───────────────────────────────────────────────────────────

/**
 * CheckoutDrawer - Multi-step checkout drawer to acquire a `ProductOffering`
 *
 * @param {ProductOffering|null} offering - Offering to acquire (`null` = closed).
 * @param {() => void} onClose - Called on close.
 */
export default function CheckoutDrawer({ offering, onClose }: Readonly<CheckoutDrawerProps>) {
  const [step, setStep] = useState<Step>('summary');
  const [formValues, setFormValues] = useState<OrderDetailsFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);
  const [sellerOrgId, setSellerOrgId] = useState<string | null>(null);
  const [payoutsBlocked, setPayoutsBlocked] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [feePercent, setFeePercent] = useState(0);
  const [feeAmountEur, setFeeAmountEur] = useState(0);
  const [totalAmountEur, setTotalAmountEur] = useState(0);

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateProductOrder();
  const { mutateAsync: completePayment, isPending: isCompletingPayment } =
    useCompleteProductOrderPayment();
  const { data: allPrices = [] } = useProductOfferingPrices();
  const tokenOffering = useTokenOfferingQuote(offering);

  const priceIds = new Set((offering?.productOfferingPrice ?? []).map((p) => p.id));
  const offeringPrices = allPrices.filter((p) => p.id && priceIds.has(p.id));
  // Price frozen at purchase time (CA-2): for a tokenized offering, replaces the static price with the current quote (fixed or dynamic according to tokenOfferConfig).
  const priceValue = tokenOffering.isTokenized
    ? (tokenOffering.price?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ??
      'A consultar')
    : buildPriceValue(offeringPrices);
  const totalAmount = tokenOffering.isTokenized
    ? (tokenOffering.price ?? 0)
    : getTotalAmount(offeringPrices);

  const resetPaymentState = () => {
    setSellerOrgId(null);
    setPayoutsBlocked(false);
    setPaymentClientSecret(null);
    setPaymentIntentId(null);
    setOrderId(null);
    setFeePercent(0);
    setFeeAmountEur(0);
    setTotalAmountEur(0);
  };

  // An unconfirmed `PaymentIntent` leaves behind an order in `acknowledged` with no payment — it is released here and passive reconciliation will mark it as `rejected` on the next load.
  const releaseUnconfirmedIntent = () => {
    if (paymentIntentId) {
      cancelPaymentIntent(paymentIntentId).catch(() => {});
    }
  };

  const handleClose = () => {
    releaseUnconfirmedIntent();
    setStep('summary');
    setFormValues(null);
    setError(null);
    resetPaymentState();
    onClose();
  };

  const handleBackToDetails = () => {
    releaseUnconfirmedIntent();
    resetPaymentState();
    setError(null);
    setStep('details');
  };

  const handleDetailsNext = async (data: OrderDetailsFormData) => {
    if (!offering) return;
    setFormValues(data);
    setError(null);

    const specId = offering.productSpecification?.id;
    if (!specId) {
      setError(
        'Esta oferta no tiene una especificación de producto válida; no se puede determinar el proveedor.',
      );
      return;
    }

    setPreparingPayment(true);
    try {
      const spec = await getProductSpecificationById(specId);
      const resolvedSellerOrgId = spec.relatedParty?.[0]?.id;
      if (!resolvedSellerOrgId) {
        setError(
          'No se pudo determinar el proveedor de esta oferta; no es posible crear la orden.',
        );
        return;
      }
      setSellerOrgId(resolvedSellerOrgId);

      if (totalAmount <= 0) {
        setStep('confirm');
        return;
      }

      const sellerOrg = await fetchOrganizationById(resolvedSellerOrgId);
      const destinationAccountId = getLatestCharacteristicValue(
        sellerOrg.partyCharacteristic,
        'stripeConnectAccountId',
      );
      const payoutsEnabled = getLatestCharacteristicValue(
        sellerOrg.partyCharacteristic,
        'stripePayoutsEnabled',
      );

      if (
        typeof destinationAccountId !== 'string' ||
        !destinationAccountId ||
        payoutsEnabled !== true
      ) {
        // The provider cannot charge yet, but the buyer must see the same price + fee breakdown they would see if they could pay — only the payment step itself is blocked.
        const preview = await getPriceBreakdown(totalAmount);
        setFeePercent(preview.feePercent);
        setFeeAmountEur(preview.feeAmountEur);
        setTotalAmountEur(preview.totalAmountEur);
        setPayoutsBlocked(true);
        setStep('payment');
        return;
      }

      const {
        id,
        clientSecret,
        feePercent: newFeePercent,
        feeAmountEur: newFeeAmountEur,
        totalAmountEur: newTotalAmountEur,
      } = await createPaymentIntent(totalAmount, offering.id ?? '', {});
      setPaymentIntentId(id);
      setPaymentClientSecret(clientSecret);
      setFeePercent(newFeePercent);
      setFeeAmountEur(newFeeAmountEur);
      setTotalAmountEur(newTotalAmountEur);

      // The order is created here, before payment: if the method requires a full redirect, the browser may never return to this component instance — the return route needs the order to exist in order to complete it.
      try {
        const order = await createOrder({
          description: data.description || undefined,
          requestedStartDate: data.requestedStartDate || undefined,
          requestedCompletionDate: data.requestedCompletionDate || undefined,
          priority: data.priority || undefined,
          externalId: id,
          relatedParty: [
            { id: resolvedSellerOrgId, role: 'seller', '@referredType': 'Organization' },
          ],
          productOrderItem: [
            {
              id: '1',
              action: 'add',
              quantity: data.quantity,
              productOffering: { id: offering.id!, name: offering.name },
              ...(tokenOffering.isTokenized && {
                itemPrice: [{ value: totalAmount, unit: 'EUR' }],
              }),
            },
          ],
        });
        setOrderId(order.id ?? null);
        setStep('payment');
      } catch (err) {
        // The order was not created — release the newly created PaymentIntent instead of leaving it orphaned.
        cancelPaymentIntent(id).catch(() => {});
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al preparar el pago');
    } finally {
      setPreparingPayment(false);
    }
  };

  const handlePaymentCompleted = () => {
    setPaymentIntentId(null);
    setError(null);
    setStep('success');
  };

  const handleConfirm = async () => {
    if (!offering || !formValues || !sellerOrgId) return;
    setError(null);

    const payload: NewProductOrder = {
      description: formValues.description || undefined,
      requestedStartDate: formValues.requestedStartDate || undefined,
      requestedCompletionDate: formValues.requestedCompletionDate || undefined,
      priority: formValues.priority || undefined,
      relatedParty: [{ id: sellerOrgId, role: 'seller', '@referredType': 'Organization' }],
      productOrderItem: [
        {
          id: '1',
          action: 'add',
          quantity: formValues.quantity,
          productOffering: { id: offering.id!, name: offering.name },
          ...(tokenOffering.isTokenized && { itemPrice: [{ value: totalAmount, unit: 'EUR' }] }),
        },
      ],
    };

    try {
      const order = await createOrder(payload);
      if (!order.id) {
        setError('La orden se creó pero no devolvió un identificador válido.');
        return;
      }
      const result = await completePayment(order.id);
      if (!result.ok) {
        setError(FINALIZE_STEP_MESSAGES[result.step] ?? result.message);
        return;
      }
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden');
    }
  };

  return (
    <OfertasDrawer
      open={offering !== null}
      onClose={handleClose}
      title={getDrawerTitle(step)}
      description={step === 'summary' ? (offering?.name ?? undefined) : undefined}
    >
      {step !== 'success' && <StepIndicator current={step} />}

      {error && step !== 'summary' && (
        <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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
          feePercent={feePercent}
          feeAmountEur={feeAmountEur}
          totalAmountEur={totalAmountEur}
          blocked={payoutsBlocked}
          clientSecret={paymentClientSecret}
          orderId={orderId}
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
          isLoading={isCreatingOrder || isCompletingPayment || preparingPayment}
        />
      )}
    </OfertasDrawer>
  );
}
