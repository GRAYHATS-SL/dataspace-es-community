// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createProduct,
  fetchProductById,
  fetchProductsAsBuyer,
  fetchProductsAsSeller,
  fetchProductsByAgreement,
  fetchProductsByBuyer,
  updateProductStatus,
} from '@/lib/services/queries/productInventory';
import { getSession } from '@/lib/session';
import type { NewProductInventory, ProductInventory } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';

function rp(id: string, role: string) {
  return { id, role, '@referredType': 'Organization' };
}

function product(id: string, ...parties: ReturnType<typeof rp>[]): ProductInventory {
  return { id, relatedParty: parties } as ProductInventory;
}

function mockOkFetch(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
    statusText: 'OK',
  });
}

function mockErrorFetch(status: number, body = 'Error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.reject(new Error('no json')),
    text: () => Promise.resolve(body),
    statusText: 'Error',
  });
}

beforeEach(() => {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID, sub: 'did:key:test' },
  } as Awaited<ReturnType<typeof getSession>>);
});


describe('fetchProductsByBuyer', () => {
  it('returns only products where the org is buyer', async () => {
    const data = [product('p1', rp(ORG_ID, 'buyer')), product('p2', rp('other-org', 'buyer'))];
    global.fetch = mockOkFetch(data);
    const result = await fetchProductsByBuyer();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('does not return products where the org is only the seller', async () => {
    global.fetch = mockOkFetch([product('p1', rp(ORG_ID, 'seller'))]);
    expect(await fetchProductsByBuyer()).toEqual([]);
  });
});

// ─── fetchProductById ─────────────────────────────────────────────────────────

describe('fetchProductById', () => {
  it('calls GET with the product id in the path', async () => {
    const data = product('p1', rp(ORG_ID, 'seller'));
    global.fetch = mockOkFetch(data);
    const result = await fetchProductById('p1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tmf-api/productInventory/v4/product/p1'),
      expect.anything(),
    );
    expect(result).toEqual(data);
  });

  it('throws HTTP 404 when product does not exist', async () => {
    global.fetch = mockErrorFetch(404, 'Not found');
    await expect(fetchProductById('nonexistent')).rejects.toThrow('HTTP 404');
  });
});

// ─── fetchProductsAsBuyer ─────────────────────────────────────────────────────

describe('fetchProductsAsBuyer', () => {
  it('returns only products where the org role is buyer', async () => {
    const data = [
      product('p1', rp(ORG_ID, 'buyer')),
      product('p2', rp(ORG_ID, 'seller')),
      product('p3', rp('other-org', 'buyer')),
    ];
    global.fetch = mockOkFetch(data);
    const result = await fetchProductsAsBuyer();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('returns empty array when the org is not a buyer in any product', async () => {
    global.fetch = mockOkFetch([product('p1', rp('other-org', 'buyer'))]);
    expect(await fetchProductsAsBuyer()).toEqual([]);
  });
});

// ─── fetchProductsAsSeller ────────────────────────────────────────────────────

describe('fetchProductsAsSeller', () => {
  it('returns only products where the org role is seller', async () => {
    const data = [
      product('p1', rp(ORG_ID, 'seller')),
      product('p2', rp(ORG_ID, 'buyer')),
      product('p3', rp('other-org', 'seller')),
    ];
    global.fetch = mockOkFetch(data);
    const result = await fetchProductsAsSeller();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('returns empty array when the org is not a seller in any product', async () => {
    global.fetch = mockOkFetch([product('p1', rp('other-org', 'seller'))]);
    expect(await fetchProductsAsSeller()).toEqual([]);
  });
});

// ─── fetchProductsByAgreement ─────────────────────────────────────────────────

describe('fetchProductsByAgreement', () => {
  it('appends agreement.id as URL-encoded query param', async () => {
    global.fetch = mockOkFetch([]);
    await fetchProductsByAgreement('urn:ngsi-ld:agreement:xyz');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('agreement.id=urn%3Angsi-ld%3Aagreement%3Axyz'),
      expect.anything(),
    );
  });

  it('also appends limit and offset', async () => {
    global.fetch = mockOkFetch([]);
    await fetchProductsByAgreement('agr1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=100'),
      expect.anything(),
    );
  });

  it('returns the matching products list', async () => {
    const data = [product('p1', rp(ORG_ID, 'seller'))];
    global.fetch = mockOkFetch(data);
    expect(await fetchProductsByAgreement('agr1')).toEqual(data);
  });
});

// ─── createProduct ────────────────────────────────────────────────────────────

describe('createProduct', () => {
  it('sends POST to the inventory endpoint with the serialised payload', async () => {
    const payload: NewProductInventory = {
      status: 'active',
      name: 'Dataset X',
      relatedParty: [rp(ORG_ID, 'seller')],
    };
    const created = { ...payload, id: 'p-new' } as ProductInventory;
    global.fetch = mockOkFetch(created);
    const result = await createProduct(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tmf-api/productInventory/v4/product'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(created);
  });

  it('throws on backend error', async () => {
    global.fetch = mockErrorFetch(400, 'Bad request');
    await expect(createProduct({ status: 'active' } as NewProductInventory)).rejects.toThrow(
      'HTTP 400',
    );
  });

  // v2: a PATCH on lists replaces the list, so all relatedParty entries go in the POST.
  it('sends a multi-item relatedParty in a single POST with no follow-up PATCH', async () => {
    const payload: NewProductInventory = {
      status: 'active',
      name: 'Dataset X',
      relatedParty: [rp(ORG_ID, 'seller'), rp(OTHER_ORG, 'buyer')],
    };
    global.fetch = mockOkFetch(product('p-new', rp(ORG_ID, 'seller')));

    await createProduct(payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [postUrl, postInit] = vi.mocked(global.fetch).mock.calls[0];
    expect(postUrl).toEqual(expect.stringContaining('/tmf-api/productInventory/v4/product'));
    expect((postInit as RequestInit).method).toBe('POST');
    const postBody = JSON.parse((postInit as RequestInit).body as string);
    expect(postBody.relatedParty).toEqual([rp(ORG_ID, 'seller'), rp(OTHER_ORG, 'buyer')]);
  });

  it('issues no follow-up PATCH when relatedParty has a single item', async () => {
    const payload: NewProductInventory = {
      status: 'active',
      relatedParty: [rp(ORG_ID, 'seller')],
    };
    global.fetch = mockOkFetch(product('p-new', rp(ORG_ID, 'seller')));
    await createProduct(payload);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('issues no follow-up PATCH when relatedParty is absent', async () => {
    global.fetch = mockOkFetch(product('p-new'));
    await createProduct({ status: 'active' } as NewProductInventory);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toBeUndefined();
  });
});

// ─── updateProductStatus ──────────────────────────────────────────────────────

describe('updateProductStatus', () => {
  it('sends PATCH with status and returns the updated product', async () => {
    const updated = product('p1', rp(ORG_ID, 'seller'));
    global.fetch = mockOkFetch(updated);
    const result = await updateProductStatus('p1', 'suspended');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tmf-api/productInventory/v4/product/p1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'suspended' }),
      }),
    );
    expect(result).toEqual(updated);
  });

  it('URL-encodes the product id in the path', async () => {
    global.fetch = mockOkFetch(product('urn:ngsi-ld:product:p1'));
    await updateProductStatus('urn:ngsi-ld:product:p1', 'active');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('urn%3Angsi-ld%3Aproduct%3Ap1'),
      expect.anything(),
    );
  });

  it('throws HTTP 404 when the product does not exist', async () => {
    global.fetch = mockErrorFetch(404, 'Not found');
    await expect(updateProductStatus('nonexistent', 'terminated')).rejects.toThrow('HTTP 404');
  });
});
