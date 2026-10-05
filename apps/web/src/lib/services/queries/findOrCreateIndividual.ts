'use server';

import type { Individual, NewIndividual } from '@/types/api';

import { createIndividual } from './individual';

/** Input of `findOrCreateIndividual`. */
export interface FindOrCreateIndividualInput {
  email: string;
  organizationId: string;
  fullName?: string;
  familyName?: string;
  givenName?: string;
  accessToken?: string;
}

/** Returns the individual matching the given user data, creating it when it does not exist. */
export async function findOrCreateIndividual(
  input: FindOrCreateIndividualInput,
): Promise<Individual> {
  // Here you define your business logic (look up an existing individual before creating one).
  const newIndividual: NewIndividual = {
    fullName: input.fullName ?? input.email,
    givenName: input.givenName,
    familyName: input.familyName,
    contactMedium: [{ mediumType: 'email', characteristic: { emailAddress: input.email } }],
  };
  return createIndividual(newIndividual, input.accessToken);
}
