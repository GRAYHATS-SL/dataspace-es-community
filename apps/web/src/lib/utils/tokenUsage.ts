import type { ProductInventory, Usage } from '@/types/api';

export const TOKEN_LIMITS_CHAR_ID = 'tokenLimits';

export interface TokenLimits {
  maxRequests: number;
  maxTransferTB: number;
}

/** Reads the limits frozen in the `Product` at token purchase. */
export const extractTokenLimits = (
  product: ProductInventory | undefined,
): TokenLimits | undefined => {
  const char = product?.productCharacteristic?.find((c) => c.id === TOKEN_LIMITS_CHAR_ID);
  const value = char?.value;
  return value && typeof value === 'object' ? (value as unknown as TokenLimits) : undefined;
};

export interface TokenConsumption {
  usedRequests: number;
  usedTransferTB: number;
}

const sumUsageCharacteristic = (usages: Usage[], name: string): number =>
  usages.reduce((sum, u) => {
    const value = u.usageCharacteristic?.find((c) => c.name === name)?.value;
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);

/** Sums the usage (requests/TB) of the TMF635 records of a token. */
export const deriveTokenConsumption = (usages: Usage[]): TokenConsumption => ({
  usedRequests: sumUsageCharacteristic(usages, 'requests'),
  usedTransferTB: sumUsageCharacteristic(usages, 'transferTB'),
});
