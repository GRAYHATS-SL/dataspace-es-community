// INTEGRATION test: hook (useCompleteProductOrderPayment / useReconcileProductOrderPayment) -> real service (productOrderPayment.ts, with all its business logic and error branches) -> real React Query cache invalidation. Unlike the unit test (useProductOrderPaymentMutations.test.tsx), which mocks the whole service, here the service really runs: only its external I/O dependencies are mocked (session, Stripe, and the TMForum order/agreement/product calls), just as a unit test mocks `fetch` at the lowest layer. This shows that the real orchestration (per-organization authorization, idempotency, ok:false propagation) reaches the hook intact.
import { renderHook, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCompleteProductOrderPayment,
  useReconcileProductOrderPayment,
} from '@/hooks/queries/useProductOrderPaymentMutations';
import { retrievePaymentIntent } from '@/lib/services/payments/stripe';
import { createAgreement } from '@/lib/services/queries/agreement';
import { createProduct } from '@/lib/services/queries/productInventory';
import { fetchProductOrderById, linkAgreementToOrder } from '@/lib/services/queries/productOrder';
import { setOrderStateAsBackend } from '@/lib/services/queries/productOrderState';
import { getSession } from '@/lib/session';
import type { Agreement, ProductInventory, ProductOrder } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const ORDER_ID = 'urn:ngsi-ld:productOrder:order-1';
const BUYER_ORG_ID = 'urn:ngsi-ld:organization:buyer-1';

function expectSettledInvalidation(invalidateSpy: MockInstance) {
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productOrders.all() });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.agreements.all() });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.productInventory.all() });
}

function baseOrder(overrides: Partial<ProductOrder> = {}): ProductOrder {
  return {
    id: ORDER_ID,
    state: 'acknowledged',
    relatedParty: [{ id: BUYER_ORG_ID, role: 'buyer' }],
    productOrderItem: [{ productOffering: { id: 'offering-1', name: 'Dataset X' } }],
    ...overrides,
  } as ProductOrder;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({
    userProfile: { organizationId: BUYER_ORG_ID },
  } as never);
});

describe('useCompleteProductOrderPayment (integracion con productOrderPayment.ts real)', () => {
  it('con pago succeeded en Stripe: transiciona, crea agreement, lo vincula, activa el producto y resuelve ok:true', async () => {
    const order = baseOrder({ externalId: 'pi_123' });
    vi.mocked(fetchProductOrderById).mockResolvedValue(order);
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);
    const completedOrder = { ...order, state: 'completed' } as ProductOrder;
    vi.mocked(setOrderStateAsBackend).mockResolvedValue(completedOrder);
    const agreement: Agreement = {
      id: 'agreement-1',
      name: 'Acuerdo de prueba',
      agreementType: 'dataSharing',
      engagedParty: [],
      agreementItem: [],
    };
    vi.mocked(createAgreement).mockResolvedValue(agreement);
    vi.mocked(linkAgreementToOrder).mockResolvedValue(completedOrder);
    const product = { id: 'product-1' } as ProductInventory;
    vi.mocked(createProduct).mockResolvedValue(product);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ok: true, order: completedOrder, agreement, product });
    expect(setOrderStateAsBackend).toHaveBeenCalledWith(ORDER_ID, 'completed');
    expect(linkAgreementToOrder).toHaveBeenCalledWith(ORDER_ID, agreement.id, expect.any(String));
    expectSettledInvalidation(invalidateSpy);
  });

  it('sin sesion de la organizacion compradora: la logica real de autorizacion produce ok:false y llega intacta al hook', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userProfile: { organizationId: 'urn:ngsi-ld:organization:otra-org' },
    } as never);
    vi.mocked(fetchProductOrderById).mockResolvedValue(baseOrder({ externalId: 'pi_123' }));

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      ok: false,
      step: 'unauthorized',
      message: 'Esta orden no pertenece a tu organización.',
    });
    expect(retrievePaymentIntent).not.toHaveBeenCalled();
    expectSettledInvalidation(invalidateSpy);
  });

  it('con el pago aun no confirmado en Stripe: propaga ok:false con el estado real de Stripe hasta el hook', async () => {
    vi.mocked(fetchProductOrderById).mockResolvedValue(baseOrder({ externalId: 'pi_123' }));
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'processing' } as never);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCompleteProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(ORDER_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      ok: false,
      step: 'payment',
      message: 'El pago todavía no se ha completado (estado: processing).',
    });
    expect(setOrderStateAsBackend).not.toHaveBeenCalled();
    expectSettledInvalidation(invalidateSpy);
  });
});

describe('useReconcileProductOrderPayment (integracion con productOrderPayment.ts real)', () => {
  it('con pago succeeded: completa la orden huerfana igual que el flujo de retorno de checkout', async () => {
    const order = baseOrder({ externalId: 'pi_456', state: 'pending' });
    vi.mocked(fetchProductOrderById).mockResolvedValue(order);
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'succeeded' } as never);
    const completedOrder = { ...order, state: 'completed' } as ProductOrder;
    vi.mocked(setOrderStateAsBackend).mockResolvedValue(completedOrder);
    vi.mocked(createAgreement).mockResolvedValue({
      id: 'agreement-2',
      name: 'Acuerdo de prueba 2',
      agreementType: 'dataSharing',
      engagedParty: [],
      agreementItem: [],
    });
    vi.mocked(linkAgreementToOrder).mockResolvedValue(completedOrder);
    vi.mocked(createProduct).mockResolvedValue({ id: 'product-2' } as ProductInventory);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(completedOrder);
    expectSettledInvalidation(invalidateSpy);
  });

  it('con pago cancelado en Stripe: rechaza la orden vía setOrderStateAsBackend (token del backend) y lo refleja en el hook', async () => {
    const order = baseOrder({ externalId: 'pi_789', state: 'held' });
    vi.mocked(fetchProductOrderById).mockResolvedValue(order);
    vi.mocked(retrievePaymentIntent).mockResolvedValue({ status: 'canceled' } as never);
    const rejectedOrder = { ...order, state: 'rejected' } as ProductOrder;
    vi.mocked(setOrderStateAsBackend).mockResolvedValue(rejectedOrder);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(setOrderStateAsBackend).toHaveBeenCalledWith(ORDER_ID, 'rejected');
    expect(result.current.data).toEqual(rejectedOrder);
    expectSettledInvalidation(invalidateSpy);
  });

  it('con una orden en un estado no reconciliable: no llama a Stripe y resuelve null, y aun asi invalida la cache', async () => {
    const order = baseOrder({ externalId: 'pi_999', state: 'completed' });
    vi.mocked(fetchProductOrderById).mockResolvedValue(order);

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReconcileProductOrderPayment(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(order);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(retrievePaymentIntent).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    expectSettledInvalidation(invalidateSpy);
  });
});
