import { describe, expect, it } from 'vitest';

import { getIdentification } from '@/lib/utils/organizationIdentification';
import type { Organization } from '@/types/api';

type OrganizationIdentification = NonNullable<Organization['organizationIdentification']>[number];

describe('getIdentification', () => {
  it('returns undefined when identifications is undefined', () => {
    expect(getIdentification(undefined, 'CIF')).toBeUndefined();
  });

  it('returns undefined when identifications is an empty array', () => {
    expect(getIdentification([], 'CIF')).toBeUndefined();
  });

  it('returns undefined when no identification matches the type', () => {
    const identifications: OrganizationIdentification[] = [
      { identificationType: 'DUNS', identificationId: '123456789' },
    ];
    expect(getIdentification(identifications, 'CIF')).toBeUndefined();
  });

  it('returns the single matching identification', () => {
    const identifications: OrganizationIdentification[] = [
      { identificationType: 'CIF', identificationId: 'B12345678' },
    ];
    expect(getIdentification(identifications, 'CIF')).toEqual(identifications[0]);
  });

  it('returns the last matching value when the backend has accumulated duplicates', () => {
    const identifications: OrganizationIdentification[] = [
      { identificationType: 'CIF', identificationId: 'B00000000' },
      { identificationType: 'DUNS', identificationId: 'noop' },
      { identificationType: 'CIF', identificationId: 'B12345678' },
    ];
    expect(getIdentification(identifications, 'CIF')?.identificationId).toBe('B12345678');
  });

  it('does not mutate the original identifications array', () => {
    const identifications: OrganizationIdentification[] = [
      { identificationType: 'CIF', identificationId: 'B00000000' },
      { identificationType: 'CIF', identificationId: 'B12345678' },
    ];
    const copy = [...identifications];
    getIdentification(identifications, 'CIF');
    expect(identifications).toEqual(copy);
  });
});
