import type { ProductSpecification, ProductSpecificationCharacteristic } from '@/types/api';

import type { DataQualityScores } from './dataQuality';

export const METADATA_CHAR_ID = 'datasetMetadata';

export interface DatasetMetadataValue extends DataQualityScores {
  distributions?: string;
  standard?: string;
  license?: string;
}

export const extractDatasetMetadata = (
  spec: ProductSpecification | undefined,
): DatasetMetadataValue => {
  const char = spec?.productSpecCharacteristic?.find((c) => c.id === METADATA_CHAR_ID);
  return (char?.productSpecCharacteristicValue?.[0]?.value ?? {}) as DatasetMetadataValue;
};

export const buildDatasetMetadataChar = (
  value: DatasetMetadataValue,
): ProductSpecificationCharacteristic | null => {
  if (Object.keys(value).length === 0) return null;
  return {
    id: METADATA_CHAR_ID,
    name: 'Metadatos del dataset',
    valueType: 'object',
    productSpecCharacteristicValue: [{ isDefault: true, value: value as Record<string, unknown> }],
  };
};
