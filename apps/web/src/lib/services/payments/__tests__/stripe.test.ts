// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { paymentIntentsCreate } = vi.hoisted(() => ({ paymentIntentsCreate: vi.fn() }));

vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
});
vi.mock('stripe', () => ({
  default: class {
    paymentIntents = { create: paymentIntentsCreate };
  },
}));
vi.mock('@/lib/services/queries/_utils', () => ({
  getCurrentUserOrganizationId: vi.fn(),
  requireRole: vi.fn(),
}));
vi.mock('@/lib/services/queries/party', () => ({
  fetchOrganizationById: vi.fn(),
  upsertOrganizationCharacteristics: vi.fn(),
}));
vi.mock('@/lib/services/queries/productOffering', () => ({ fetchProductOfferingById: vi.fn() }));
vi.mock('@/lib/services/queries/productSpecification', () => ({
  getProductSpecificationById: vi.fn(),
}));

import { createPaymentIntent } from '@/lib/services/payments/stripe';
import { fetchOrganizationById } from '@/lib/services/queries/party';
import { fetchProductOfferingById } from '@/lib/services/queries/productOffering';
import { getProductSpecificationById } from '@/lib/services/queries/productSpecification';
import { CLOSED_PROVIDER_MESSAGE } from '@/lib/utils/organizationStatus';
import type { Organization, ProductOffering, ProductSpecification } from '@/types/api';

function arrange(status?: Organization['status']) {
  vi.mocked(fetchProductOfferingById).mockResolvedValue({
    id: 'off-1',
    productSpecification: { id: 'spec-1' },
  } as ProductOffering);
  vi.mocked(getProductSpecificationById).mockResolvedValue({
    relatedParty: [{ id: 'org-p', role: 'provider' }],
  } as ProductSpecification);
  vi.mocked(fetchOrganizationById).mockResolvedValue({
    id: 'org-p',
    status,
    partyCharacteristic: [
      { name: 'stripeConnectAccountId', value: 'acct_1' },
      { name: 'stripePayoutsEnabled', value: true },
    ],
  } as Organization);
  paymentIntentsCreate.mockResolvedValue({ id: 'pi_1', client_secret: 'secret' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('createPaymentIntent: organización proveedora', () => {
  it('no crea el PaymentIntent si el proveedor está closed', async () => {
    arrange('closed');
    await expect(createPaymentIntent(10, 'off-1', {})).rejects.toThrow(CLOSED_PROVIDER_MESSAGE);
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it.each([undefined, 'validated'] as const)('crea el PaymentIntent con status %s', async (status) => {
    arrange(status);
    const result = await createPaymentIntent(10, 'off-1', {});
    expect(result.id).toBe('pi_1');
    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ transfer_data: { destination: 'acct_1' } }),
    );
  });
});
