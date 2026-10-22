// @vitest-environment node
// INTEGRATION test: real Server Actions (completeProductOrderPayment / reconcileProductOrderPayment) -> real finalizeCompletedOrder -> real transactionLog client -> fetch. Only the I/O edges are mocked: session, Stripe, backendCredential, the TMForum calls (order/agreement/product) and `fetch` to the immutable ledger.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/services/payments/stripe', () => ({ retrievePaymentIntent: vi.fn() }));
vi.mock('@/lib/services/backendCredential', () => ({ assertBackendCredentialConfigured: vi.fn() }));
vi.mock('@/lib/services/queries/productOrder', () => ({
  fetchProductOrderById: vi.fn(),
  linkAgreementToOrder: vi.fn(),
}));
vi.mock('@/lib/services/queries/productOrderState', () => ({ setOrderStateAsBackend: vi.fn() }));
vi.mock('@/lib/services/queries/agreement', () => ({ createAgreement: vi.fn() }));
vi.mock('@/lib/services/queries/productInventory', () => ({ createProduct: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

import { retrievePaymentIntent } from '@/lib/services/payments/stripe';
import { createAgreement } from '@/lib/services/queries/agreement';
import { createProduct } from '@/lib/services/queries/productInventory';
import { fetchProductOrderById, linkAgreementToOrder } from '@/lib/services/queries/productOrder';
import {
  completeProductOrderPayment,
  reconcileProductOrderPayment,
} from '@/lib/services/queries/productOrderPayment';
import { setOrderStateAsBackend } from '@/lib/services/queries/productOrderState';
import { getSession } from '@/lib/session';
import { trackError } from '@/lib/utils/sentry';
import type { ProductOrder } from '@/types/api';

const BASE = 'https://transactionlog.test';
const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';
const OFFER_ID = 'urn:ngsi-ld:productOffering:off-1';
const BUYER_ID = 'urn:ngsi-ld:organization:buyer-1';
const RECEIPT = {
  hash: '0xabc',
  id_product_order: ORDER_ID,
  id_product_offer: OFFER_ID,
  id_buyer: BUYER_ID,
  blockchain: { status: 'confirmed', error: null },
};

function baseOrder(overrides: Partial<ProductOrder> = {}): ProductOrder {
  return {
    id: ORDER_ID,
    state: 'acknowledged',
    externalId: 'pi_123',
    relatedParty: [{ id: BUYER_ID, role: 'Customer' }],
    productOrderItem: [{ productOffering: { id: OFFER_ID, name: 'Dataset X' } }],
    ...overrides,
  } as ProductOrder;
}

function installFetch(status = 201, body: unknown = RECEIPT) {
  const mock = vi.fn<typeof fetch>(
    async () =>
      ({
        status,
        ok: status < 300,
        text: () => Promise.resolve(JSON.stringify(body)),
      }) as unknown as Response,
  );
  global.fetch = mock;
  return mock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TRANSACTION_LOG_BASE_URL', BASE);
  vi.stubEnv('TRANSACTION_LOG_USER', '');
  vi.stubEnv('TRANSACTION_LOG_PASSWORD', '');
  vi.mocked(getSession).mockResolvedValue({ userProfile: { organizationId: BUYER_ID } } as never);
  vi.mocked(fetchProductOrderById).mockResolvedValue(baseOrder());
  vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);
  vi.mocked(setOrderStateAsBackend).mockImplementation(
    async (id, state) => ({ ...baseOrder(), id, state }) as ProductOrder,
  );
  vi.mocked(createAgreement).mockResolvedValue({
    id: 'agr-1',
    name: 'A',
    agreementItem: [{}],
    engagedParty: [],
  } as never);
  vi.mocked(linkAgreementToOrder).mockResolvedValue(baseOrder({ state: 'completed' }));
  vi.mocked(createProduct).mockResolvedValue({ id: 'prod-1' } as never);
});
afterEach(() => vi.unstubAllEnvs());

describe('Trazabilidad de compras (integración con el registro inmutable)', () => {
  it('completeProductOrderPayment: tras completar hace POST /transactions con los IDs de la compra', async () => {
    const fetchMock = installFetch();
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/transactions`);
    expect(JSON.parse(String(init?.body))).toEqual({
      id_product_order: ORDER_ID,
      id_product_offer: OFFER_ID,
      id_buyer: BUYER_ID,
    });
    expect(init?.headers as Record<string, string>).not.toHaveProperty('Authorization');
    expect(trackError).not.toHaveBeenCalled();
  });

  it('con credenciales https envía Basic Auth', async () => {
    vi.stubEnv('TRANSACTION_LOG_USER', 'svc');
    vi.stubEnv('TRANSACTION_LOG_PASSWORD', 's3cret');
    const fetchMock = installFetch();
    await completeProductOrderPayment(ORDER_ID);

    const init = fetchMock.mock.calls[0][1];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('svc:s3cret').toString('base64')}`,
    );
  });

  it('reconcileProductOrderPayment también registra la compra', async () => {
    const fetchMock = installFetch();
    const result = await reconcileProductOrderPayment(baseOrder());

    expect(result?.state).toBe('completed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('una orden ya completada con acuerdo no se vuelve a registrar', async () => {
    const done = baseOrder({ state: 'completed', agreement: [{ id: 'agr-0' }] as never });
    vi.mocked(fetchProductOrderById).mockResolvedValue(done);
    const fetchMock = installFetch();
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el registro responde 503 la compra se completa y el fallo va a Sentry', async () => {
    const fetchMock = installFetch(503, { error: 'down' });
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(trackError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'TransactionLog (transactions): HTTP 503' }),
      { orderId: ORDER_ID },
    );
  });

  it('si el registro no es alcanzable (red/timeout) la compra se completa', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(true);
    expect(trackError).toHaveBeenCalledTimes(1);
  });

  it('sin TRANSACTION_LOG_BASE_URL la compra se completa, sin llamada de red', async () => {
    vi.stubEnv('TRANSACTION_LOG_BASE_URL', '');
    const fetchMock = installFetch();
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(trackError).toHaveBeenCalledTimes(1);
  });

  it('un pago no confirmado en Stripe no registra nada', async () => {
    vi.mocked(retrievePaymentIntent).mockResolvedValue({
      status: 'requires_payment_method',
    } as never);
    const fetchMock = installFetch();
    const result = await completeProductOrderPayment(ORDER_ID);

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
