'use server';

import type { Agreement, NewAgreement } from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/agreementManagement/v4/agreement';

/** Lists agreements. */
export async function fetchAgreements(): Promise<Agreement[]> {
  // Here you define your business logic (scoping, filtering, sorting...).
  return apiFetch<Agreement[]>(withLimit(BASE));
}

/** Fetches a single agreement by id. */
export async function fetchAgreementById(id: string): Promise<Agreement> {
  // Here you define your business logic.
  return apiFetch<Agreement>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates an agreement. */
export async function createAgreement(payload: NewAgreement): Promise<Agreement> {
  // Here you define your business logic (engaged parties, default status...).
  return apiFetch<Agreement>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Updates the status of an agreement. */
export async function updateAgreementStatus(id: string, status: string): Promise<Agreement> {
  // Here you define your business logic (allowed status transitions...).
  return apiFetch<Agreement>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
