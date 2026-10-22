// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/reviewsAuth', () => ({ issueReviewsInternalToken: vi.fn() }));

import {
  createOfferingComment,
  fetchOfferingComments,
} from '@/lib/services/queries/reviewComments';
import { issueReviewsInternalToken } from '@/lib/services/queries/reviewsAuth';

const OFFERING_ID = 'urn:ngsi-ld:productOffering:offer-1';
const BASE_URL = 'https://reviews-api.internal';
const TOKEN = 'internal-token';

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
  process.env.REVIEWS_API_BASE_URL = BASE_URL;
  vi.mocked(issueReviewsInternalToken).mockResolvedValue(TOKEN);
});

describe('fetchOfferingComments', () => {
  it('fetches comments without an Authorization header (lectura pública)', async () => {
    const result = { comments: [], average: 0, count: 0 };
    const fetchMock = vi.fn().mockResolvedValue(okResponse(result));
    global.fetch = fetchMock;

    await expect(fetchOfferingComments(OFFERING_ID)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/offerings/${encodeURIComponent(OFFERING_ID)}/comments`,
    );
  });

  it('throws HTTP error when reviews-api responds with an error', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500, 'boom'));
    await expect(fetchOfferingComments(OFFERING_ID)).rejects.toThrow('HTTP 500');
  });
});

describe('createOfferingComment', () => {
  it('issues an internal token and posts with the Authorization header', async () => {
    const created = {
      id: '1',
      offeringId: OFFERING_ID,
      individualId: 'urn:ngsi-ld:individual:ind-1',
      organizationId: 'urn:ngsi-ld:organization:org-1',
      rating: 5,
      body: 'great',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const fetchMock = vi.fn().mockResolvedValue(okResponse(created, 201));
    global.fetch = fetchMock;

    const result = await createOfferingComment(OFFERING_ID, { rating: 5, body: 'great' });

    expect(result).toEqual(created);
    expect(issueReviewsInternalToken).toHaveBeenCalledWith(OFFERING_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/offerings/${encodeURIComponent(OFFERING_ID)}/comments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
        body: JSON.stringify({ rating: 5, body: 'great' }),
      }),
    );
  });

  it('propagates the 403 from ownership verification without calling fetch', async () => {
    vi.mocked(issueReviewsInternalToken).mockRejectedValue(
      new Error('HTTP 403: No existe un ProductInventory activo'),
    );
    global.fetch = vi.fn();

    await expect(createOfferingComment(OFFERING_ID, { rating: 3 })).rejects.toThrow('HTTP 403');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws HTTP 409 when reviews-api rejects a duplicate comment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(409, 'duplicate'));
    global.fetch = fetchMock;
    await expect(createOfferingComment(OFFERING_ID, { rating: 4 })).rejects.toThrow('HTTP 409');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/offerings/${encodeURIComponent(OFFERING_ID)}/comments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
        body: JSON.stringify({ rating: 4 }),
      }),
    );
  });

  it('throws HTTP 400 when reviews-api rejects an invalid payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(400, 'invalid rating'));
    global.fetch = fetchMock;
    await expect(createOfferingComment(OFFERING_ID, { rating: 4 })).rejects.toThrow('HTTP 400');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/offerings/${encodeURIComponent(OFFERING_ID)}/comments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
        body: JSON.stringify({ rating: 4 }),
      }),
    );
  });
});
