// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

import {
  addOfferingPriceRef,
  createProductOffering,
  deleteProductOffering,
  fetchProductOfferingById,
  fetchProductOfferings,
  fetchProductOfferingsPublic,
  patchProductOffering,
  publishProductOffering,
  removeOfferingCategoryRef,
  removeOfferingPriceRef,
  removeOfferingProductSpecRef,
  setProductOfferingCategories,
  setProductOfferingPriceRefs,
} from '@/lib/services/queries/productOffering';
import { getSession } from '@/lib/session';
import { trackError } from '@/lib/utils/sentry';
import type { ProductOffering } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const TOKEN = 'test-access-token';
const OFF_ID = 'urn:ngsi-ld:productOffering:off-1';
const CAT_ID = 'urn:ngsi-ld:category:cat-1';
const PRICE_ID = 'urn:ngsi-ld:productOfferingPrice:p-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function offering(id: string): ProductOffering {
  return { id, name: `Offering ${id}` } as ProductOffering;
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

// ─── fetchProductOfferings ────────────────────────────────────────────────────

describe('fetchProductOfferings', () => {
  it('calls GET /productOffering?limit=100&offset=0 with Bearer token', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchProductOfferings();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOffering?limit=100&offset=0'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(fetchProductOfferings()).rejects.toThrow('HTTP 500');
  });
});

// ─── fetchProductOfferingsPublic ──────────────────────────────────────────────

describe('fetchProductOfferingsPublic', () => {
  it('calls GET /productOffering?limit=100&offset=0 with no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await fetchProductOfferingsPublic();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOffering?limit=100&offset=0'),
      expect.anything(),
    );
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(fetchProductOfferingsPublic()).rejects.toThrow('HTTP 500');
  });
});

// ─── fetchProductOfferingById ─────────────────────────────────────────────────

describe('fetchProductOfferingById', () => {
  it('calls GET /productOffering/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await fetchProductOfferingById(OFF_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOffering/${OFF_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(fetchProductOfferingById(OFF_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createProductOffering ────────────────────────────────────────────────────

describe('createProductOffering', () => {
  it('calls POST /productOffering with lifecycleStatus: Active and isBundle: false by default', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await createProductOffering({ name: 'Dataset movilidad' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('Active');
    expect(body.isBundle).toBe(false);
  });

  it('preserves an explicit lifecycleStatus from the payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await createProductOffering({ name: 'Dataset', lifecycleStatus: 'In design' } as never);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('In design');
  });
});

// ─── patchProductOffering ─────────────────────────────────────────────────────

describe('patchProductOffering', () => {
  it('calls PATCH /productOffering/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await patchProductOffering(OFF_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOffering/${OFF_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });
});

// ─── publishProductOffering ───────────────────────────────────────────────────

describe('publishProductOffering', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...offering(OFF_ID), lifecycleStatus: 'Launched' }));
    await publishProductOffering(OFF_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus: 'Launched' }),
      }),
    );
  });
});

// ─── deleteProductOffering ────────────────────────────────────────────────────

describe('deleteProductOffering', () => {
  it('calls DELETE /productOffering/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteProductOffering(OFF_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOffering/${OFF_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─── setProductOfferingCategories  🔴 ────────────────────────────────────────

describe('setProductOfferingCategories', () => {
  it('sends a single PATCH with the full list', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));

    await setProductOfferingCategories(OFF_ID, [CAT_ID, 'urn:ngsi-ld:category:cat-2']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect((calls[0][1] as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      category: [{ id: CAT_ID }, { id: 'urn:ngsi-ld:category:cat-2' }],
    });
  });

  it('sends an empty list when ids is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await setProductOfferingCategories(OFF_ID, []);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ category: [] });
  });

  it('throws when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(500));
    await expect(setProductOfferingCategories(OFF_ID, [CAT_ID])).rejects.toThrow('HTTP 500');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── removeOfferingCategoryRef  🔴 ───────────────────────────────────────────

describe('removeOfferingCategoryRef', () => {
  it('sends a single PATCH with the remaining items', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));

    await removeOfferingCategoryRef(OFF_ID, CAT_ID, [
      { id: CAT_ID },
      { id: 'urn:ngsi-ld:category:keep' },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      category: [{ id: 'urn:ngsi-ld:category:keep' }],
    });
  });

  it('sends an empty list when no items remain after removal', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(offering(OFF_ID)));
    await removeOfferingCategoryRef(OFF_ID, CAT_ID, [{ id: CAT_ID }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ category: [] });
  });

  it('calls trackError and rethrows when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'));
    await expect(removeOfferingCategoryRef(OFF_ID, CAT_ID, [{ id: CAT_ID }])).rejects.toThrow(
      'HTTP 502',
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ fn: 'removeOfferingCategoryRef' }),
    );
  });
});

// ─── removeOfferingProductSpecRef  🔴 ────────────────────────────────────────

describe('removeOfferingProductSpecRef', () => {
  it('PATCHes with { productSpecification: null }', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await removeOfferingProductSpecRef(OFF_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOffering/${OFF_ID}`),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ productSpecification: null }),
      }),
    );
  });

  it('calls trackError and rethrows on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(removeOfferingProductSpecRef(OFF_ID)).rejects.toThrow('HTTP 500');
    expect(trackError).toHaveBeenCalled();
  });
});

// ─── setProductOfferingPriceRefs  🔴 ─────────────────────────────────────────

describe('setProductOfferingPriceRefs', () => {
  it('sends a single PATCH with the full list', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));

    await setProductOfferingPriceRefs(OFF_ID, [PRICE_ID, 'urn:ngsi-ld:productOfferingPrice:p-2']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect((calls[0][1] as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      productOfferingPrice: [{ id: PRICE_ID }, { id: 'urn:ngsi-ld:productOfferingPrice:p-2' }],
    });
  });

  it('sends an empty list when ids is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await setProductOfferingPriceRefs(OFF_ID, []);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ productOfferingPrice: [] });
  });

  it('throws when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(500));
    await expect(setProductOfferingPriceRefs(OFF_ID, [PRICE_ID])).rejects.toThrow('HTTP 500');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─── addOfferingPriceRef  🔴 ──────────────────────────────────────────────────

describe('addOfferingPriceRef', () => {
  it('sends a single PATCH with existing + new prices', async () => {
    const existingPrice = { id: 'urn:ngsi-ld:productOfferingPrice:existing' };
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));

    await addOfferingPriceRef(OFF_ID, PRICE_ID, [existingPrice]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      productOfferingPrice: [existingPrice, { id: PRICE_ID }],
    });
  });

  it('sends only the new price when current prices are empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await addOfferingPriceRef(OFF_ID, PRICE_ID, []);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      productOfferingPrice: [{ id: PRICE_ID }],
    });
  });

  it('does not duplicate a price that is already present', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    await addOfferingPriceRef(OFF_ID, PRICE_ID, [{ id: PRICE_ID }]);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      productOfferingPrice: [{ id: PRICE_ID }],
    });
  });
});

// ─── removeOfferingPriceRef  🔴 ───────────────────────────────────────────────

describe('removeOfferingPriceRef', () => {
  it('sends a single PATCH with the remaining items', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));

    await removeOfferingPriceRef(OFF_ID, PRICE_ID, [
      { id: PRICE_ID },
      { id: 'urn:ngsi-ld:productOfferingPrice:p-2' },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      productOfferingPrice: [{ id: 'urn:ngsi-ld:productOfferingPrice:p-2' }],
    });
  });

  it('sends an empty list when no items remain after removal', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(offering(OFF_ID)));
    await removeOfferingPriceRef(OFF_ID, PRICE_ID, [{ id: PRICE_ID }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ productOfferingPrice: [] });
  });

  it('calls trackError and rethrows when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'));
    await expect(removeOfferingPriceRef(OFF_ID, PRICE_ID, [{ id: PRICE_ID }])).rejects.toThrow(
      'HTTP 502',
    );
    expect(trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ fn: 'removeOfferingPriceRef' }),
    );
  });
});

// ─── removeOfferingProductSpecRef with SPEC_ID context ───────────────────────

describe('removeOfferingProductSpecRef (with spec context)', () => {
  it('sends productSpecification: null regardless of current spec id', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(offering(OFF_ID)));
    const result = await removeOfferingProductSpecRef(OFF_ID);
    expect(result).toEqual(offering(OFF_ID));
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      productSpecification: null,
    });
  });
});
