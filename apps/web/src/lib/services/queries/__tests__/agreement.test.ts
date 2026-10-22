// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createAgreement,
  fetchAgreementById,
  fetchAgreementsAsBuyer,
  fetchAgreementsAsSeller,
  updateAgreementStatus,
} from '@/lib/services/queries/agreement';
import { getSession } from '@/lib/session';
import type { Agreement } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const AGR_ID = 'urn:ngsi-ld:agreement:agr-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID, sub: 'did:key:test' },
  } as Awaited<ReturnType<typeof getSession>>);
}

function agreement(id: string, buyerOrgId = ORG_ID, sellerOrgId = OTHER_ORG): Agreement {
  return {
    id,
    engagedParty: [
      { id: buyerOrgId, role: 'buyer', '@referredType': 'Organization' },
      { id: sellerOrgId, role: 'seller', '@referredType': 'Organization' },
    ],
  } as Agreement;
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

describe('fetchAgreementsAsBuyer', () => {
  it('returns only agreements where the org is buyer', async () => {
    const mine = agreement(AGR_ID);
    const other = agreement('urn:ngsi-ld:agreement:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([mine, other]));
    const result = await fetchAgreementsAsBuyer();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(AGR_ID);
  });

  it('returns empty array when the org is not buyer in any agreement', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([agreement('other', OTHER_ORG)]));
    expect(await fetchAgreementsAsBuyer()).toHaveLength(0);
  });
});

// ─── fetchAgreementsAsSeller ──────────────────────────────────────────────────

describe('fetchAgreementsAsSeller', () => {
  it('returns only agreements where the org is seller', async () => {
    const mine = agreement(AGR_ID, OTHER_ORG, ORG_ID);
    const other = agreement('urn:ngsi-ld:agreement:other', OTHER_ORG, OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([mine, other]));
    const result = await fetchAgreementsAsSeller();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(AGR_ID);
  });

  it('returns empty array when the org is not seller in any agreement', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse([agreement('other', OTHER_ORG, OTHER_ORG)]));
    expect(await fetchAgreementsAsSeller()).toHaveLength(0);
  });
});

// ─── fetchAgreementById ───────────────────────────────────────────────────────

describe('fetchAgreementById', () => {
  it('calls GET /agreement/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(agreement(AGR_ID)));
    await fetchAgreementById(AGR_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/agreement/${AGR_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404, 'Not Found'));
    await expect(fetchAgreementById(AGR_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createAgreement ──────────────────────────────────────────────────────────

describe('createAgreement', () => {
  it('calls POST /agreement with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(agreement(AGR_ID)));
    const payload = { name: 'Test agreement' } as never;
    await createAgreement(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/agreement'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
  });
});

// ─── updateAgreementStatus ────────────────────────────────────────────────────

describe('updateAgreementStatus', () => {
  it('PATCHes /agreement/{id} with { status } and returns updated agreement', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...agreement(AGR_ID), status: 'approved' }));
    await updateAgreementStatus(AGR_ID, 'approved');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/agreement/${AGR_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
    );
  });
});
