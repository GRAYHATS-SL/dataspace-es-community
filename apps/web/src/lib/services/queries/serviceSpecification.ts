'use server';

import type { NewServiceSpecification, ServiceSpecification } from '@/types/api';

import { apiFetch, apiFetchVoid, withLimit } from './_utils';

const BASE = '/tmf-api/serviceCatalogManagement/v4/serviceSpecification';

/** Lists service specifications. */
export async function getServiceSpecifications(): Promise<ServiceSpecification[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<ServiceSpecification[]>(withLimit(BASE));
}

/** Fetches a single service specification by id. */
export async function getServiceSpecificationById(id: string): Promise<ServiceSpecification> {
  // Here you define your business logic.
  return apiFetch<ServiceSpecification>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates a service specification. */
export async function createServiceSpecification(input: Partial<NewServiceSpecification>): Promise<ServiceSpecification> {
  // Here you define your business logic (default values, owner party, characteristics...).
  return apiFetch<ServiceSpecification>(BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Partially updates a service specification. */
export async function patchServiceSpecification(id: string, payload: Partial<NewServiceSpecification>): Promise<ServiceSpecification> {
  // Here you define your business logic.
  return apiFetch<ServiceSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Publishes a service specification (`lifecycleStatus` → `Launched`). */
export async function publishServiceSpecification(id: string): Promise<ServiceSpecification> {
  // Here you define your business logic (pre-publish checks...).
  return apiFetch<ServiceSpecification>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ lifecycleStatus: 'Launched' }),
  });
}

/** Deletes a service specification. */
export async function deleteServiceSpecification(id: string): Promise<void> {
  // Here you define your business logic (dependency checks...).
  return apiFetchVoid(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
