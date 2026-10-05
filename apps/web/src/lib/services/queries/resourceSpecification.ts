'use server';

import type { NewResourceSpecification, ResourceSpecification } from '@/types/api';

import { apiFetch, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/resourceCatalog/v4/resourceSpecification';

/** Lists resource specifications. */
export async function getResourceSpecifications(): Promise<ResourceSpecification[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ResourceSpecification[]>(withLimit(BASE));
}

/** Fetches a single resource specification by id. */
export async function getResourceSpecificationById(id: string): Promise<ResourceSpecification> {
  // Here you define your business logic.
  return apiFetch<ResourceSpecification>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates a resource specification. */
export async function createResourceSpecification(input: Partial<NewResourceSpecification>): Promise<ResourceSpecification> {
  // Here you define your business logic (default values, owner party, characteristics...).
  return apiFetch<ResourceSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Partially updates a resource specification. */
export async function patchResourceSpecification(id: string, payload: Partial<NewResourceSpecification>): Promise<ResourceSpecification> {
  // Here you define your business logic.
  return apiFetch<ResourceSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Publishes a resource specification (`lifecycleStatus` → `Launched`). */
export async function publishResourceSpecification(id: string): Promise<ResourceSpecification> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<ResourceSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Deletes a resource specification. */
export async function deleteResourceSpecification(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
