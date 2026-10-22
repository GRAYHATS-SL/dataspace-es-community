// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/services/backendCredential', () => ({
  assertBackendCredentialConfigured: vi.fn(),
  backendPatchOrderState: vi.fn(),
}));
vi.mock('@/lib/services/queries/offeringProvider', () => ({
  assertOfferingsProviderActive: vi.fn(),
}));

import { backendPatchOrderState } from '@/lib/services/backendCredential';
import { assertOfferingsProviderActive } from '@/lib/services/queries/offeringProvider';
import {
  cancelProductOrder,
  createProductOrder,
  fetchProductOrderById,
  fetchProductOrdersAsBuyer,
  fetchProductOrdersAsSeller,
  linkAgreementToOrder,
  patchProductOrder,
  transitionProductOrderState,
} from '@/lib/services/queries/productOrder';
import { getSession } from '@/lib/session';
import type { NewProductOrder, ProductOrder } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';

function mockSession(roles: string[] = ['ADMIN']) {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles, organizationId: ORG_ID, sub: 'did:key:user-1' },
  } as Awaited<ReturnType<typeof getSession>>);
}

// filterAsBuyer / filterAsSeller both match by organizationId
function order(id: string, buyerId = ORG_ID, sellerId = OTHER_ORG): ProductOrder {
  return {
    id,
    state: 'acknowledged',
    relatedParty: [
      { id: buyerId, role: 'buyer', '@referredType': 'Organization' },
      { id: sellerId, role: 'seller', '@referredType': 'Organization' },
    ],
  } as ProductOrder;
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
  vi.mocked(backendPatchOrderState).mockReset();
  vi.mocked(assertOfferingsProviderActive).mockReset();
  mockSession();
});

// ─── fetchProductOrdersAsBuyer ────────────────────────────────────────────────

describe('fetchProductOrdersAsBuyer', () => {
  it('returns only orders where the current org is buyer', async () => {
    const mine = order(ORDER_ID, ORG_ID);
    const other = order('urn:ngsi-ld:productOrder:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([mine, other]));
    const result = await fetchProductOrdersAsBuyer();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(ORDER_ID);
  });

  it('returns empty array when the org is not buyer in any order', async () => {
    const other = order('urn:ngsi-ld:productOrder:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([other]));
    expect(await fetchProductOrdersAsBuyer()).toHaveLength(0);
  });

  it('BUYER consulta TMF y filtra por su organización', async () => {
    mockSession(['BUYER']);
    global.fetch = vi.fn().mockResolvedValue(okResponse([order(ORDER_ID, ORG_ID)]));
    expect(await fetchProductOrdersAsBuyer()).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('SELLER recibe [] sin llamar a TMF (GET productOrder es 403 en v2)', async () => {
    mockSession(['SELLER']);
    global.fetch = vi.fn();
    expect(await fetchProductOrdersAsBuyer()).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── fetchProductOrdersAsSeller ───────────────────────────────────────────────

describe('fetchProductOrdersAsSeller', () => {
  it('returns only orders where the current org is seller', async () => {
    const mine = order(ORDER_ID, OTHER_ORG, ORG_ID);
    const other = order('urn:ngsi-ld:productOrder:other', OTHER_ORG, OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([mine, other]));
    const result = await fetchProductOrdersAsSeller();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(ORDER_ID);
  });

  it('returns empty array when the org is not seller in any order', async () => {
    const other = order('urn:ngsi-ld:productOrder:other', OTHER_ORG, OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([other]));
    expect(await fetchProductOrdersAsSeller()).toHaveLength(0);
  });

  it.each([['SELLER'], ['BUYER']])('%s recibe [] sin llamar a TMF', async (role) => {
    mockSession([role]);
    global.fetch = vi.fn();
    expect(await fetchProductOrdersAsSeller()).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── fetchProductOrderById ────────────────────────────────────────────────────

describe('fetchProductOrderById', () => {
  it('calls GET /productOrder/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await fetchProductOrderById(ORDER_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOrder/${ORDER_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404, 'Not Found'));
    await expect(fetchProductOrderById(ORDER_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createProductOrder ───────────────────────────────────────────────────────

describe('createProductOrder', () => {
  const withSeller = {
    productOrderItem: [],
    relatedParty: [{ id: OTHER_ORG, role: 'seller', '@referredType': 'Organization' }],
  } as unknown as NewProductOrder;

  it('calls POST /productOrder', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder(withSeller);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productOrder'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps the seller relatedParty provided by the caller in the POST body', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder(withSeller);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toContainEqual(
      expect.objectContaining({ id: OTHER_ORG, role: 'seller' }),
    );
  });

  // v2: the order is created without `state` (absence = pending payment).
  it('does not send state, even if the caller provides one', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder({ ...withSeller, state: 'completed' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('state');
  });

  it('does not require a seller relatedParty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder({ productOrderItem: [] } as unknown as NewProductOrder);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual([
      { id: ORG_ID, role: 'Customer', '@referredType': 'Organization' },
    ]);
  });

  it('drops Customer/buyer entries sent by the client and pins the session org as Customer', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder({
      productOrderItem: [],
      relatedParty: [
        { id: OTHER_ORG, role: 'Customer', '@referredType': 'Organization' },
        { id: OTHER_ORG, role: 'buyer', '@referredType': 'Organization' },
      ],
    } as unknown as NewProductOrder);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual([
      { id: ORG_ID, role: 'Customer', '@referredType': 'Organization' },
    ]);
  });

  it('comprueba el proveedor de cada oferta del pedido antes del POST', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder({
      productOrderItem: [
        { id: '1', productOffering: { id: 'off-1' } },
        { id: '2', productOffering: { id: 'off-2' } },
        { id: '3' },
      ],
    } as unknown as NewProductOrder);
    expect(assertOfferingsProviderActive).toHaveBeenCalledWith(['off-1', 'off-2']);
  });

  it('no crea el pedido si el proveedor de la oferta está closed', async () => {
    global.fetch = vi.fn();
    vi.mocked(assertOfferingsProviderActive).mockRejectedValue(new Error('proveedor dado de baja'));
    await expect(
      createProductOrder({
        productOrderItem: [{ id: '1', productOffering: { id: 'off-1' } }],
      } as unknown as NewProductOrder),
    ).rejects.toThrow('proveedor dado de baja');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // v2: a PATCH on lists replaces the list, so seller and buyer go together in the POST.
  it('sends seller and Customer together in a single POST with no follow-up PATCH', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await createProductOrder(withSeller);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [, postInit] = vi.mocked(global.fetch).mock.calls[0];
    expect((postInit as RequestInit).method).toBe('POST');
    const postBody = JSON.parse((postInit as RequestInit).body as string);
    expect(postBody.relatedParty).toEqual([
      expect.objectContaining({ id: OTHER_ORG, role: 'seller' }),
      expect.objectContaining({ id: ORG_ID, role: 'Customer' }),
    ]);
  });
});

// ─── patchProductOrder ────────────────────────────────────────────────────────

describe('patchProductOrder', () => {
  it('calls PATCH /productOrder/{id} with the given payload', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...order(ORDER_ID), state: 'inProgress' }));
    await patchProductOrder(ORDER_ID, { state: 'inProgress' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productOrder/${ORDER_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ state: 'inProgress' }) }),
    );
  });
});

// ─── transitionProductOrderState  🔴 ─────────────────────────────────────────

describe('transitionProductOrderState', () => {
  it('PATCHes with the user token for non-lifecycle states', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...order(ORDER_ID), state: 'inProgress' }));
    await transitionProductOrderState(ORDER_ID, 'inProgress');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ state: 'inProgress' }) }),
    );
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });

  it('rejects completed: only the server-side payment flow may complete an order', async () => {
    global.fetch = vi.fn();
    await expect(transitionProductOrderState(ORDER_ID, 'completed')).rejects.toThrow(
      'verificar el pago',
    );
    expect(global.fetch).not.toHaveBeenCalled();
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });

  it('delegates cancelled to the backend token', async () => {
    vi.mocked(backendPatchOrderState).mockResolvedValue({ ...order(ORDER_ID), state: 'cancelled' });
    await transitionProductOrderState(ORDER_ID, 'cancelled');
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'cancelled');
  });
});

// ─── cancelProductOrder  🔴 ───────────────────────────────────────────────────

describe('cancelProductOrder', () => {
  it('patches state cancelled with the backend token (no CancelProductOrder resource)', async () => {
    global.fetch = vi.fn();
    vi.mocked(backendPatchOrderState).mockResolvedValue({ ...order(ORDER_ID), state: 'cancelled' });
    const result = await cancelProductOrder(ORDER_ID);
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'cancelled');
    expect(result.state).toBe('cancelled');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('validates the session org is part of the order before using the backend token', async () => {
    vi.mocked(getSession).mockResolvedValue({
      accessToken: TOKEN,
      userProfile: { roles: ['BUYER'], organizationId: ORG_ID, sub: 'did:key:user-1' },
    } as Awaited<ReturnType<typeof getSession>>);
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID, OTHER_ORG, OTHER_ORG)));
    await expect(cancelProductOrder(ORDER_ID)).rejects.toThrow('Forbidden');
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });
});

// ─── linkAgreementToOrder ─────────────────────────────────────────────────────

describe('linkAgreementToOrder', () => {
  it('PATCHes with agreement array containing id and name', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await linkAgreementToOrder(ORDER_ID, 'urn:ngsi-ld:agreement:agr-1', 'Agreement A');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          agreement: [{ id: 'urn:ngsi-ld:agreement:agr-1', name: 'Agreement A' }],
        }),
      }),
    );
  });

  it('sends undefined name when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(order(ORDER_ID)));
    await linkAgreementToOrder(ORDER_ID, 'urn:ngsi-ld:agreement:agr-1');
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.agreement[0].id).toBe('urn:ngsi-ld:agreement:agr-1');
  });
});
