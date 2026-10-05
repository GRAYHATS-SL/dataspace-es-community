import type { ProductInventory, Usage } from '@/types/api';

import type { ProductRole } from './constants';

/** Access limits attached to a product. */
export interface TokenLimits {
  maxRequests: number;
  maxTransferTB: number;
}

/** Consumption accumulated by a product. */
export interface TokenConsumption {
  usedRequests: number;
  usedTransferTB: number;
}

/** Name (or id) of the party playing `role` in a product. */
export function getPartyName(product: ProductInventory, role: ProductRole): string {
  const party = product.relatedParty?.find((p) => p.role?.toLowerCase() === role);
  return party?.name ?? party?.id ?? '—';
}

/** Keeps the products in which the current user plays `role`. */
export function filterProductsByRole(
  products: ProductInventory[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _role: ProductRole,
): ProductInventory[] {
  // Here you define your business logic (which products belong to the current user per role).
  return products;
}

/** Reads the access limits of a product, if it has any. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractTokenLimits(_product: ProductInventory): TokenLimits | undefined {
  // Here you define your business logic (where access limits are stored in the product).
  return undefined;
}

/** Sums the consumption of a product from its usage records. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function deriveTokenConsumption(_usages: Usage[]): TokenConsumption {
  // Here you define your business logic (usage characteristics that count as consumption).
  return { usedRequests: 0, usedTransferTB: 0 };
}
