import { describe, expect, it } from 'vitest';

import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';
import type { Characteristic } from '@/types/api';

describe('getLatestCharacteristicValue', () => {
  it('returns undefined when characteristics is undefined', () => {
    expect(getLatestCharacteristicValue(undefined, 'stripeConnectAccountId')).toBeUndefined();
  });

  it('returns undefined when characteristics is an empty array', () => {
    expect(getLatestCharacteristicValue([], 'stripeConnectAccountId')).toBeUndefined();
  });

  it('returns undefined when no characteristic matches the name', () => {
    const chars: Characteristic[] = [{ name: 'otherField', value: 'x' }];
    expect(getLatestCharacteristicValue(chars, 'stripeConnectAccountId')).toBeUndefined();
  });

  it('returns the value of the single matching characteristic', () => {
    const chars: Characteristic[] = [{ name: 'stripeConnectAccountId', value: 'acct_123' }];
    expect(getLatestCharacteristicValue(chars, 'stripeConnectAccountId')).toBe('acct_123');
  });

  it('returns the last matching value when the backend has accumulated duplicates', () => {
    const chars: Characteristic[] = [
      { name: 'stripeConnectAccountId', value: 'acct_old' },
      { name: 'otherField', value: 'noop' },
      { name: 'stripeConnectAccountId', value: 'acct_new' },
    ];
    expect(getLatestCharacteristicValue(chars, 'stripeConnectAccountId')).toBe('acct_new');
  });

  it('supports non-string values (boolean/number/object)', () => {
    const chars: Characteristic[] = [
      { name: 'stripePayoutsEnabled', value: false },
      { name: 'stripePayoutsEnabled', value: true },
    ];
    expect(getLatestCharacteristicValue(chars, 'stripePayoutsEnabled')).toBe(true);
  });

  it('does not mutate the original characteristics array', () => {
    const chars: Characteristic[] = [
      { name: 'a', value: '1' },
      { name: 'a', value: '2' },
    ];
    const copy = [...chars];
    getLatestCharacteristicValue(chars, 'a');
    expect(chars).toEqual(copy);
  });
});
