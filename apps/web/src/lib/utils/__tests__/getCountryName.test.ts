import { describe, expect, it } from 'vitest';

import { getCountryName } from '@/lib/utils/getCountryName';

describe('getCountryName', () => {
  it('resolves a valid ISO alpha-2 code to its Spanish name', () => {
    expect(getCountryName('ES')).toBe('España');
  });

  it('is case-insensitive', () => {
    expect(getCountryName('es')).toBe('España');
    expect(getCountryName('Us')).toBe('Estados Unidos');
  });

  it('returns the original code when Intl.DisplayNames throws (invalid code)', () => {
    expect(getCountryName('not-a-code')).toBe('not-a-code');
  });

  it('returns the original code for an empty string', () => {
    expect(getCountryName('')).toBe('');
  });
});
