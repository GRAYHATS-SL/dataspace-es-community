import { describe, expect, it } from 'vitest';

import { extractUserProfile } from '@/lib/utils/extractUserProfile';

const BASE_SUB = 'did:key:z6MkTest';

describe('extractUserProfile', () => {
  it('returns null when sub is missing', () => {
    expect(extractUserProfile({})).toBeNull();
    expect(extractUserProfile({ name: 'Alice' })).toBeNull();
  });

  it('extracts profile from verifiableCredential[0].credentialSubject', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [
        {
          credentialSubject: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@example.com',
            organizationName: 'Acme Corp',
          },
        },
      ],
    });

    expect(profile).not.toBeNull();
    expect(profile?.sub).toBe(BASE_SUB);
    expect(profile?.firstName).toBe('Alice');
    expect(profile?.lastName).toBe('Smith');
    expect(profile?.email).toBe('alice@example.com');
    expect(profile?.name).toBe('Alice Smith');
    expect(profile?.organization).toBe('Acme Corp');
  });

  it('falls back to root payload when there is no verifiableCredential', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
    });

    expect(profile?.firstName).toBe('Bob');
    expect(profile?.lastName).toBe('Jones');
    expect(profile?.email).toBe('bob@example.com');
  });

  it('uses givenName / familyName aliases from credentialSubject', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { givenName: 'Carol', familyName: 'White' } }],
    });

    expect(profile?.firstName).toBe('Carol');
    expect(profile?.lastName).toBe('White');
    expect(profile?.name).toBe('Carol White');
  });

  it('uses sub as name fallback when no first or last name is found', () => {
    const profile = extractUserProfile({ sub: BASE_SUB });
    expect(profile?.name).toBe(BASE_SUB);
  });

  it('uses legalName as organization fallback when organizationName is absent', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { legalName: 'Legal Corp S.L.' } }],
    });
    expect(profile?.organization).toBe('Legal Corp S.L.');
  });

  it('returns empty string for organization when neither organizationName nor legalName exist', () => {
    const profile = extractUserProfile({ sub: BASE_SUB });
    expect(profile?.organization).toBe('');
  });

  it('collects roles array from credentialSubject', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { roles: ['admin', 'seller'] } }],
    });
    expect(profile?.roles).toEqual(['admin', 'seller']);
  });

  it('wraps a single string role in an array', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { role: 'buyer' } }],
    });
    expect(profile?.roles).toEqual(['buyer']);
  });

  it('returns empty roles array when no role field is present', () => {
    const profile = extractUserProfile({ sub: BASE_SUB });
    expect(profile?.roles).toEqual([]);
  });

  it('does not throw with an empty payload object', () => {
    expect(() => extractUserProfile({})).not.toThrow();
  });

  it('prefers credentialSubject.firstName over payload.firstName when both are present with different values', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      firstName: 'PayloadName',
      verifiableCredential: [{ credentialSubject: { firstName: 'CredentialName' } }],
    });
    expect(profile?.firstName).toBe('CredentialName');
  });

  it('prefers credentialSubject.role over credentialSubject.roles when both are present with different values', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { role: 'buyer', roles: ['admin', 'seller'] } }],
    });
    expect(profile?.roles).toEqual(['buyer']);
  });

  it('prefers credentialSubject.organizationName over credentialSubject.legalName when both are present with different values', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [
        { credentialSubject: { organizationName: 'Acme Corp', legalName: 'Legal Corp S.L.' } },
      ],
    });
    expect(profile?.organization).toBe('Acme Corp');
  });

  const roles = (...names: string[]) => [{ target: 'did:web:marketplacev2.dataspace.es', names }];

  it('derives businessRoles from marketplace roles (SELLER → proveedor)', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: { credentialSubject: { roles: roles('SELLER') } },
    });
    expect(profile?.roles).toEqual(['SELLER']);
    expect(profile?.businessRoles).toEqual(['proveedor']);
  });

  it('derives consumidor from a plain string BUYER role', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: [{ credentialSubject: { role: 'buyer' } }],
    });
    expect(profile?.businessRoles).toEqual(['consumidor']);
  });

  it('gives no businessRoles when no role is present', () => {
    const profile = extractUserProfile({ sub: BASE_SUB });
    expect(profile?.businessRoles).toEqual([]);
  });

  it('ignores roles whose target is not the marketplace DID', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: {
        credentialSubject: { roles: [{ target: 'did:web:other', names: ['ADMIN'] }] },
      },
    });
    expect(profile?.roles).toEqual([]);
    expect(profile?.businessRoles).toEqual([]);
  });

  it('gives ADMIN both businessRoles', () => {
    const profile = extractUserProfile({
      sub: BASE_SUB,
      verifiableCredential: { credentialSubject: { roles: roles('ADMIN') } },
    });
    expect(profile?.businessRoles).toEqual(['proveedor', 'consumidor']);
  });
});
