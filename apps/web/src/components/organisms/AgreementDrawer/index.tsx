'use client';

import { useState } from 'react';

import Drawer from '@/components/molecules/Drawer';
import { useCreateAgreement, useLinkAgreementToOrder } from '@/hooks/queries';
import {
  buildAgreementCharacteristics,
  buildTermOrConditions,
} from '@/lib/utils/buildAgreementPayload';
import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';
import type { NewAgreement, ProductOrder } from '@/types/api';

import ConfirmStep from './ConfirmStep';
import { getOfferingName, type Step } from './constants';
import PartiesStep from './PartiesStep';
import StepIndicator from './StepIndicator';
import TermsStep from './TermsStep';

/** Props of `AgreementDrawer`. */
export interface AgreementDrawerProps {
  order: ProductOrder | null;
  onClose: () => void;
}

/** Drawer title per step. */
function getDrawerTitle(step: Step): string {
  if (step === 'terms') return 'Configurar términos';
  if (step === 'confirm') return 'Confirmar acuerdo';
  return 'Crear acuerdo';
}

/** Builds the agreement payload from an order and the agreed terms. */
function buildAgreementPayload(order: ProductOrder, values: AgreementTermsFormData): NewAgreement {
  const offeringRef = order.productOrderItem?.[0]?.productOffering;
  // Here you define your business logic (agreement type, initial status, engaged parties...).
  return {
    name: `Acuerdo — ${getOfferingName(order)}`,
    agreementType: 'commercial',
    status: 'approved',
    initialDate: new Date().toISOString(),
    engagedParty: order.relatedParty ?? [],
    agreementItem: [
      {
        productOffering: offeringRef ? [{ id: offeringRef.id, name: offeringRef.name }] : [],
        termOrCondition: buildTermOrConditions(values),
      },
    ],
    characteristic: buildAgreementCharacteristics(values),
  };
}

/** AgreementDrawer - 3-step wizard (parties, terms, confirmation) that creates an agreement for an order. */
export default function AgreementDrawer({ order, onClose }: Readonly<AgreementDrawerProps>) {
  const [step, setStep] = useState<Step>('parties');
  const [formValues, setFormValues] = useState<AgreementTermsFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: createAgreement, isPending: isCreating } = useCreateAgreement();
  const { mutate: linkAgreementToOrder, isPending: isLinking } = useLinkAgreementToOrder();

  const handleClose = () => {
    setStep('parties');
    setFormValues(null);
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!order || !formValues) return;
    setError(null);
    const payload = buildAgreementPayload(order, formValues);

    createAgreement(payload, {
      onSuccess: (created) => {
        if (!order.id || !created.id) {
          handleClose();
          return;
        }
        linkAgreementToOrder(
          { orderId: order.id, agreementId: created.id, agreementName: payload.name },
          {
            onSuccess: handleClose,
            onError: (err) => setError(err.message || 'No se pudo vincular el acuerdo a la orden'),
          },
        );
      },
      onError: (err) => setError(err.message || 'Error al crear el acuerdo'),
    });
  };

  return (
    <Drawer
      open={order !== null}
      onClose={handleClose}
      title={getDrawerTitle(step)}
      description={step === 'parties' && order ? getOfferingName(order) : undefined}
    >
      <StepIndicator current={step} />

      {order && step === 'parties' && (
        <PartiesStep order={order} onNext={() => setStep('terms')} onCancel={handleClose} />
      )}
      {order && step === 'terms' && (
        <TermsStep
          defaultValues={formValues}
          onBack={() => setStep('parties')}
          onNext={(data) => {
            setFormValues(data);
            setStep('confirm');
          }}
        />
      )}
      {order && step === 'confirm' && formValues && (
        <ConfirmStep
          order={order}
          values={formValues}
          onBack={() => setStep('terms')}
          onConfirm={handleConfirm}
          isLoading={isCreating || isLinking}
          error={error}
        />
      )}
    </Drawer>
  );
}
