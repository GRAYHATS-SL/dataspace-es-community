// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/services/payments/stripe', () => ({ retrievePaymentIntent: vi.fn() }));
vi.mock('@/lib/services/backendCredential', () => ({
  assertBackendCredentialConfigured: vi.fn(),
  backendPatchOrderState: vi.fn(),
}));

import {
  assertBackendCredentialConfigured,
  backendPatchOrderState,
} from '@/lib/services/backendCredential';
import { retrievePaymentIntent } from '@/lib/services/payments/stripe';
import { finalizeCompletedOrder } from '@/lib/services/queries/productOrderFinalize';
import {
  completeProductOrderPayment,
  reconcileProductOrderPayment,
} from '@/lib/services/queries/productOrderPayment';
import { getSession } from '@/lib/session';
import type { ProductOrder } from '@/types/api';

const TOKEN = 'test-access-token';
const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';
const AGREEMENT_ID = 'urn:ngsi-ld:agreement:agr-1';
const BUYER_ID = 'urn:ngsi-ld:organization:buyer';
const SELLER_ID = 'urn:ngsi-ld:organization:seller';
const PAYMENT_INTENT_ID = 'pi_test_123';

function mockSession(organizationId = BUYER_ID) {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId, sub: 'did:key:user-1' },
  } as Awaited<ReturnType<typeof getSession>>);
}

function baseOrder(overrides: Partial<ProductOrder> = {}): ProductOrder {
  return {
    id: ORDER_ID,
    state: 'acknowledged',
    relatedParty: [
      { id: BUYER_ID, role: 'buyer', '@referredType': 'Organization' },
      { id: SELLER_ID, role: 'seller', '@referredType': 'Organization' },
    ],
    productOrderItem: [
      {
        id: '1',
        action: 'add',
        productOffering: { id: 'urn:ngsi-ld:productOffering:off-1', name: 'Oferta X' },
      },
    ],
    ...overrides,
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

function agreementFixture() {
  return {
    id: AGREEMENT_ID,
    name: 'Acuerdo',
    agreementType: 'dataSharing',
    status: 'approved',
    engagedParty: [],
    agreementItem: [{}],
  };
}

beforeEach(() => {
  mockSession();
  vi.mocked(retrievePaymentIntent).mockReset();
  vi.mocked(backendPatchOrderState)
    .mockReset()
    .mockImplementation(async (id, state) => ({ ...baseOrder(), id, state }));
});

describe('finalizeCompletedOrder', () => {
  it('runs transition → agreement → link → product on the happy path', async () => {
    const completedOrder = { ...baseOrder(), state: 'completed' } as ProductOrder;
    const createdAgreement = agreementFixture();
    const linkedOrder = { ...completedOrder, agreement: [{ id: AGREEMENT_ID }] };
    const createdProduct = { id: 'urn:ngsi-ld:product:prod-1', status: 'active' };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(createdAgreement))
      .mockResolvedValueOnce(okResponse(linkedOrder))
      .mockResolvedValueOnce(okResponse(createdProduct));
    global.fetch = fetchMock;

    const result = await finalizeCompletedOrder(baseOrder());

    expect(result.ok).toBe(true);
    // The state is set by the backend (token scope=backend), not by the BUYER via `fetch` with their token.
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'completed');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST' });
  });

  it('skips the transition call when the order is already completed', async () => {
    const completedOrder = baseOrder({ state: 'completed' });
    const createdAgreement = agreementFixture();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(createdAgreement))
      .mockResolvedValueOnce(okResponse({ ...completedOrder, agreement: [{ id: AGREEMENT_ID }] }))
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' }));
    global.fetch = fetchMock;

    const result = await finalizeCompletedOrder(completedOrder);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(backendPatchOrderState).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('returns ok:false with step "transition" when the backend PATCH fails', async () => {
    vi.mocked(backendPatchOrderState).mockRejectedValue(new Error('HTTP 403: nope'));
    global.fetch = vi.fn();
    const result = await finalizeCompletedOrder(baseOrder());
    expect(result).toEqual({ ok: false, step: 'transition', message: 'HTTP 403: nope' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('is idempotent when the order is completed and already has an agreement', async () => {
    const order = baseOrder({ state: 'completed', agreement: [{ id: AGREEMENT_ID }] });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const result = await finalizeCompletedOrder(order);

    expect(result).toEqual({ ok: true, order });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns ok:false with step "transition" when the order has no id', async () => {
    const result = await finalizeCompletedOrder({ ...baseOrder(), id: undefined });
    expect(result).toEqual({
      ok: false,
      step: 'transition',
      message: expect.stringContaining('identificador'),
    });
  });

  it('stops with step "agreement" when creating the agreement fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(errorResponse(400));
    global.fetch = fetchMock;

    const result = await finalizeCompletedOrder(baseOrder());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.step).toBe('agreement');
  });

  it('stops with step "product" when activating the product fails', async () => {
    const completedOrder = { ...baseOrder(), state: 'completed' };
    const createdAgreement = agreementFixture();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(createdAgreement))
      .mockResolvedValueOnce(okResponse({ ...completedOrder, agreement: [{ id: AGREEMENT_ID }] }))
      .mockResolvedValueOnce(errorResponse(500));
    global.fetch = fetchMock;

    const result = await finalizeCompletedOrder(baseOrder());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.step).toBe('product');
  });
});

describe('completeProductOrderPayment', () => {
  it('returns "unauthorized" when there is no active session', async () => {
    vi.mocked(getSession).mockResolvedValue({
      accessToken: undefined,
      userProfile: undefined,
    } as Awaited<ReturnType<typeof getSession>>);

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result).toEqual({ ok: false, step: 'unauthorized', message: expect.any(String) });
  });

  it('returns "unauthorized" when the session organization is not the buyer', async () => {
    mockSession(SELLER_ID);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(baseOrder({ externalId: PAYMENT_INTENT_ID })));
    global.fetch = fetchMock;

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result).toEqual({ ok: false, step: 'unauthorized', message: expect.any(String) });
  });

  it('accepts the v2 Customer role (case-insensitive) as the buyer', async () => {
    const order = baseOrder({
      relatedParty: [{ id: BUYER_ID, role: 'Customer', '@referredType': 'Organization' }],
    });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(order)) // fetchProductOrderById
      .mockResolvedValueOnce(okResponse(agreementFixture()))
      .mockResolvedValueOnce(okResponse({ ...order, agreement: [{ id: AGREEMENT_ID }] }))
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' }));

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result.ok).toBe(true);
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'completed');
  });

  it('does not complete an order without Stripe success even when the state is missing (v2)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(baseOrder({ state: undefined, externalId: PAYMENT_INTENT_ID })));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'requires_payment_method' } as never);

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result.ok).toBe(false);
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });

  it('finalizes directly when the order has no externalId (free offering)', async () => {
    const order = baseOrder();
    const completedOrder = { ...order, state: 'completed' };
    const createdAgreement = agreementFixture();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(order)) // fetchProductOrderById
      .mockResolvedValueOnce(okResponse(createdAgreement)) // agreement
      .mockResolvedValueOnce(okResponse({ ...completedOrder, agreement: [{ id: AGREEMENT_ID }] })) // link
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' })); // product
    global.fetch = fetchMock;

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result.ok).toBe(true);
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('never trusts a client-reported status — re-checks Stripe and rejects if not succeeded', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(order));
    global.fetch = fetchMock;
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'processing' } as never);

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result).toEqual({
      ok: false,
      step: 'payment',
      message: expect.stringContaining('processing'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('finalizes the order once Stripe confirms the PaymentIntent succeeded', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    const completedOrder = { ...order, state: 'completed' };
    const createdAgreement = agreementFixture();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(order)) // fetchProductOrderById
      .mockResolvedValueOnce(okResponse(createdAgreement)) // agreement
      .mockResolvedValueOnce(okResponse({ ...completedOrder, agreement: [{ id: AGREEMENT_ID }] })) // link
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' })); // product
    global.fetch = fetchMock;
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);

    const result = await completeProductOrderPayment(ORDER_ID);
    expect(result.ok).toBe(true);
    expect(retrievePaymentIntent).toHaveBeenCalledWith(PAYMENT_INTENT_ID);
  });
});

describe('reconcileProductOrderPayment', () => {
  const MISSING_CONFIG = new Error('Credencial del backend no configurada');

  beforeEach(() => vi.mocked(assertBackendCredentialConfigured).mockReset());

  it.each(['succeeded', 'canceled'])(
    'throws (not null) when the backend credential is missing and the PaymentIntent is %s',
    async (status) => {
      const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
      global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
      vi.mocked(retrievePaymentIntent).mockResolvedValue({ status } as never);
      vi.mocked(assertBackendCredentialConfigured).mockImplementationOnce(() => {
        throw MISSING_CONFIG;
      });

      await expect(reconcileProductOrderPayment(order)).rejects.toThrow(MISSING_CONFIG.message);
      expect(backendPatchOrderState).not.toHaveBeenCalled();
    },
  );

  it('does not require the backend credential when there is nothing to reconcile', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'requires_action' } as never);

    expect(await reconcileProductOrderPayment(order)).toBeNull();
    expect(assertBackendCredentialConfigured).not.toHaveBeenCalled();
  });

  it('returns null when the order has no id', async () => {
    expect(await reconcileProductOrderPayment({ ...baseOrder(), id: undefined })).toBeNull();
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('returns null when the order cannot be read (not a party / backend error)', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    expect(await reconcileProductOrderPayment(baseOrder({ externalId: PAYMENT_INTENT_ID }))).toBeNull();
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('returns null when the order is not in a reconcilable state', async () => {
    const order = baseOrder({ state: 'completed', externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    expect(await reconcileProductOrderPayment(order)).toBeNull();
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('returns null when there is no externalId', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(baseOrder()));
    expect(await reconcileProductOrderPayment(baseOrder())).toBeNull();
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it('ignores the state/externalId sent by the client and trusts the server-side order', async () => {
    const forged = baseOrder({ externalId: 'pi_forged' });
    const real = baseOrder({ state: 'cancelled', externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(real));
    expect(await reconcileProductOrderPayment(forged)).toBeNull();
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });

  it('treats a missing state (v2 pending payment) as reconcilable', async () => {
    const order = baseOrder({ state: undefined, externalId: PAYMENT_INTENT_ID });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(order)) // fetchProductOrderById
      .mockResolvedValueOnce(okResponse(agreementFixture()))
      .mockResolvedValueOnce(okResponse({ ...order, agreement: [{ id: AGREEMENT_ID }] }))
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' }));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);

    const result = await reconcileProductOrderPayment(order);
    expect(result?.state).toBe('completed');
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'completed');
  });

  it('finalizes the order when Stripe reports the payment succeeded', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okResponse(order)) // fetchProductOrderById
      .mockResolvedValueOnce(okResponse(agreementFixture()))
      .mockResolvedValueOnce(okResponse({ ...order, agreement: [{ id: AGREEMENT_ID }] }))
      .mockResolvedValueOnce(okResponse({ id: 'urn:ngsi-ld:product:prod-1', status: 'active' }));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);

    const result = await reconcileProductOrderPayment(order);
    expect(result?.state).toBe('completed');
  });

  it('returns null when finalizing fails after a succeeded payment', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);
    vi.mocked(backendPatchOrderState).mockRejectedValue(new Error('HTTP 403'));

    expect(await reconcileProductOrderPayment(order)).toBeNull();
  });

  it('rejects the order with the backend token when Stripe reports the PaymentIntent canceled', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'canceled' } as never);

    const result = await reconcileProductOrderPayment(order);
    expect(result?.state).toBe('rejected');
    expect(backendPatchOrderState).toHaveBeenCalledWith(ORDER_ID, 'rejected');
  });

  it('returns null when the backend rejection fails', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'canceled' } as never);
    vi.mocked(backendPatchOrderState).mockRejectedValue(new Error('HTTP 403'));

    expect(await reconcileProductOrderPayment(order)).toBeNull();
  });

  it('returns null while the PaymentIntent is still in progress', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'requires_action' } as never);

    expect(await reconcileProductOrderPayment(order)).toBeNull();
    expect(backendPatchOrderState).not.toHaveBeenCalled();
  });

  it('returns null when Stripe lookup fails', async () => {
    const order = baseOrder({ externalId: PAYMENT_INTENT_ID });
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(order));
    vi.mocked(retrievePaymentIntent).mockRejectedValue(new Error('not found'));

    expect(await reconcileProductOrderPayment(order)).toBeNull();
  });
});
