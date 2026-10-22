// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/services/transactionLog', () => ({ registerTransaction: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));
vi.mock('@/lib/services/queries/productOrderState', () => ({ setOrderStateAsBackend: vi.fn() }));
vi.mock('@/lib/services/queries/agreement', () => ({ createAgreement: vi.fn() }));
vi.mock('@/lib/services/queries/productInventory', () => ({ createProduct: vi.fn() }));
vi.mock('@/lib/services/queries/productOrder', () => ({ linkAgreementToOrder: vi.fn() }));

import { createAgreement } from '@/lib/services/queries/agreement';
import { createProduct } from '@/lib/services/queries/productInventory';
import { linkAgreementToOrder } from '@/lib/services/queries/productOrder';
import { finalizeCompletedOrder } from '@/lib/services/queries/productOrderFinalize';
import { setOrderStateAsBackend } from '@/lib/services/queries/productOrderState';
import { registerTransaction } from '@/lib/services/transactionLog';
import { trackError } from '@/lib/utils/sentry';
import type { ProductOrder } from '@/types/api';

const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';
const OFFER_ID = 'urn:ngsi-ld:productOffering:off-1';
const BUYER_ID = 'urn:ngsi-ld:organization:buyer';

function baseOrder(overrides: Partial<ProductOrder> = {}): ProductOrder {
  return {
    id: ORDER_ID,
    state: 'acknowledged',
    relatedParty: [
      { id: 'urn:ngsi-ld:organization:seller', role: 'seller' },
      { id: BUYER_ID, role: 'Customer' },
    ],
    productOrderItem: [
      { id: '1', action: 'add', productOffering: { id: OFFER_ID, name: 'Oferta' } },
      { id: '2', action: 'add', productOffering: { id: 'otra', name: 'Otra' } },
    ],
    ...overrides,
  } as ProductOrder;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setOrderStateAsBackend).mockImplementation(async (id, state) => ({
    ...baseOrder(),
    id,
    state,
  }));
  vi.mocked(createAgreement).mockResolvedValue({
    id: 'agr-1',
    name: 'A',
    agreementItem: [{}],
    engagedParty: [],
  } as never);
  vi.mocked(linkAgreementToOrder).mockResolvedValue(baseOrder());
  vi.mocked(createProduct).mockResolvedValue({ id: 'prod-1' } as never);
  vi.mocked(registerTransaction).mockResolvedValue({
    hash: '0x1',
    blockchain: { status: 'confirmed' },
  } as never);
});

describe('finalizeCompletedOrder → registro inmutable', () => {
  it('registra una vez, con la orden, la oferta del primer ítem y la organización compradora', async () => {
    const result = await finalizeCompletedOrder(baseOrder());

    expect(result.ok).toBe(true);
    expect(registerTransaction).toHaveBeenCalledTimes(1);
    expect(registerTransaction).toHaveBeenCalledWith({
      id_product_order: ORDER_ID,
      id_product_offer: OFFER_ID,
      id_buyer: BUYER_ID,
    });
    expect(trackError).not.toHaveBeenCalled();
  });

  it('no registra si la orden ya está completada con acuerdo (camino idempotente)', async () => {
    vi.mocked(setOrderStateAsBackend).mockClear();
    const completed = baseOrder({ state: 'completed', agreement: [{ id: 'agr-0' }] as never });
    const result = await finalizeCompletedOrder(completed);

    expect(result.ok).toBe(true);
    expect(registerTransaction).not.toHaveBeenCalled();
  });

  it('no registra si falla un paso previo (agreement)', async () => {
    vi.mocked(createAgreement).mockRejectedValue(new Error('boom'));
    const result = await finalizeCompletedOrder(baseOrder());

    expect(result).toMatchObject({ ok: false, step: 'agreement' });
    expect(registerTransaction).not.toHaveBeenCalled();
  });

  it('si el registro falla, la compra sigue ok:true y el error va a Sentry', async () => {
    const error = new Error('TransactionLog (transactions): HTTP 503');
    vi.mocked(registerTransaction).mockRejectedValue(error);
    const result = await finalizeCompletedOrder(baseOrder());

    expect(result.ok).toBe(true);
    expect(trackError).toHaveBeenCalledWith(error, { orderId: ORDER_ID });
  });

  it('avisa en Sentry si el recibo no está confirmed, sin afectar a la compra', async () => {
    vi.mocked(registerTransaction).mockResolvedValue({
      hash: '0x1',
      blockchain: { status: 'pending' },
    } as never);
    const result = await finalizeCompletedOrder(baseOrder());

    expect(result.ok).toBe(true);
    expect(trackError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'TransactionLog: blockchain.status=pending' }),
      { orderId: ORDER_ID },
    );
  });

  it.each([
    ['sin oferta', { productOrderItem: [] }],
    ['sin comprador', { relatedParty: [{ id: 'x', role: 'seller' }] }],
    ['sin relatedParty', { relatedParty: undefined }],
  ])('%s: no llama a la API, reporta a Sentry y la compra sigue ok', async (_l, overrides) => {
    vi.mocked(setOrderStateAsBackend).mockImplementation(async (id, state) => ({
      ...baseOrder(overrides as Partial<ProductOrder>),
      id,
      state,
    }));
    const result = await finalizeCompletedOrder(baseOrder(overrides as Partial<ProductOrder>));

    expect(result.ok).toBe(true);
    expect(registerTransaction).not.toHaveBeenCalled();
    expect(trackError).toHaveBeenCalledTimes(1);
  });

  it('toma el comprador de la orden original si la completada no trae relatedParty', async () => {
    vi.mocked(setOrderStateAsBackend).mockImplementation(async (id, state) => ({
      ...baseOrder({ relatedParty: undefined }),
      id,
      state,
    }));
    await finalizeCompletedOrder(baseOrder());

    expect(registerTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id_buyer: BUYER_ID }),
    );
  });
});
