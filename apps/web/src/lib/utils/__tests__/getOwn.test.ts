import { describe, expect, it } from 'vitest';

import { getOwn } from '@/lib/utils/getOwn';

describe('getOwn', () => {
  const record = { a: 1, b: 2 };

  it('returns own properties', () => {
    expect(getOwn(record, 'a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    expect(getOwn(record, 'z')).toBeUndefined();
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'does not expose inherited property %s',
    (key) => {
      expect(getOwn(record, key)).toBeUndefined();
    },
  );
});
