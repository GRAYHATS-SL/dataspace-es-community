import { describe, expect, it } from 'vitest';

import {
  buildMetadataItems,
  buildPriceValue,
  extractSpecMetadata,
  formatDate,
} from '@/lib/utils/offeringMetadata';
import type { ProductOfferingPrice, ProductSpecification } from '@/types/api';

describe('extractSpecMetadata', () => {
  it('returns all-empty metadata when spec is undefined', () => {
    expect(extractSpecMetadata(undefined)).toEqual({
      distributions: '',
      standard: '',
      license: '',
      productNumber: '',
    });
  });

  it('reads distributions/standard/license/quality scores from the combined datasetMetadata characteristic', () => {
    const spec: ProductSpecification = {
      productNumber: 'PN-1',
      productSpecCharacteristic: [
        {
          id: 'datasetMetadata',
          productSpecCharacteristicValue: [
            {
              value: {
                distributions: 'CSV',
                standard: 'ISO',
                license: 'MIT',
                accuracy: 80,
                completeness: 60,
                consistency: 100,
                credibility: 40,
                timeliness: 20,
              },
            },
          ],
        },
      ],
    };
    expect(extractSpecMetadata(spec)).toEqual({
      distributions: 'CSV',
      standard: 'ISO',
      license: 'MIT',
      accuracy: 80,
      completeness: 60,
      consistency: 100,
      credibility: 40,
      timeliness: 20,
      productNumber: 'PN-1',
    });
  });

  it('falls back to legacy per-field characteristics when there is no combined datasetMetadata characteristic', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [
        { id: 'distributions', productSpecCharacteristicValue: [{ value: 'JSON' }] },
        { id: 'standard', productSpecCharacteristicValue: [{ value: 'DCAT' }] },
        { id: 'license', productSpecCharacteristicValue: [{ value: 'CC-BY' }] },
      ],
    };
    expect(extractSpecMetadata(spec)).toEqual({
      distributions: 'JSON',
      standard: 'DCAT',
      license: 'CC-BY',
      accuracy: undefined,
      completeness: undefined,
      consistency: undefined,
      credibility: undefined,
      timeliness: undefined,
      productNumber: '',
    });
  });

  it('does not fall back to legacy characteristics when the combined format is present but empty', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [
        { id: 'distributions', productSpecCharacteristicValue: [{ value: 'JSON' }] },
        { id: 'datasetMetadata', productSpecCharacteristicValue: [{ value: {} }] },
      ],
    };
    expect(extractSpecMetadata(spec).distributions).toBe('');
  });

  it('does not expose any access expiry, even if a legacy policy carries a dateTime constraint', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [
        {
          id: 'policyConfig',
          productSpecCharacteristicValue: [
            {
              value: {
                'odrl:permission': {
                  'odrl:constraint': [
                    { 'odrl:leftOperand': 'odrl:dateTime', 'odrl:rightOperand': '2026-12-31' },
                  ],
                },
              },
            },
          ],
        },
      ],
    };
    expect(extractSpecMetadata(spec)).not.toHaveProperty('odrlExpiresAt');
  });

  it('defaults productNumber to empty string when absent', () => {
    const spec: ProductSpecification = {};
    expect(extractSpecMetadata(spec).productNumber).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a date-only string (YYYY-MM-DD) using es-ES locale', () => {
    expect(formatDate('2026-01-15')).toBe('15/1/2026');
  });

  it('formats a full ISO datetime string', () => {
    expect(formatDate('2026-01-15T10:30:00.000Z')).toMatch(/15\/1\/2026|14\/1\/2026/);
  });

  it('applies custom Intl.DateTimeFormatOptions', () => {
    expect(formatDate('2026-01-15', { day: 'numeric', month: 'short', year: 'numeric' })).toContain(
      '2026',
    );
  });

  it('returns an empty string for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('returns an empty string for an empty input', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('buildPriceValue', () => {
  it('returns null for an empty prices array', () => {
    expect(buildPriceValue([])).toBeNull();
  });

  it('formats a single price with name, amount and unit', () => {
    const prices: ProductOfferingPrice[] = [
      { name: 'Suscripción mensual', price: { value: 9.99, unit: 'EUR' } },
    ];
    expect(buildPriceValue(prices)).toBe('Suscripción mensual · 9,99 EUR');
  });

  it('uses only the name when price.value is not present', () => {
    const prices: ProductOfferingPrice[] = [{ name: 'Gratuito' }];
    expect(buildPriceValue(prices)).toBe('Gratuito');
  });

  it('omits the unit when price.unit is absent', () => {
    const prices: ProductOfferingPrice[] = [{ name: 'Pago único', price: { value: 100 } }];
    expect(buildPriceValue(prices)).toBe('Pago único · 100');
  });

  it('joins multiple prices with " / "', () => {
    const prices: ProductOfferingPrice[] = [
      { name: 'Mensual', price: { value: 10, unit: 'EUR' } },
      { name: 'Anual', price: { value: 100, unit: 'EUR' } },
    ];
    expect(buildPriceValue(prices)).toBe('Mensual · 10 EUR / Anual · 100 EUR');
  });

  it('filters out prices that resolve to an empty string (no name, no value)', () => {
    const prices: ProductOfferingPrice[] = [{}, { name: 'Solo este' }];
    expect(buildPriceValue(prices)).toBe('Solo este');
  });

  it('includes a price with value 0', () => {
    const prices: ProductOfferingPrice[] = [{ name: 'Cero', price: { value: 0, unit: 'EUR' } }];
    expect(buildPriceValue(prices)).toBe('Cero · 0 EUR');
  });
});

describe('buildMetadataItems', () => {
  const FULL_OPTS = {
    publisher: 'Acme Corp',
    lifecycleStatus: 'Active',
    updatedDate: '10/1/2026',
    priceValue: '10 EUR',
    license: 'MIT',
    distributions: 'CSV',
    standard: 'ISO',
    productNumber: 'PN-1',
    place: 'España',
    terms: 'Ver condiciones',
  };

  it('returns every item when all fields are present', () => {
    const items = buildMetadataItems(FULL_OPTS);
    expect(items).toHaveLength(10);
    expect(items.map((i) => i.label)).toEqual([
      'Proveedor',
      'Estado',
      'Actualizado',
      'Precio',
      'Licencia',
      'Formato',
      'Estándar',
      'Referencia',
      'Disponibilidad',
      'Condiciones',
    ]);
  });

  it('omits fields that are falsy/undefined', () => {
    const items = buildMetadataItems({
      ...FULL_OPTS,
      publisher: undefined,
      lifecycleStatus: undefined,
      priceValue: null,
      license: '',
    });
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain('Proveedor');
    expect(labels).not.toContain('Estado');
    expect(labels).not.toContain('Precio');
    expect(labels).not.toContain('Licencia');
  });

  it('returns an empty array when every field is empty', () => {
    const items = buildMetadataItems({
      publisher: undefined,
      lifecycleStatus: undefined,
      updatedDate: '',
      priceValue: null,
      license: '',
      distributions: '',
      standard: '',
      productNumber: '',
      place: '',
      terms: '',
    });
    expect(items).toEqual([]);
  });
});
