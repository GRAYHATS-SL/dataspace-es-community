import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';
import type { AgreementCharacteristic, AgreementTermOrCondition } from '@/types/api';

const PURPOSE_LABELS: Record<string, string> = {
  commercial: 'Comercial',
  research: 'Investigación',
  internal: 'Interno',
  educational: 'Educativo',
  other: 'Otro',
};

function termId() {
  return `urn:ngsi-ld:agreementTermOrCondition:${crypto.randomUUID()}`;
}

/**
 * Builds the `termOrCondition` array for an Agreement from the terms form data.
 *
 * @param data - Validated agreement terms form data.
 * @returns Array of `AgreementTermOrCondition`.
 */
export function buildTermOrConditions(data: AgreementTermsFormData): AgreementTermOrCondition[] {
  const base: AgreementTermOrCondition[] = [
    {
      id: termId(),
      description: `Propósito de uso: ${PURPOSE_LABELS[data.purpose] ?? data.purpose}`,
    },
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
  const custom = data.customTerms.map((t) => ({
    id: termId(),
    description: t.description,
  }));
  return [...base, ...custom];
}

/**
 * Builds the `characteristic` array for an Agreement from the terms form data.
 *
 * @param data - Validated agreement terms form data.
 * @returns Array of `AgreementCharacteristic`, possibly empty.
 */
export function buildAgreementCharacteristics(
  data: AgreementTermsFormData,
): AgreementCharacteristic[] {
  const chars: AgreementCharacteristic[] = [];
  if (data.geographicRestrictions?.trim()) {
    chars.push({ name: 'geographicRestrictions', value: data.geographicRestrictions.trim() });
  }
  if (data.startDate) {
    chars.push({ name: 'agreementStartDate', value: data.startDate });
  }
  if (data.endDate) {
    chars.push({ name: 'agreementEndDate', value: data.endDate });
  }
  return chars;
}
