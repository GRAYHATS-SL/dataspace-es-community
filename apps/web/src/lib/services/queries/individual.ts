'use server';

import type { Individual, NewIndividual } from '@/types/api';

import { apiFetch, withLimit } from './_utils';

const BASE = '/tmf-api/party/v4/individual';

/** Lists individuals; an explicit `accessToken` overrides the session token. */
export async function fetchIndividuals(accessToken?: string): Promise<Individual[]> {
  // Here you define your business logic (scoping, filtering...).
  return apiFetch<Individual[]>(withLimit(BASE), undefined, accessToken);
}

/** Fetches a single individual by id. */
export async function fetchIndividualById(id: string): Promise<Individual> {
  // Here you define your business logic.
  return apiFetch<Individual>(`${BASE}/${encodeURIComponent(id)}`);
}

/** Creates an individual; an explicit `accessToken` overrides the session token. */
export async function createIndividual(
  body: NewIndividual,
  accessToken?: string,
): Promise<Individual> {
  // Here you define your business logic (default values...).
  return apiFetch<Individual>(
    BASE,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    accessToken,
  );
}

/** Partially updates an individual. */
export async function patchIndividual(
  id: string,
  body: Partial<NewIndividual>,
): Promise<Individual> {
  // Here you define your business logic.
  return apiFetch<Individual>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
