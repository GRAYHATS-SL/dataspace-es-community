'use server';

import type { Usage } from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/usageManagement/v4/usage';

/** Lists usage records. */
export async function fetchUsages(): Promise<Usage[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<Usage[]>(withLimit(BASE));
}

/** Lists the usage records of a product. */
export async function getUsagesByProduct(productId: string): Promise<Usage[]> {
  const usages = await apiFetch<Usage[]>(withLimit(BASE));
  // Here you define your business logic (how usages are matched to the product).
  return usages.filter((u) => u.ratedProductUsage?.some((r) => r.productRef?.id === productId));
}
