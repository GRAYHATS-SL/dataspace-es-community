'use client';

import { useState } from 'react';

import OfertasDrawer from '@/app/(private)/dashboard/ofertas/_sections/OfertasDrawer';
import { useCreateAgreement, useLinkAgreementToOrder } from '@/hooks/queries';
import {
  buildAgreementCharacteristics,
  buildTermOrConditions,
} from '@/lib/utils/buildAgreementPayload';
import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';
import type { NewAgreement, ProductOrder } from '@/types/api';

import ConfirmStep from './ConfirmStep';
import type { Step } from './constants';
import PartiesStep from './PartiesStep';
import StepIndicator from './StepIndicator';
import TermsStep from './TermsStep';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgreementDrawerProps {
  order: ProductOrder | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDrawerTitle(step: Step): string {
  if (step === 'terms') return 'Configurar términos';
  if (step === 'confirm') return 'Confirmar acuerdo';
  return 'Crear acuerdo';
}

// ─── AgreementDrawer ──────────────────────────────────────────────────────────

/**
 * AgreementDrawer - Multi-step drawer to create an `Agreement` from an accepted order
 *
 * @param {ProductOrder|null} order - Source order (`null` = closed).
 * @param {() => void} onClose - Called on close.
 */
export default function AgreementDrawer({ order, onClose }: Readonly<AgreementDrawerProps>) {
  const [step, setStep] = useState<Step>('parties');
  const [formValues, setFormValues] = useState<AgreementTermsFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate: createAgreement, isPending: isCreating } = useCreateAgreement();
  const { mutate: linkAgreementToOrder, isPending: isLinking } = useLinkAgreementToOrder();
  const isPending = isCreating || isLinking;

  const handleClose = () => {
    setStep('parties');
    setFormValues(null);
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!order || !formValues) return;
    setError(null);

    const offeringId = order.productOrderItem?.[0]?.productOffering?.id;
    const offeringName = order.productOrderItem?.[0]?.productOffering?.name;

    const payload: NewAgreement = {
      name: `Acuerdo — ${offeringName ?? offeringId ?? order.id}`,
      agreementType: 'dataSharing',
      status: 'approved',
      initialDate: new Date().toISOString(),
      engagedParty: order.relatedParty ?? [],
      agreementItem: [
        {
          productOffering: offeringId ? [{ id: offeringId, name: offeringName }] : [],
          termOrCondition: buildTermOrConditions(formValues),
        },
      ],
      characteristic: buildAgreementCharacteristics(formValues),
    };

    createAgreement(payload, {
      onSuccess: (createdAgreement) => {
        if (order.id && createdAgreement.id) {
          linkAgreementToOrder(
            { orderId: order.id, agreementId: createdAgreement.id, agreementName: payload.name },
            { onSuccess: () => handleClose(), onError: () => handleClose() },
          );
        } else {
          handleClose();
        }
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('400') && message.toLowerCase().includes('relationship')) {
          setError(
            'Una de las partes del acuerdo (comprador o vendedor) no está registrada en el catálogo. ' +
              'Verifica que ambas organizaciones existen como entidades en el sistema.',
          );
        } else {
          setError(message || 'Error al crear el acuerdo');
        }
      },
    });
  };

  const offeringName =
    order?.productOrderItem?.[0]?.productOffering?.name ??
    order?.productOrderItem?.[0]?.productOffering?.id;

  return (
    <OfertasDrawer
      open={order !== null}
      onClose={handleClose}
      title={getDrawerTitle(step)}
      description={step === 'parties' ? (offeringName ?? undefined) : undefined}
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
          isLoading={isPending}
          error={error}
        />
      )}
    </OfertasDrawer>
  );
}
