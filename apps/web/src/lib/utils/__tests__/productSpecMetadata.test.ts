import { describe, expect, it } from 'vitest';

import {
  buildDatasetMetadataChar,
  type DatasetMetadataValue,
  extractDatasetMetadata,
  METADATA_CHAR_ID,
} from '@/lib/utils/productSpecMetadata';
import type { ProductSpecification } from '@/types/api';

const VALUE: DatasetMetadataValue = {
  distributions: 'CSV',
  standard: 'ISO',
  license: 'MIT',
  accuracy: 80,
  completeness: 60,
  consistency: 100,
  credibility: 40,
  timeliness: 20,
};

describe('extractDatasetMetadata', () => {
  it('returns an empty object when spec is undefined', () => {
    expect(extractDatasetMetadata(undefined)).toEqual({});
  });

  it('returns an empty object when the spec has no productSpecCharacteristic', () => {
    expect(extractDatasetMetadata({})).toEqual({});
  });

  it('returns an empty object when the datasetMetadata characteristic is absent', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [{ id: 'otherChar', productSpecCharacteristicValue: [{ value: 'x' }] }],
    };
    expect(extractDatasetMetadata(spec)).toEqual({});
  });

  it('extracts the value of the datasetMetadata characteristic', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [
        {
          id: METADATA_CHAR_ID,
          productSpecCharacteristicValue: [{ value: VALUE as Record<string, unknown> }],
        },
      ],
    };
    expect(extractDatasetMetadata(spec)).toEqual(VALUE);
  });

  it('returns an empty object when the characteristic has no productSpecCharacteristicValue entries', () => {
    const spec: ProductSpecification = {
      productSpecCharacteristic: [{ id: METADATA_CHAR_ID, productSpecCharacteristicValue: [] }],
    };
    expect(extractDatasetMetadata(spec)).toEqual({});
  });
});

describe('buildDatasetMetadataChar', () => {
  it('returns null when value is an empty object', () => {
    expect(buildDatasetMetadataChar({})).toBeNull();
  });

  it('builds a characteristic wrapping the value with isDefault true', () => {
    const char = buildDatasetMetadataChar(VALUE);
    expect(char).toEqual({
      id: METADATA_CHAR_ID,
      name: 'Metadatos del dataset',
      valueType: 'object',
      productSpecCharacteristicValue: [{ isDefault: true, value: VALUE }],
    });
  });

  it('round-trips build -> extract', () => {
    const char = buildDatasetMetadataChar(VALUE)!;
    const spec: ProductSpecification = { productSpecCharacteristic: [char] };
    expect(extractDatasetMetadata(spec)).toEqual(VALUE);
  });
});
