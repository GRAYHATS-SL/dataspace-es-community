import type { ProductOffering, ProductOfferingPrice, ProductSpecification } from '@/types/api';

/** Descriptive metadata extracted from a product specification. */
export interface SpecMetadata {
  accessExpiresAt: string;
  productNumber: string;
}

/** Extracts the descriptive metadata of a product specification. */
export function extractSpecMetadata(spec: ProductSpecification | undefined): SpecMetadata {
  const metadata: SpecMetadata = {
    accessExpiresAt: '',
    productNumber: spec?.productNumber ?? '',
  };
  // Here you define your business logic (read the access policy from the specification
  // characteristics).
  return metadata;
}

/** Formats a date (ISO or `YYYY-MM-DD`) in Spanish; returns `''` when invalid. */
export function formatDateEs(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', opts);
}

/** Returns the prices referenced by an offering. */
export function getOfferingPrices(
  offering: ProductOffering | null | undefined,
  allPrices: ProductOfferingPrice[],
): ProductOfferingPrice[] {
  const priceIds = new Set((offering?.productOfferingPrice ?? []).map((p) => p.id));
  return allPrices.filter((p) => p.id && priceIds.has(p.id));
}

/** Builds a readable price label from an offering's prices, or `null` when there are none. */
export function buildPriceValue(offeringPrices: ProductOfferingPrice[]): string | null {
  if (offeringPrices.length === 0) return null;
  return offeringPrices
    .map((p) => {
      const amount =
        p.price?.value == null
          ? null
          : `${p.price.value.toLocaleString('es-ES')} ${p.price.unit ?? ''}`.trim();
      return amount ? `${p.name ?? ''} · ${amount}`.trim() : (p.name ?? '');
    })
    .filter(Boolean)
    .join(' / ');
}

/** Metadata row shown in offering cards. */
export interface OfferingMetadataItem {
  icon: string;
  label: string;
  value: string;
}

/** Builds the metadata rows of an offering, skipping empty values. */
export function buildMetadataItems(opts: {
  publisher: string | undefined;
  lifecycleStatus: string | undefined;
  updatedDate: string;
  priceValue: string | null;
  metadata: SpecMetadata;
  place: string;
  terms: string;
}): OfferingMetadataItem[] {
  const { publisher, lifecycleStatus, updatedDate, priceValue, metadata, place, terms } = opts;
  const expiryLabel = metadata.accessExpiresAt
    ? `Válido hasta ${formatDateEs(metadata.accessExpiresAt, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  const candidates: { icon: string; label: string; value: string | null | undefined }[] = [
    { icon: 'Building2', label: 'Proveedor', value: publisher },
    { icon: 'Circle', label: 'Estado', value: lifecycleStatus },
    { icon: 'CalendarDays', label: 'Actualizado', value: updatedDate },
    { icon: 'CreditCard', label: 'Precio', value: priceValue },
    { icon: 'Hash', label: 'Referencia', value: metadata.productNumber },
    { icon: 'MapPin', label: 'Disponibilidad', value: place },
    { icon: 'FileText', label: 'Condiciones', value: terms },
    { icon: 'Clock', label: 'Acceso', value: expiryLabel },
  ];

  return candidates.filter((item): item is OfferingMetadataItem => Boolean(item.value));
}
