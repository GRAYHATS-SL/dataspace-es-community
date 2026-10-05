import type {
  Catalog,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
} from '@/types/api';

/** Date bucket of the "last update" filter. */
export type DateFilter = 'today' | '7d' | '30d' | '90d' | 'older' | '';

/** Filter state of the public catalog. */
export interface OfferingFilters {
  searchTerm: string;
  statusFilters: string[];
  catalogFilters: string[];
  categoriaFilters: string[];
  precioFilters: string[];
  proveedorFilters: string[];
  fechaFilter: DateFilter;
}

/** Options available in the catalog filter panel. */
export interface FilterOptions {
  catalogos: { id: string; name: string }[];
  categorias: { id: string; name: string }[];
  proveedores: string[];
  priceTypes: string[];
}

/** Lookup maps used by the catalog filters. */
export interface FilterLookups {
  priceById: Map<string, ProductOfferingPrice>;
  specById: Map<string, ProductSpecification>;
  catalogCategoryIds: Map<string, Set<string>>;
}

interface SpecFacets {
  provider: string;
}

/** Returns the filterable facets of an offering's specification. */
function getSpecFacets(o: ProductOffering, specById: Map<string, ProductSpecification>): SpecFacets {
  const spec = o.productSpecification?.id ? specById.get(o.productSpecification.id) : undefined;
  // Here you define your business logic (provider and other facets of an offering).
  return { provider: spec?.brand ?? '' };
}

const DAY_BUCKETS: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Returns the lower date bound of a date bucket (`null` for none/older). */
function buildDateCutoff(bucket: DateFilter): Date | null {
  if (!bucket || bucket === 'older') return null;
  const now = new Date();
  if (bucket === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(now);
  d.setDate(d.getDate() - DAY_BUCKETS[bucket]);
  return d;
}

/** Whether any value of a characteristic matches the query. */
function characteristicMatches(spec: ProductSpecification, q: string): boolean {
  return !!spec.productSpecCharacteristic?.some(
    (c) =>
      c.name?.toLowerCase().includes(q) ||
      c.productSpecCharacteristicValue?.some((v) =>
        JSON.stringify(v.value ?? '')
          .toLowerCase()
          .includes(q),
      ),
  );
}

/** Free-text search over the offering and its specification. */
function matchesSearch(
  o: ProductOffering,
  specById: Map<string, ProductSpecification>,
  q: string,
): boolean {
  if (!q) return true;
  const spec = o.productSpecification?.id ? specById.get(o.productSpecification.id) : undefined;
  const texts = [o.name, o.description, spec?.brand, spec?.description];
  if (texts.some((t) => t?.toLowerCase().includes(q))) return true;
  return spec ? characteristicMatches(spec, q) : false;
}

/** Whether the offering belongs to any selected catalog. */
function matchesCatalog(
  o: ProductOffering,
  catalogFilters: string[],
  catalogCategoryIds: Map<string, Set<string>>,
): boolean {
  if (!catalogFilters.length) return true;
  return catalogFilters.some((catalogId) => {
    const catIds = catalogCategoryIds.get(catalogId);
    return !!catIds && !!o.category?.some((ref) => ref.id && catIds.has(ref.id));
  });
}

/** Whether the offering has any selected price type. */
function matchesPrecio(
  o: ProductOffering,
  priceById: Map<string, ProductOfferingPrice>,
  precioFilters: string[],
): boolean {
  if (!precioFilters.length) return true;
  return (o.productOfferingPrice ?? []).some((ref) => {
    const type = priceById.get(ref.id)?.priceType?.toLowerCase();
    return !!type && precioFilters.includes(type);
  });
}

/** Whether the offering's last update falls in the selected bucket. */
function matchesFecha(o: ProductOffering, fechaFilter: DateFilter): boolean {
  if (!fechaFilter) return true;
  if (!o.lastUpdate) return false;
  const d = new Date(o.lastUpdate);
  if (fechaFilter === 'older') {
    const olderCutoff = buildDateCutoff('90d');
    return !!olderCutoff && d < olderCutoff;
  }
  const cutoff = buildDateCutoff(fechaFilter);
  return !!cutoff && d >= cutoff;
}

/** Whether a value passes a multi-select filter (empty filter = pass). */
const passes = (selected: string[], value: string): boolean =>
  !selected.length || selected.includes(value);

/** Whether the offering's specification facets pass the facet filters. */
function matchesFacets(
  o: ProductOffering,
  specById: Map<string, ProductSpecification>,
  f: OfferingFilters,
): boolean {
  const facets = getSpecFacets(o, specById);
  return (
    passes(f.proveedorFilters, facets.provider));
}

/** Filters offerings client-side with every dimension of `filters`. */
export function filterOfferings(
  offerings: ProductOffering[],
  filters: OfferingFilters,
  lookups: FilterLookups,
): ProductOffering[] {
  const q = filters.searchTerm.toLowerCase();
  const { priceById, specById, catalogCategoryIds } = lookups;

  return offerings.filter(
    (o) =>
      matchesSearch(o, specById, q) &&
      passes(filters.statusFilters, o.lifecycleStatus ?? '') &&
      matchesCatalog(o, filters.catalogFilters, catalogCategoryIds) &&
      (!filters.categoriaFilters.length ||
        !!o.category?.some((ref) => filters.categoriaFilters.includes(ref.id))) &&
      matchesPrecio(o, priceById, filters.precioFilters) &&
      matchesFecha(o, filters.fechaFilter) &&
      matchesFacets(o, specById, filters),
  );
}

/** Returns the sorted values of a set. */
const sorted = (set: Set<string>): string[] => Array.from(set).sort((a, b) => a.localeCompare(b));

/** Adds a value to a set when it is not empty. */
const addIf = (set: Set<string>, value: string | undefined): void => {
  if (value) set.add(value);
};

/** Derives the filter panel options from the unfiltered offerings. */
export function deriveFilterOptions(
  offerings: ProductOffering[],
  catalogs: Catalog[],
  lookups: Pick<FilterLookups, 'priceById' | 'specById'>,
): FilterOptions {
  const categorias = new Map<string, string>();
  const sets = {
    proveedores: new Set<string>(),
    priceTypes: new Set<string>(),
  };

  for (const o of offerings) {
    for (const ref of o.category ?? []) categorias.set(ref.id, ref.name ?? ref.id);
    for (const ref of o.productOfferingPrice ?? []) {
      addIf(sets.priceTypes, lookups.priceById.get(ref.id)?.priceType?.toLowerCase());
    }
    const facets = getSpecFacets(o, lookups.specById);
    addIf(sets.proveedores, facets.provider);
  }

  return {
    catalogos: catalogs.flatMap((c) => (c.id ? [{ id: c.id, name: c.name ?? c.id }] : [])),
    categorias: Array.from(categorias.entries()).map(([id, name]) => ({ id, name })),
    proveedores: sorted(sets.proveedores),
    priceTypes: sorted(sets.priceTypes),
  };
}
