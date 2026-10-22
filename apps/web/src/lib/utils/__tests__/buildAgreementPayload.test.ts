import { describe, expect, it } from 'vitest';

import { buildAgreementCharacteristics, buildTermOrConditions } from '@/lib/utils/buildAgreementPayload';
import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';

const BASE_DATA: AgreementTermsFormData = {
  purpose: 'commercial',
  canRedistribute: false,
  requiresPayment: false,
  requiresAttribution: true,
  canCreateDerivatives: false,
  customTerms: [],
};

describe('buildTermOrConditions', () => {
  it('builds the 5 standard terms with Spanish labels reflecting the form data', () => {
    const terms = buildTermOrConditions(BASE_DATA);
    expect(terms).toHaveLength(5);
    expect(terms[0].description).toBe('Propósito de uso: Comercial');
    expect(terms[1].description).toBe('Redistribución: No permitida');
    expect(terms[2].description).toBe('Requiere pago: No');
    expect(terms[3].description).toBe('Requiere atribución: Sí');
    expect(terms[4].description).toBe('Obras derivadas: No permitidas');
  });

  it('reflects true boolean flags in the generated descriptions', () => {
    const terms = buildTermOrConditions({
      ...BASE_DATA,
      canRedistribute: true,
      requiresPayment: true,
      requiresAttribution: false,
      canCreateDerivatives: true,
    });
    expect(terms[1].description).toBe('Redistribución: Permitida');
    expect(terms[2].description).toBe('Requiere pago: Sí');
    expect(terms[3].description).toBe('Requiere atribución: No');
    expect(terms[4].description).toBe('Obras derivadas: Permitidas');
  });

  it('maps every known purpose value to its Spanish label', () => {
    const purposes: AgreementTermsFormData['purpose'][] = [
      'commercial',
      'research',
      'internal',
      'educational',
      'other',
    ];
    const labels = purposes.map(
      (purpose) => buildTermOrConditions({ ...BASE_DATA, purpose })[0].description,
    );
    expect(labels).toEqual([
      'Propósito de uso: Comercial',
      'Propósito de uso: Investigación',
      'Propósito de uso: Interno',
      'Propósito de uso: Educativo',
      'Propósito de uso: Otro',
    ]);
  });

  it('falls back to the raw purpose value when it is not a known key', () => {
    const terms = buildTermOrConditions({
      ...BASE_DATA,
      purpose: 'unknown-purpose' as AgreementTermsFormData['purpose'],
    });
    expect(terms[0].description).toBe('Propósito de uso: unknown-purpose');
  });

  it('appends custom terms after the 5 standard ones', () => {
    const terms = buildTermOrConditions({
      ...BASE_DATA,
      customTerms: [{ description: 'Custom term A' }, { description: 'Custom term B' }],
    });
    expect(terms).toHaveLength(7);
    expect(terms[5].description).toBe('Custom term A');
    expect(terms[6].description).toBe('Custom term B');
  });

  it('assigns each term a unique NGSI-LD urn id', () => {
    const terms = buildTermOrConditions(BASE_DATA);
    const ids = terms.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^urn:ngsi-ld:agreementTermOrCondition:/);
    }
  });
});

describe('buildAgreementCharacteristics', () => {
  it('returns an empty array when no optional field carries a value', () => {
    expect(buildAgreementCharacteristics(BASE_DATA)).toEqual([]);
  });

  it('includes geographicRestrictions trimmed when present', () => {
    const chars = buildAgreementCharacteristics({
      ...BASE_DATA,
      geographicRestrictions: '  EU, US  ',
    });
    expect(chars).toEqual([{ name: 'geographicRestrictions', value: 'EU, US' }]);
  });

  it('omits geographicRestrictions when it is whitespace-only', () => {
    const chars = buildAgreementCharacteristics({
      ...BASE_DATA,
      geographicRestrictions: '   ',
    });
    expect(chars).toEqual([]);
  });

  it('includes startDate and endDate when present', () => {
    const chars = buildAgreementCharacteristics({
      ...BASE_DATA,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(chars).toEqual([
      { name: 'agreementStartDate', value: '2026-01-01' },
      { name: 'agreementEndDate', value: '2026-12-31' },
    ]);
  });

  it('combines all present optional fields in a fixed order', () => {
    const chars = buildAgreementCharacteristics({
      ...BASE_DATA,
      geographicRestrictions: 'EU',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expect(chars).toEqual([
      { name: 'geographicRestrictions', value: 'EU' },
      { name: 'agreementStartDate', value: '2026-01-01' },
      { name: 'agreementEndDate', value: '2026-12-31' },
    ]);
  });
});
