// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMarketplaceFeePercent } from '@/lib/constants/payments';

afterEach(() => vi.unstubAllEnvs());

describe('getMarketplaceFeePercent', () => {
  it.each([
    ['not set', undefined],
    ['empty', ''],
    ['"0"', '0'],
    ['negative', '-5'],
    ['not numeric', 'abc'],
  ])('returns 0 when MARKETPLACE_FEE_PERCENT is %s', (_label, value) => {
    vi.stubEnv('MARKETPLACE_FEE_PERCENT', value);
    expect(getMarketplaceFeePercent()).toBe(0);
  });

  it('returns the parsed value for a valid integer percent', () => {
    vi.stubEnv('MARKETPLACE_FEE_PERCENT', '5');
    expect(getMarketplaceFeePercent()).toBe(5);
  });

  it('returns the parsed value for a valid decimal percent', () => {
    vi.stubEnv('MARKETPLACE_FEE_PERCENT', '2.5');
    expect(getMarketplaceFeePercent()).toBe(2.5);
  });
});
