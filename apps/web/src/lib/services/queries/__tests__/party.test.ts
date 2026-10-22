// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  fetchOrganizationById,
  fetchOrganizations,
  findOrganizationIdByDid,
  patchOrganization,
  upsertOrganizationCharacteristics,
} from '@/lib/services/queries/party';
import { getSession } from '@/lib/session';
import type { Organization } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const TOKEN = 'test-access-token';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function org(id: string): Organization {
  return { id, name: 'Test Org' } as Organization;
}

function okResponse(data: unknown, status = 200) {
  return { ok: true, status, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}

function errorResponse(status: number, body = 'Error') {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('no json')),
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockSession();
});

// ─── fetchOrganizations ───────────────────────────────────────────────────────

describe('fetchOrganizations', () => {
  it('calls GET /organization with Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchOrganizations();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/organization'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(fetchOrganizations()).rejects.toThrow('HTTP 500');
  });

  it('propagates a thrown TypeError on real network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchOrganizations()).rejects.toThrow(TypeError);
  });
});

// ─── fetchOrganizationById ────────────────────────────────────────────────────

describe('fetchOrganizationById', () => {
  it('applies encodeURIComponent to the id in the URL', async () => {
    const did = 'did:key:zDna123';
    global.fetch = vi.fn().mockResolvedValue(okResponse(org(ORG_ID)));
    await fetchOrganizationById(did);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(did)),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(fetchOrganizationById(ORG_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── patchOrganization ────────────────────────────────────────────────────────

describe('patchOrganization', () => {
  it('applies encodeURIComponent to the id and calls PATCH with the payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(org(ORG_ID)));
    await patchOrganization(ORG_ID, { name: 'Updated Org' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(ORG_ID)),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated Org' }) }),
    );
  });
});

// ─── findOrganizationIdByDid ──────────────────────────────────────────────────

describe('findOrganizationIdByDid', () => {
  const DID = 'did:key:zDnaeeSSTVqDMufcjnCztF7iMYALxkCFaR7T34Vc3kfexQoGX';

  it('returns the id of the organization whose partyCharacteristic.did matches', async () => {
    const orgs: Organization[] = [
      { ...org('other-org'), partyCharacteristic: [{ name: 'did', value: 'did:key:other' }] },
      { ...org(ORG_ID), partyCharacteristic: [{ name: 'did', value: DID }] },
    ];
    global.fetch = vi.fn().mockResolvedValue(okResponse(orgs));
    await expect(findOrganizationIdByDid(DID)).resolves.toBe(ORG_ID);
  });

  it('treats a closed organization as not found', async () => {
    const orgs: Organization[] = [
      { ...org(ORG_ID), status: 'closed', partyCharacteristic: [{ name: 'did', value: DID }] },
    ];
    global.fetch = vi.fn().mockResolvedValue(okResponse(orgs));
    await expect(findOrganizationIdByDid(DID)).resolves.toBeUndefined();
  });

  it('keeps matching organizations with status undefined or initialized', async () => {
    const orgs: Organization[] = [
      { ...org(ORG_ID), status: 'initialized', partyCharacteristic: [{ name: 'did', value: DID }] },
    ];
    global.fetch = vi.fn().mockResolvedValue(okResponse(orgs));
    await expect(findOrganizationIdByDid(DID)).resolves.toBe(ORG_ID);
  });

  it('returns undefined when no organization matches the did', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([org(ORG_ID)]));
    await expect(findOrganizationIdByDid(DID)).resolves.toBeUndefined();
  });

  it('requests with a limit and an explicit bearer token when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await findOrganizationIdByDid(DID, 'explicit-token');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit='),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer explicit-token' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(findOrganizationIdByDid(DID)).rejects.toThrow('HTTP 500');
  });
});

// ─── upsertOrganizationCharacteristics ────────────────────────────────────────

describe('upsertOrganizationCharacteristics', () => {
  it('merges by name and sends a single PATCH with the full list (v2 replaces lists)', async () => {
    const current = {
      ...org(ORG_ID),
      partyCharacteristic: [
        { name: 'did', value: 'did:web:x' },
        { name: 'stripeConnectAccountId', value: 'acct_old' },
      ],
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(current))
      .mockResolvedValueOnce(okResponse(current));

    await upsertOrganizationCharacteristics(ORG_ID, [
      { name: 'stripeConnectAccountId', value: 'acct_new' },
      { name: 'stripePayoutsEnabled', value: true },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [, patchInit] = vi.mocked(global.fetch).mock.calls[1];
    expect((patchInit as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((patchInit as RequestInit).body as string)).toEqual({
      partyCharacteristic: [
        { name: 'did', value: 'did:web:x' },
        { name: 'stripeConnectAccountId', value: 'acct_new' },
        { name: 'stripePayoutsEnabled', value: true },
      ],
    });
  });
});
