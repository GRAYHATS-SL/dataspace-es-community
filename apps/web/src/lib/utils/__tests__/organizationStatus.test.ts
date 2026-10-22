import { describe, expect, it } from 'vitest';

import {
  filterOfferingsByActiveProvider,
  getClosedOrganizationIds,
  getSpecProviderId,
  isOrganizationActive,
  isProviderClosed,
} from '@/lib/utils/organizationStatus';
import type { Organization, ProductOffering, ProductSpecification } from '@/types/api';

const spec = (providerId?: string, role = 'provider') =>
  ({ relatedParty: providerId ? [{ id: providerId, role }] : [] }) as ProductSpecification;
const offering = (id: string, specId?: string) =>
  ({ id, productSpecification: specId ? { id: specId } : undefined }) as ProductOffering;

describe('isOrganizationActive', () => {
  it.each([undefined, 'initialized', 'validated'] as const)('%s es activa', (status) => {
    expect(isOrganizationActive({ status })).toBe(true);
  });

  it('closed no es activa', () => {
    expect(isOrganizationActive({ status: 'closed' })).toBe(false);
  });
});

describe('getSpecProviderId', () => {
  it('prefiere el relatedParty con role provider (insensible a mayúsculas)', () => {
    const s = {
      relatedParty: [
        { id: 'other', role: 'owner' },
        { id: 'prov', role: 'Provider' },
      ],
    } as ProductSpecification;
    expect(getSpecProviderId(s)).toBe('prov');
  });

  it('cae al primer relatedParty y devuelve undefined sin partes', () => {
    expect(getSpecProviderId(spec('first', 'owner'))).toBe('first');
    expect(getSpecProviderId(spec())).toBeUndefined();
    expect(getSpecProviderId(undefined)).toBeUndefined();
  });
});

describe('getClosedOrganizationIds', () => {
  it('solo incluye las organizaciones closed con id', () => {
    const orgs = [
      { id: 'a', status: 'closed' },
      { id: 'b', status: 'validated' },
      { id: 'c' },
      { status: 'closed' },
    ] as Organization[];
    expect([...getClosedOrganizationIds(orgs)]).toEqual(['a']);
  });
});

describe('isProviderClosed', () => {
  it('detecta proveedor cerrado y tolera especificación o proveedor ausentes', () => {
    const closed = new Set(['a']);
    expect(isProviderClosed(spec('a'), closed)).toBe(true);
    expect(isProviderClosed(spec('b'), closed)).toBe(false);
    expect(isProviderClosed(spec(), closed)).toBe(false);
    expect(isProviderClosed(undefined, closed)).toBe(false);
  });
});

describe('filterOfferingsByActiveProvider', () => {
  const specs = new Map([
    ['s-closed', spec('a')],
    ['s-ok', spec('b')],
  ]);
  const offerings = [
    offering('o1', 's-closed'),
    offering('o2', 's-ok'),
    offering('o3'),
    offering('o4', 's-unknown'),
  ];

  it('descarta solo las ofertas de proveedores cerrados', () => {
    const result = filterOfferingsByActiveProvider(offerings, specs, new Set(['a']));
    expect(result.map((o) => o.id)).toEqual(['o2', 'o3', 'o4']);
  });

  it('sin organizaciones cerradas devuelve todas', () => {
    expect(filterOfferingsByActiveProvider(offerings, specs, new Set())).toHaveLength(4);
  });
});
