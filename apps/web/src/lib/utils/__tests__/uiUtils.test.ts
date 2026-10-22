import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils/cn';
import { filterDatasets } from '@/lib/utils/datasets';
import { formatDate } from '@/lib/utils/formatDate';
import { getCountryName } from '@/lib/utils/getCountryName';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { isValidIconName, mapIcon, safeIconName } from '@/lib/utils/safeIconName';
import type { CatalogDataset } from '@/types/data';

// cn
describe('cn', () => {
  it('joins class names into a single string', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts keeping the last value', () => {
    // tailwind-merge keeps the last conflicting utility
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('omits falsy values', () => {
    expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar');
  });

  it('resolves object syntax, including only keys with truthy values', () => {
    expect(cn({ 'text-red': true, 'text-blue': false })).toBe('text-red');
  });

  it('resolves array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});

// formatDate
describe('formatDate', () => {
  it('formats a valid ISO date string in Spanish locale', () => {
    const result = formatDate('2024-03-15T00:00:00.000Z');
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/mar/);
  });

  it('returns "-" when date is undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('returns "-" for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });
});

// getCountryName
describe('getCountryName', () => {
  it('returns the Spanish display name for a valid ISO 3166-1 alpha-2 code', () => {
    const name = getCountryName('ES');
    expect(typeof name).toBe('string');
    expect(name).not.toBe('ES');
  });

  it('returns the original code as fallback for an invalid region code', () => {
    expect(getCountryName('XX')).toBe('XX');
  });

  it('is case-insensitive (lowercased input is accepted)', () => {
    const upper = getCountryName('FR');
    const lower = getCountryName('fr');
    expect(upper).toBe(lower);
  });

  it('returns the original code when Intl throws (malformed code like single char)', () => {
    // Single-character codes are not valid region tags — Intl.DisplayNames.of() throws RangeError
    expect(getCountryName('A')).toBe('A');
  });
});

// mapIcon / isValidIconName
describe('mapIcon', () => {
  it('returns the matching Lucide icon name for a known key', () => {
    expect(mapIcon('Database')).toBe('Database');
  });

  it('returns the default icon ("Database") for an unknown name', () => {
    expect(mapIcon('icono-inexistente')).toBe('Database');
  });
});

describe('isValidIconName', () => {
  it('returns true for a name that exists in the Lucide registry', () => {
    expect(isValidIconName('Database')).toBe(true);
  });

  it('returns false for a name that does not exist in the Lucide registry', () => {
    expect(isValidIconName('not-an-icon')).toBe(false);
  });
});

describe('safeIconName', () => {
  it('returns the icon name directly when it is a valid Lucide icon', () => {
    expect(safeIconName('Database')).toBe('Database');
  });

  it('returns the default fallback icon when the name is not in the Lucide registry', () => {
    expect(safeIconName('totally-unknown-icon')).toBe('Database');
  });
});

// getErrorMessage
describe('getErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(getErrorMessage(new Error('HTTP 409: conflict'))).toBe('HTTP 409: conflict');
  });

  it('returns a generic fallback for non-Error values', () => {
    expect(getErrorMessage('some string')).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });

  it('returns the generic fallback for an Error with an empty message', () => {
    expect(getErrorMessage(new Error(''))).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });
});

// filterDatasets
const makeDataset = (overrides: Partial<CatalogDataset> = {}): CatalogDataset => ({
  id: '1',
  title: 'Air Quality Data',
  description: 'Sensor measurements from the city',
  categories: [],
  publisher: 'City Hall',
  license: 'MIT',
  modified: '',
  published: '',
  distribution: 'JSON',
  quality: '',
  standard: '',
  icon: '',
  ...overrides,
});

describe('filterDatasets', () => {
  it('returns all items when searchTerm is empty and no distribution filters', () => {
    const items = [makeDataset({ id: '1' }), makeDataset({ id: '2' })];
    expect(filterDatasets(items, '', [])).toHaveLength(2);
  });

  it('excludes items that have no distribution field', () => {
    const items = [makeDataset({ distribution: '' }), makeDataset()];
    // Empty string distribution is falsy — filtered out
    expect(filterDatasets(items, '', [])).toHaveLength(1);
  });

  it('filters by title (case-insensitive)', () => {
    const items = [makeDataset({ title: 'Air Quality' }), makeDataset({ title: 'Water Level' })];
    expect(filterDatasets(items, 'air', [])).toHaveLength(1);
    expect(filterDatasets(items, 'AIR', [])).toHaveLength(1);
  });

  it('filters by description (case-insensitive)', () => {
    const items = [
      makeDataset({ description: 'Sensor data' }),
      makeDataset({ description: 'Traffic counts' }),
    ];
    expect(filterDatasets(items, 'sensor', [])).toHaveLength(1);
  });

  it('filters by distribution format', () => {
    const items = [makeDataset({ distribution: 'JSON' }), makeDataset({ distribution: 'CSV' })];
    expect(filterDatasets(items, '', ['json'])).toHaveLength(1);
  });

  it('normalizes REST API distribution variants', () => {
    const items = [makeDataset({ distribution: 'REST API' }), makeDataset({ distribution: 'CSV' })];
    expect(filterDatasets(items, '', ['rest'])).toHaveLength(1);
  });

  it('returns the intersection when both text and distribution filters are active', () => {
    const items = [
      makeDataset({ title: 'Air JSON', distribution: 'JSON' }),
      makeDataset({ title: 'Water JSON', distribution: 'JSON' }),
      makeDataset({ title: 'Air CSV', distribution: 'CSV' }),
    ];
    expect(filterDatasets(items, 'air', ['json'])).toHaveLength(1);
  });

  it('returns empty array when no items match the search term', () => {
    const items = [makeDataset({ title: 'Air Quality' })];
    expect(filterDatasets(items, 'zzznotfound', [])).toHaveLength(0);
  });

  it('matches any of multiple distribution filters (OR across filters)', () => {
    const items = [
      makeDataset({ id: '1', distribution: 'CSV' }),
      makeDataset({ id: '2', distribution: 'JSON' }),
      makeDataset({ id: '3', distribution: 'XML' }),
    ];
    const result = filterDatasets(items, '', ['csv', 'json']);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id).sort()).toEqual(['1', '2']);
  });

  it('filters by publisher (case-insensitive)', () => {
    const items = [
      makeDataset({ publisher: 'City Hall' }),
      makeDataset({ publisher: 'Water Authority' }),
    ];
    expect(filterDatasets(items, 'city hall', [])).toHaveLength(1);
  });
});
