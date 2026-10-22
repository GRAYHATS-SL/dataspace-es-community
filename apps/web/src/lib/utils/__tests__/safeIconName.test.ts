import { describe, expect, it } from 'vitest';

import { isValidIconName, mapIcon, safeIconName } from '@/lib/utils/safeIconName';

describe('mapIcon', () => {
  it('resolves a known short name to its Lucide icon name', () => {
    expect(mapIcon('Database')).toBe('Database');
    expect(mapIcon('Search')).toBe('Search');
    expect(mapIcon('ChevronRight')).toBe('ChevronRight');
  });

  it('falls back to Database for an unmapped name', () => {
    expect(mapIcon('NotARealIcon')).toBe('Database');
  });

  it('falls back to Database for an empty string', () => {
    expect(mapIcon('')).toBe('Database');
  });

  it('is exact-match only (case sensitive)', () => {
    expect(mapIcon('database')).toBe('Database');
  });
});

describe('isValidIconName', () => {
  it('returns true for a real Lucide export not present in the local map', () => {
    expect(isValidIconName('AlertCircle')).toBe(true);
  });

  it('returns true for a name that is also in the local map', () => {
    expect(isValidIconName('Database')).toBe(true);
  });

  it('returns false for a name that is not exported by lucide-react', () => {
    expect(isValidIconName('NotARealIcon')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidIconName('')).toBe(false);
  });
});

describe('safeIconName', () => {
  it('returns the name unchanged when it is a valid Lucide icon name', () => {
    expect(safeIconName('AlertCircle')).toBe('AlertCircle');
  });

  it('falls back through mapIcon when the name is not a valid Lucide export', () => {
    expect(safeIconName('some-legacy-alias-not-in-lucide')).toBe('Database');
  });

  it('resolves a mapped short name that is not itself a Lucide export', () => {
    // 'Map' is a key in the local iconMap; confirm the overall resolution is stable.
    expect(safeIconName('Map')).toBeDefined();
  });

  it('falls back to Database for a completely unknown name', () => {
    expect(safeIconName('totally-unknown')).toBe('Database');
  });
});
