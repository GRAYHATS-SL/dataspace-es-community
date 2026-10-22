import type {
  Catalog,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
} from '@/types/api';

export interface OfferingFilters {
  searchTerm: string;
  statusFilters: string[];
  catalogFilters: string[];
  categoriaFilters: string[];
  precioFilters: string[];
  proveedorFilters: string[];
  fechaFilter: 'today' | '7d' | '30d' | '90d' | 'older' | '';
  formatoFilters: string[];
  standardFilters: string[];
  licenseFilters: string[];
  qualityFilters: string[];
}

export interface FilterOptions {
  catalogos: { id: string; name: string }[];
  categorias: { id: string; name: string }[];
  proveedores: string[];
  priceTypes: string[];
  formatos: string[];
  standards: string[];
  licenses: string[];
  qualities: string[];
}

function extractSpecMeta(spec: ProductSpecification | undefined): {
  distributions: string;
  standard: string;
  license: string;
  quality: string;
} {
  const empty = { distributions: '', standard: '', license: '', quality: '' };
  if (!spec) return empty;
  const combined = spec.productSpecCharacteristic?.find((c) => c.id === 'datasetMetadata');
  if (combined) {
    const v = (combined.productSpecCharacteristicValue?.[0]?.value ?? {}) as Record<string, string>;
    return {
      distributions: v.distributions ?? '',
      standard: v.standard ?? '',
      license: v.license ?? '',
      quality: v.quality ?? '',
    };
  }
  const getChar = (id: string) => {
    const c = spec.productSpecCharacteristic?.find((ch) => ch.id === id);
    return (c?.productSpecCharacteristicValue?.[0]?.value as string) ?? '';
  };
  return {
    distributions: getChar('distributions'),
    standard: getChar('standard'),
    license: getChar('license'),
    quality: getChar('quality'),
  };
}

function bucketToDays(bucket: '7d' | '30d' | '90d'): number {
  if (bucket === '7d') return 7;
  if (bucket === '30d') return 30;
  return 90;
}

function buildDateCutoff(bucket: OfferingFilters['fechaFilter']): Date | null {
  if (!bucket || bucket === 'older') return null;
  const now = new Date();
  if (bucket === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = bucketToDays(bucket);
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

function matchesSearch(
  o: ProductOffering,
  specById: Map<string, ProductSpecification>,
  q: string,
): boolean {
  if (!q) return true;
  const spec = o.productSpecification?.id ? specById.get(o.productSpecification.id) : undefined;
  if (o.name?.toLowerCase().includes(q)) return true;
  if (o.description?.toLowerCase().includes(q)) return true;
  if (spec?.brand?.toLowerCase().includes(q)) return true;
  if (spec?.description?.toLowerCase().includes(q)) return true;
  return !!spec?.productSpecCharacteristic?.some(
    (c) =>
      c.name?.toLowerCase().includes(q) ||
      c.productSpecCharacteristicValue?.some((v) => {
        const val = v.value;
        if (!val) return false;
        if (typeof val === 'object') {
          return Object.values(val as Record<string, unknown>).some((s) =>
            String(s ?? '')
              .toLowerCase()
              .includes(q),
          );
        }
        return String(val).toLowerCase().includes(q);
      }),
  );
}

function matchesCatalog(
  o: ProductOffering,
  catalogFilters: string[],
  catalogCategoryIdsMap: Map<string, Set<string>>,
): boolean {
  if (!catalogFilters.length) return true;
  return catalogFilters.some((catalogId) => {
    const catIds = catalogCategoryIdsMap.get(catalogId);
    return !!catIds && o.category?.some((ref) => ref.id && catIds.has(ref.id));
  });
}

function matchesCategoria(o: ProductOffering, categoriaFilters: string[]): boolean {
  if (!categoriaFilters.length) return true;
  return !!o.category?.some((ref) => ref.id && categoriaFilters.includes(ref.id));
}

function matchesPrecio(
  o: ProductOffering,
  priceById: Map<string, ProductOfferingPrice>,
  precioFilters: string[],
): boolean {
  if (!precioFilters.length) return true;
  const types = (o.productOfferingPrice ?? [])
    .map((ref) => priceById.get(ref.id ?? '')?.priceType?.toLowerCase())
    .filter((t): t is string => !!t);
  return types.some((t) => precioFilters.includes(t));
}

function matchesProveedor(o: ProductOffering, proveedorFilters: string[]): boolean {
  if (!proveedorFilters.length) return true;
  return !!o.relatedParty?.some(
    (p) => p.role === 'provider' && proveedorFilters.includes(p.name ?? ''),
  );
}

function matchesSpecMeta(
  o: ProductOffering,
  specById: Map<string, ProductSpecification>,
  formatoFilters: string[],
  standardFilters: string[],
  licenseFilters: string[],
  qualityFilters: string[],
): boolean {
  const spec = o.productSpecification?.id ? specById.get(o.productSpecification.id) : undefined;
  const meta = extractSpecMeta(spec);
  const checks: [string[], string][] = [
    [formatoFilters, meta.distributions],
    [standardFilters, meta.standard],
    [licenseFilters, meta.license],
    [qualityFilters, meta.quality],
  ];
  return checks.every(([filters, value]) => !filters.length || filters.includes(value));
}

function matchesFecha(
  o: ProductOffering,
  fechaFilter: OfferingFilters['fechaFilter'],
  dateCutoff: Date | null,
  olderCutoff: Date | null,
): boolean {
  if (!fechaFilter) return true;
  if (!o.lastUpdate) return false;
  const d = new Date(o.lastUpdate);
  if (fechaFilter === 'older') return !!olderCutoff && d < olderCutoff;
  return !!dateCutoff && d >= dateCutoff;
}

/**
 * Filters ProductOffering items by all dimensions of `filters`.
 *
 * @param offerings - Full list of offerings.
 * @param priceById - Map of price id to entity.
 * @param specById  - Map of specification id to entity.
 * @param filters   - Filter state from URL search params.
 * @param catalogCategoryIdsMap - Map of catalog id to its category ids.
 */
export function filterOfferings(
  offerings: ProductOffering[],
  priceById: Map<string, ProductOfferingPrice>,
  specById: Map<string, ProductSpecification>,
  filters: OfferingFilters,
  catalogCategoryIdsMap: Map<string, Set<string>>,
): ProductOffering[] {
  const {
    searchTerm,
    statusFilters,
    catalogFilters,
    categoriaFilters,
    precioFilters,
    proveedorFilters,
    fechaFilter,
    formatoFilters,
    standardFilters,
    licenseFilters,
    qualityFilters,
  } = filters;
  const q = searchTerm.toLowerCase();
  const dateCutoff = buildDateCutoff(fechaFilter);
  const olderCutoff = fechaFilter === 'older' ? buildDateCutoff('90d') : null;

  return offerings.filter(
    (o) =>
      matchesSearch(o, specById, q) &&
      (!statusFilters.length || statusFilters.includes(o.lifecycleStatus ?? '')) &&
      matchesCatalog(o, catalogFilters, catalogCategoryIdsMap) &&
      matchesCategoria(o, categoriaFilters) &&
      matchesPrecio(o, priceById, precioFilters) &&
      matchesProveedor(o, proveedorFilters) &&
      matchesFecha(o, fechaFilter, dateCutoff, olderCutoff) &&
      matchesSpecMeta(o, specById, formatoFilters, standardFilters, licenseFilters, qualityFilters),
  );
}

function collectOfferingOptions(
  o: ProductOffering,
  priceById: Map<string, ProductOfferingPrice>,
  categoriaMap: Map<string, string>,
  proveedoresSet: Set<string>,
  priceTypesSet: Set<string>,
): void {
  const providers = (o.relatedParty ?? []).filter((p) => p.role === 'provider' && !!p.name);
  for (const ref of o.category ?? []) {
    if (ref.id) categoriaMap.set(ref.id, ref.name ?? ref.id);
  }
  for (const p of providers) proveedoresSet.add(p.name!);
  for (const ref of o.productOfferingPrice ?? []) {
    const pt = priceById.get(ref.id ?? '')?.priceType?.toLowerCase();
    if (pt) priceTypesSet.add(pt);
  }
}

function collectSpecMetaOptions(
  o: ProductOffering,
  specById: Map<string, ProductSpecification>,
  formatosSet: Set<string>,
  standardsSet: Set<string>,
  licensesSet: Set<string>,
  qualitiesSet: Set<string>,
): void {
  const spec = o.productSpecification?.id ? specById.get(o.productSpecification.id) : undefined;
  const meta = extractSpecMeta(spec);
  if (meta.distributions) formatosSet.add(meta.distributions);
  if (meta.standard) standardsSet.add(meta.standard);
  if (meta.license) licensesSet.add(meta.license);
  if (meta.quality) qualitiesSet.add(meta.quality);
}

/**
 * Derives the available filter panel options from the unfiltered offerings.
 *
 * @param offerings - Offerings of the current level.
 * @param priceById - Map of price id to entity.
 * @param catalogs  - Available published catalogs.
 */
export function deriveFilterOptions(
  offerings: ProductOffering[],
  priceById: Map<string, ProductOfferingPrice>,
  catalogs: Catalog[],
  specById: Map<string, ProductSpecification>,
): FilterOptions {
  const categoriaMap = new Map<string, string>();
  const proveedoresSet = new Set<string>();
  const priceTypesSet = new Set<string>();
  const formatosSet = new Set<string>();
  const standardsSet = new Set<string>();
  const licensesSet = new Set<string>();
  const qualitiesSet = new Set<string>();

  for (const o of offerings) {
    collectOfferingOptions(o, priceById, categoriaMap, proveedoresSet, priceTypesSet);
    collectSpecMetaOptions(o, specById, formatosSet, standardsSet, licensesSet, qualitiesSet);
  }

  return {
    catalogos: catalogs.filter((c) => c.id).map((c) => ({ id: c.id!, name: c.name ?? c.id! })),
    categorias: Array.from(categoriaMap.entries()).map(([id, name]) => ({ id, name })),
    proveedores: Array.from(proveedoresSet).sort((a, b) => a.localeCompare(b)),
    priceTypes: Array.from(priceTypesSet).sort((a, b) => a.localeCompare(b)),
    formatos: Array.from(formatosSet).sort((a, b) => a.localeCompare(b)),
    standards: Array.from(standardsSet).sort((a, b) => a.localeCompare(b)),
    licenses: Array.from(licensesSet).sort((a, b) => a.localeCompare(b)),
    qualities: Array.from(qualitiesSet).sort((a, b) => a.localeCompare(b)),
  };
}
