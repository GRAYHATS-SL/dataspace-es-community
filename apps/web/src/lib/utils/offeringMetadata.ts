import {
  type DatasetMetadataValue,
  extractDatasetMetadata,
  METADATA_CHAR_ID,
} from '@/lib/utils/productSpecMetadata';
import type { ProductOfferingPrice, ProductSpecification } from '@/types/api';

export type SpecMetadata = Pick<
  DatasetMetadataValue,
  'accuracy' | 'completeness' | 'consistency' | 'credibility' | 'timeliness'
> & {
  distributions: string;
  standard: string;
  license: string;
  productNumber: string;
};

// Specs created before the combined 'datasetMetadata' format store distributions/standard/license as loose characteristics by id.
const getLegacyChar = (spec: ProductSpecification, id: string): string => {
  const c = spec.productSpecCharacteristic?.find((ch) => ch.id === id);
  return (c?.productSpecCharacteristicValue?.[0]?.value as string) ?? '';
};

export const extractSpecMetadata = (spec: ProductSpecification | undefined): SpecMetadata => {
  const productNumber = spec?.productNumber ?? '';
  if (!spec) return { distributions: '', standard: '', license: '', productNumber };

  const combined = extractDatasetMetadata(spec);
  const isLegacyFormat = !spec.productSpecCharacteristic?.some((c) => c.id === METADATA_CHAR_ID);

  return {
    distributions:
      combined.distributions || (isLegacyFormat ? getLegacyChar(spec, 'distributions') : ''),
    standard: combined.standard || (isLegacyFormat ? getLegacyChar(spec, 'standard') : ''),
    license: combined.license || (isLegacyFormat ? getLegacyChar(spec, 'license') : ''),
    accuracy: combined.accuracy,
    completeness: combined.completeness,
    consistency: combined.consistency,
    credibility: combined.credibility,
    timeliness: combined.timeliness,
    productNumber,
  };
};

export const formatDate = (dateStr: string, opts?: Intl.DateTimeFormatOptions): string => {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', opts);
  } catch {
    return '';
  }
};

export const buildPriceValue = (offeringPrices: ProductOfferingPrice[]): string | null => {
  if (offeringPrices.length === 0) return null;
  return offeringPrices
    .map((p) => {
      const amount =
        p.price?.value != null
          ? `${p.price.value.toLocaleString('es-ES')} ${p.price.unit ?? ''}`.trim()
          : null;
      return amount ? `${p.name ?? ''} · ${amount}`.trim() : (p.name ?? '');
    })
    .filter(Boolean)
    .join(' / ');
};

export type MetadataItem = { icon: string; label: string; value: string };

export const buildMetadataItems = (opts: {
  publisher: string | undefined;
  lifecycleStatus: string | undefined;
  updatedDate: string;
  priceValue: string | null;
  license: string;
  distributions: string;
  standard: string;
  productNumber: string;
  place: string;
  terms: string;
}): MetadataItem[] => {
  const {
    publisher,
    lifecycleStatus,
    updatedDate,
    priceValue,
    license,
    distributions,
    standard,
    productNumber,
    place,
    terms,
  } = opts;
  const candidates: { icon: string; label: string; value: string | null | undefined }[] = [
    { icon: 'Building2', label: 'Proveedor', value: publisher },
    { icon: 'Circle', label: 'Estado', value: lifecycleStatus },
    { icon: 'CalendarDays', label: 'Actualizado', value: updatedDate },
    { icon: 'CreditCard', label: 'Precio', value: priceValue },
    { icon: 'Scale', label: 'Licencia', value: license },
    { icon: 'Database', label: 'Formato', value: distributions },
    { icon: 'FileCheck', label: 'Estándar', value: standard },
    { icon: 'Hash', label: 'Referencia', value: productNumber },
    { icon: 'MapPin', label: 'Disponibilidad', value: place },
    { icon: 'FileText', label: 'Condiciones', value: terms },
  ];

  return candidates.filter((item): item is MetadataItem => Boolean(item.value));
};
