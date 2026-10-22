import { describe, expect, it } from 'vitest';

import {
  deriveFilterOptions,
  filterOfferings,
  type OfferingFilters,
} from '@/lib/utils/filterOfferings';
import type {
  Catalog,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
} from '@/types/api';

// Fixtures

const NO_FILTERS: OfferingFilters = {
  searchTerm: '',
  statusFilters: [],
  catalogFilters: [],
  categoriaFilters: [],
  precioFilters: [],
  proveedorFilters: [],
  fechaFilter: '',
  formatoFilters: [],
  standardFilters: [],
  licenseFilters: [],
  qualityFilters: [],
};

const NOW = new Date();
const daysAgo = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const OFFERING_ONE: ProductOffering = {
  id: 'off1',
  name: 'Offering One',
  description: 'desc one about weather',
  lifecycleStatus: 'Active',
  lastUpdate: NOW.toISOString(),
  category: [{ id: 'cat1', name: 'Cat1' }],
  relatedParty: [{ id: 'p1', role: 'provider', name: 'Provider A', '@referredType': 'Organization' }],
  productOfferingPrice: [{ id: 'price1' }],
  productSpecification: { id: 'spec1', name: 'Spec1' },
};

const OFFERING_TWO: ProductOffering = {
  id: 'off2',
  name: 'Offering Two',
  description: 'second offering',
  lifecycleStatus: 'Retired',
  lastUpdate: daysAgo(100),
  category: [{ id: 'cat2', name: 'Cat2' }],
  relatedParty: [{ id: 'p2', role: 'provider', name: 'Provider B', '@referredType': 'Organization' }],
  productOfferingPrice: [{ id: 'price2' }],
  productSpecification: { id: 'spec2', name: 'Spec2' },
};

const OFFERING_NO_DATE: ProductOffering = {
  id: 'off3',
  name: 'Offering Three',
  lifecycleStatus: 'Active',
};

const SPEC_ONE: ProductSpecification = {
  id: 'spec1',
  brand: 'AcmeBrand',
  description: 'contains rain data',
  productSpecCharacteristic: [
    {
      id: 'datasetMetadata',
      productSpecCharacteristicValue: [
        {
          isDefault: true,
          value: { distributions: 'CSV', standard: 'ISO', license: 'MIT', quality: 'high' },
        },
      ],
    },
  ],
};

const SPEC_TWO: ProductSpecification = {
  id: 'spec2',
  productSpecCharacteristic: [
    { id: 'distributions', name: 'Formato', productSpecCharacteristicValue: [{ value: 'PDF' }] },
    { id: 'standard', productSpecCharacteristicValue: [{ value: 'DCAT' }] },
    { id: 'license', productSpecCharacteristicValue: [{ value: 'CC-BY' }] },
    { id: 'quality', productSpecCharacteristicValue: [{ value: 'medium' }] },
  ],
};

const PRICE_BY_ID = new Map<string, ProductOfferingPrice>([
  ['price1', { id: 'price1', priceType: 'usage' }],
  ['price2', { id: 'price2', priceType: 'recurring' }],
]);

const SPEC_BY_ID = new Map<string, ProductSpecification>([
  ['spec1', SPEC_ONE],
  ['spec2', SPEC_TWO],
]);

const CATALOG_CATEGORY_IDS_MAP = new Map<string, Set<string>>([
  ['catA', new Set(['cat1'])],
  ['catB', new Set(['cat2'])],
]);

const CATALOGS: Catalog[] = [
  { id: 'catA', name: 'Catalog A' },
  { id: 'catB', name: 'Catalog B' },
];

const OFFERINGS = [OFFERING_ONE, OFFERING_TWO, OFFERING_NO_DATE];

function filter(offerings: ProductOffering[], overrides: Partial<OfferingFilters>) {
  return filterOfferings(offerings, PRICE_BY_ID, SPEC_BY_ID, { ...NO_FILTERS, ...overrides }, CATALOG_CATEGORY_IDS_MAP);
}

// filterOfferings

describe('filterOfferings', () => {
  it('returns everything when no filters are set', () => {
    expect(filter(OFFERINGS, {})).toEqual(OFFERINGS);
  });

  it('returns an empty array for an empty offerings list', () => {
    expect(filter([], {})).toEqual([]);
  });

  it.each([
    ['the offering name', 'offering one', OFFERING_ONE],
    ['the offering description', 'weather', OFFERING_ONE],
    ['the linked spec brand', 'acmebrand', OFFERING_ONE],
    ['the linked spec description', 'rain', OFFERING_ONE],
    ['a characteristic name', 'formato', OFFERING_TWO],
    ['a characteristic string value', 'dcat', OFFERING_TWO],
    ['an object-valued characteristic (datasetMetadata)', 'csv', OFFERING_ONE],
  ])('matches searchTerm against %s', (_label, searchTerm, expected) => {
    expect(filter(OFFERINGS, { searchTerm })).toEqual([expected]);
  });

  it.each(['&', '#', '%', '+', '"', "'", '/', '(', ')', '*', '.*', '[', '\\', '日本', 'ñ'])(
    'treats %j in searchTerm as literal text, never as syntax',
    (term) => {
      const special: ProductOffering = {
        ...OFFERING_ONE,
        id: 'special',
        name: `Datos ${term} especiales`,
        description: undefined,
        productSpecification: undefined,
      };
      expect(filter([special], { searchTerm: term })).toEqual([special]);
      expect(filter([OFFERING_ONE], { searchTerm: term })).toEqual([]);
    },
  );

  it('returns no matches when searchTerm matches nothing', () => {
    expect(filter(OFFERINGS, { searchTerm: 'nonexistent-term' })).toEqual([]);
  });

  it('filters by statusFilters against lifecycleStatus', () => {
    const result = filter(OFFERINGS, { statusFilters: ['Retired'] });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('filters by catalogFilters through catalogCategoryIdsMap', () => {
    const result = filter(OFFERINGS, { catalogFilters: ['catA'] });
    expect(result).toEqual([OFFERING_ONE]);
  });

  it('filters by categoriaFilters directly against category ids', () => {
    const result = filter(OFFERINGS, { categoriaFilters: ['cat2'] });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('filters by precioFilters against the resolved priceType', () => {
    const result = filter(OFFERINGS, { precioFilters: ['usage'] });
    expect(result).toEqual([OFFERING_ONE]);
  });

  it('filters by proveedorFilters against provider relatedParty name', () => {
    const result = filter(OFFERINGS, { proveedorFilters: ['Provider B'] });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('filters by formatoFilters using combined datasetMetadata characteristic', () => {
    const result = filter(OFFERINGS, { formatoFilters: ['CSV'] });
    expect(result).toEqual([OFFERING_ONE]);
  });

  it('filters by standardFilters using legacy per-field characteristics', () => {
    const result = filter(OFFERINGS, { standardFilters: ['DCAT'] });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('filters by licenseFilters', () => {
    const result = filter(OFFERINGS, { licenseFilters: ['MIT'] });
    expect(result).toEqual([OFFERING_ONE]);
  });

  it('filters by qualityFilters', () => {
    const result = filter(OFFERINGS, { qualityFilters: ['medium'] });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('excludes offerings whose spec is not found in specById', () => {
    const result = filter(OFFERINGS, { formatoFilters: ['CSV'] });
    expect(result).not.toContain(OFFERING_NO_DATE);
  });

  it('matches fechaFilter "today" for an offering updated just now', () => {
    const result = filter(OFFERINGS, { fechaFilter: 'today' });
    expect(result).toEqual([OFFERING_ONE]);
  });

  it('matches fechaFilter "90d" but not "7d" for an offering updated 100 days ago', () => {
    expect(filter(OFFERINGS, { fechaFilter: '90d' })).toEqual([OFFERING_ONE]);
    expect(filter(OFFERINGS, { fechaFilter: '7d' })).toEqual([OFFERING_ONE]);
  });

  it('matches fechaFilter "older" for an offering updated more than 90 days ago', () => {
    const result = filter(OFFERINGS, { fechaFilter: 'older' });
    expect(result).toEqual([OFFERING_TWO]);
  });

  it('excludes offerings with no lastUpdate when a fechaFilter is set', () => {
    const result = filter(OFFERINGS, { fechaFilter: 'today' });
    expect(result).not.toContain(OFFERING_NO_DATE);
  });

  it('combines multiple filter dimensions with AND semantics', () => {
    const result = filter(OFFERINGS, {
      statusFilters: ['Active'],
      precioFilters: ['usage'],
      formatoFilters: ['CSV'],
    });
    expect(result).toEqual([OFFERING_ONE]);
  });
});

// deriveFilterOptions

describe('deriveFilterOptions', () => {
  it('derives catalogos from the catalogs list regardless of offerings', () => {
    const options = deriveFilterOptions([], PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.catalogos).toEqual([
      { id: 'catA', name: 'Catalog A' },
      { id: 'catB', name: 'Catalog B' },
    ]);
  });

  it('skips catalogs without an id', () => {
    const catalogs: Catalog[] = [...CATALOGS, { name: 'No id catalog' }];
    const options = deriveFilterOptions([], PRICE_BY_ID, catalogs, SPEC_BY_ID);
    expect(options.catalogos).toHaveLength(2);
  });

  it('falls back to the id as name when a catalog has no name', () => {
    const options = deriveFilterOptions([], PRICE_BY_ID, [{ id: 'catC' }], SPEC_BY_ID);
    expect(options.catalogos).toEqual([{ id: 'catC', name: 'catC' }]);
  });

  it('derives categorias only from offerings actually present', () => {
    const options = deriveFilterOptions(OFFERINGS, PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.categorias).toEqual(
      expect.arrayContaining([
        { id: 'cat1', name: 'Cat1' },
        { id: 'cat2', name: 'Cat2' },
      ]),
    );
    expect(options.categorias).toHaveLength(2);
  });

  it('derives sorted, deduplicated proveedores from provider relatedParty entries', () => {
    const options = deriveFilterOptions(OFFERINGS, PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.proveedores).toEqual(['Provider A', 'Provider B']);
  });

  it('derives sorted priceTypes from resolved productOfferingPrice refs', () => {
    const options = deriveFilterOptions(OFFERINGS, PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.priceTypes).toEqual(['recurring', 'usage']);
  });

  it('derives sorted formatos/standards/licenses/qualities from spec metadata', () => {
    const options = deriveFilterOptions(OFFERINGS, PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.formatos).toEqual(['CSV', 'PDF']);
    expect(options.standards).toEqual(['DCAT', 'ISO']);
    expect(options.licenses).toEqual(['CC-BY', 'MIT']);
    expect(options.qualities).toEqual(['high', 'medium']);
  });

  it('returns empty derived collections for an empty offerings list', () => {
    const options = deriveFilterOptions([], PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.categorias).toEqual([]);
    expect(options.proveedores).toEqual([]);
    expect(options.priceTypes).toEqual([]);
    expect(options.formatos).toEqual([]);
    expect(options.standards).toEqual([]);
    expect(options.licenses).toEqual([]);
    expect(options.qualities).toEqual([]);
  });

  it('ignores relatedParty entries without a role of provider or without a name', () => {
    const offering: ProductOffering = {
      ...OFFERING_ONE,
      relatedParty: [
        { id: 'x1', role: 'buyer', name: 'Buyer X', '@referredType': 'Organization' },
        { id: 'x2', role: 'provider', '@referredType': 'Organization' },
      ],
    };
    const options = deriveFilterOptions([offering], PRICE_BY_ID, CATALOGS, SPEC_BY_ID);
    expect(options.proveedores).toEqual([]);
  });
});
