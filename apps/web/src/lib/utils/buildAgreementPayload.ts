import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';
import type { AgreementCharacteristic, AgreementTermOrCondition } from '@/types/api';

const PURPOSE_LABELS: Record<AgreementTermsFormData['purpose'], string> = {
  commercial: 'Comercial',
  research: 'Investigación',
  internal: 'Interno',
  educational: 'Educativo',
  other: 'Otro',
};

/** Returns a unique id for an agreement term. */
function termId(): string {
  // Here you define your business logic (id format expected by your backend).
  return crypto.randomUUID();
}

/** Builds the `termOrCondition` array of an agreement from the terms form values. */
export function buildTermOrConditions(data: AgreementTermsFormData): AgreementTermOrCondition[] {
  const base: AgreementTermOrCondition[] = [
    { id: termId(), description: `Propósito de uso: ${PURPOSE_LABELS[data.purpose]}` },
    {
      id: termId(),
      description: `Redistribución: ${data.canRedistribute ? 'Permitida' : 'No permitida'}`,
    },
    { id: termId(), description: `Requiere pago: ${data.requiresPayment ? 'Sí' : 'No'}` },
    { id: termId(), description: `Requiere atribución: ${data.requiresAttribution ? 'Sí' : 'No'}` },
    {
      id: termId(),
      description: `Obras derivadas: ${data.canCreateDerivatives ? 'Permitidas' : 'No permitidas'}`,
    },
  ];
  const custom = data.customTerms.map((t) => ({ id: termId(), description: t.description }));
  return [...base, ...custom];
}

/** Builds the `characteristic` array of an agreement (only fields with a value). */
export function buildAgreementCharacteristics(
  data: AgreementTermsFormData,
): AgreementCharacteristic[] {
  const chars: AgreementCharacteristic[] = [];
  if (data.geographicRestrictions?.trim()) {
    chars.push({ name: 'geographicRestrictions', value: data.geographicRestrictions.trim() });
  }
  if (data.startDate) chars.push({ name: 'agreementStartDate', value: data.startDate });
  if (data.endDate) chars.push({ name: 'agreementEndDate', value: data.endDate });
  return chars;
}
