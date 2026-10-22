// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createIndividual,
  fetchIndividualById,
  fetchIndividuals,
  patchIndividual,
} from '@/lib/services/queries/individual';
import { getSession } from '@/lib/session';
import type { Individual } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const TOKEN = 'test-access-token';
const IND_ID = 'urn:ngsi-ld:individual:ind-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function individual(id: string): Individual {
  return {
    id,
    fullName: 'Ana García',
    contactMedium: [{ mediumType: 'email', characteristic: { emailAddress: 'ana@empresa.com' } }],
    relatedParty: [{ id: ORG_ID, role: 'member', '@referredType': 'Organization' }],
  } as unknown as Individual;
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

// ─── fetchIndividuals ─────────────────────────────────────────────────────────

describe('fetchIndividuals', () => {
  it('calls GET /individual with session Bearer token by default', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchIndividuals();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/individual'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it('uses the explicit accessToken parameter over the session token', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchIndividuals('explicit-token');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer explicit-token' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(fetchIndividuals()).rejects.toThrow('HTTP 500');
  });
});

// ─── fetchIndividualById ──────────────────────────────────────────────────────

describe('fetchIndividualById', () => {
  it('applies encodeURIComponent to the id in the URL', async () => {
    const did = 'did:key:zDna123';
    global.fetch = vi.fn().mockResolvedValue(okResponse(individual(IND_ID)));
    await fetchIndividualById(did);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(did)),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(fetchIndividualById(IND_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createIndividual ─────────────────────────────────────────────────────────

describe('createIndividual', () => {
  it('calls POST /individual with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(individual(IND_ID)));
    const payload = { fullName: 'Ana García' } as never;
    await createIndividual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/individual'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });

  it('uses the explicit accessToken when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(individual(IND_ID)));
    await createIndividual({ fullName: 'Ana García' } as never, 'explicit-token');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer explicit-token' }),
      }),
    );
  });
});

// ─── patchIndividual ──────────────────────────────────────────────────────────

describe('patchIndividual', () => {
  it('applies encodeURIComponent to the id and calls PATCH', async () => {
    const did = 'did:key:zDna123';
    global.fetch = vi.fn().mockResolvedValue(okResponse(individual(IND_ID)));
    await patchIndividual(did, { fullName: 'Ana Updated' } as never);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent(did)),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
