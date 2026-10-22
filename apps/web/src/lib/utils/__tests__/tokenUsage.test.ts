import { describe, expect, it } from 'vitest';

import { deriveTokenConsumption, extractTokenLimits } from '../tokenUsage';

describe('extractTokenLimits', () => {
  it('returns undefined when the product has no tokenLimits characteristic', () => {
    expect(extractTokenLimits(undefined)).toBeUndefined();
    expect(extractTokenLimits({ productCharacteristic: [] })).toBeUndefined();
  });

  it('reads maxRequests/maxTransferTB from the tokenLimits characteristic', () => {
    const product = {
      productCharacteristic: [
        { id: 'tokenLimits', name: 'x', value: { maxRequests: 1000, maxTransferTB: 5 } },
      ],
    };
    expect(extractTokenLimits(product)).toEqual({ maxRequests: 1000, maxTransferTB: 5 });
  });

  it('ignores other characteristics', () => {
    const product = {
      productCharacteristic: [{ id: 'other', name: 'x', value: { foo: 'bar' } }],
    };
    expect(extractTokenLimits(product)).toBeUndefined();
  });
});

describe('deriveTokenConsumption', () => {
  it('returns zeros with no usage records', () => {
    expect(deriveTokenConsumption([])).toEqual({ usedRequests: 0, usedTransferTB: 0 });
  });

  it('sums the requests/transferTB usageCharacteristic across records', () => {
    const usages = [
      { usageCharacteristic: [{ name: 'requests', value: 100 }, { name: 'transferTB', value: 0.5 }] },
      { usageCharacteristic: [{ name: 'requests', value: 50 }] },
    ];
    expect(deriveTokenConsumption(usages)).toEqual({ usedRequests: 150, usedTransferTB: 0.5 });
  });

  it('ignores non-numeric or missing characteristic values', () => {
    const usages = [{ usageCharacteristic: [{ name: 'requests', value: 'not-a-number' }] }, {}];
    expect(deriveTokenConsumption(usages)).toEqual({ usedRequests: 0, usedTransferTB: 0 });
  });
});
