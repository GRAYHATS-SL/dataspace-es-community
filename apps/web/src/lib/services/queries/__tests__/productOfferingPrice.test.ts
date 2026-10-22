// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createProductOfferingPrice,
  deleteProductOfferingPrice,
  getProductOfferingPriceById,
  getProductOfferingPrices,
  getProductOfferingPricesPublic,
  patchProductOfferingPrice,
} from '@/lib/services/queries/productOfferingPrice';
import { getSession } from '@/lib/session';
import type { ProductOfferingPrice } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const TOKEN = 'test-access-token';
const PRICE_ID = 'urn:ngsi-ld:productOfferingPrice:p-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function price(id: string): ProductOfferingPrice {
  return { id, name: 'Test Price', priceType: 'recurring' } as ProductOfferingPrice;
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

// ─── createProductOfferingPrice ───────────────────────────────────────────────

describe('createProductOfferingPrice', () => {
  it('calls POST /productOfferingPrice with the cleaned payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    await createProductOfferingPrice({
      name: 'Monthly',
      priceType: 'recurring',
      price: { value: 9.99, unit: 'EUR' },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOfferingPrice'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('strips undefined fields (recurringChargePeriodType, price) when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    await createProductOfferingPrice({ name: 'Free', priceType: 'free' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('recurringChargePeriodType');
    expect(body).not.toHaveProperty('price');
  });

  it('includes tax array in the payload when non-empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    const tax = [{ taxCategory: 'VAT', taxRate: 21, taxAmount: { value: 2.0, unit: 'EUR' } }];
    await createProductOfferingPrice({ name: 'Taxed', priceType: 'recurring', tax });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tax).toEqual(tax);
  });

  it('omits tax from the payload when the array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    await createProductOfferingPrice({ name: 'No tax', priceType: 'free', tax: [] });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('tax');
  });

  it('includes productOfferingTerm when non-empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    const term = [{ name: '12 months', duration: { amount: 12, units: 'month' } }];
    await createProductOfferingPrice({
      name: 'Annual',
      priceType: 'recurring',
      productOfferingTerm: term as never,
    });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.productOfferingTerm).toEqual(term);
  });
});

// ─── getProductOfferingPrices ─────────────────────────────────────────────────

describe('getProductOfferingPrices', () => {
  it('calls GET /productOfferingPrice?limit=100&offset=0', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getProductOfferingPrices();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOfferingPrice?limit=100&offset=0'),
      expect.anything(),
    );
  });
});

// ─── getProductOfferingPricesPublic ───────────────────────────────────────────

describe('getProductOfferingPricesPublic', () => {
  it('calls GET /productOfferingPrice?limit=100&offset=0 with no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getProductOfferingPricesPublic();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOfferingPrice?limit=100&offset=0'),
      expect.anything(),
    );
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});

// ─── getProductOfferingPriceById ──────────────────────────────────────────────

describe('getProductOfferingPriceById', () => {
  it('calls GET /productOfferingPrice/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    await getProductOfferingPriceById(PRICE_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOfferingPrice/${PRICE_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(getProductOfferingPriceById(PRICE_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── patchProductOfferingPrice ────────────────────────────────────────────────

describe('patchProductOfferingPrice', () => {
  it('calls PATCH /productOfferingPrice/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(price(PRICE_ID)));
    await patchProductOfferingPrice(PRICE_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOfferingPrice/${PRICE_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(patchProductOfferingPrice(PRICE_ID, { name: 'Updated' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── deleteProductOfferingPrice ───────────────────────────────────────────────

describe('deleteProductOfferingPrice', () => {
  it('calls DELETE /productOfferingPrice/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteProductOfferingPrice(PRICE_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOfferingPrice/${PRICE_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
