// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/party', () => ({ fetchOrganizationById: vi.fn() }));
vi.mock('@/lib/services/queries/productOffering', () => ({ fetchProductOfferingById: vi.fn() }));
vi.mock('@/lib/services/queries/productSpecification', () => ({
  getProductSpecificationById: vi.fn(),
}));

import { assertOfferingsProviderActive } from '@/lib/services/queries/offeringProvider';
import { fetchOrganizationById } from '@/lib/services/queries/party';
import { fetchProductOfferingById } from '@/lib/services/queries/productOffering';
import { getProductSpecificationById } from '@/lib/services/queries/productSpecification';
import { CLOSED_PROVIDER_MESSAGE } from '@/lib/utils/organizationStatus';
import type { Organization, ProductOffering, ProductSpecification } from '@/types/api';

function arrange(providerId: string | undefined, status?: Organization['status']) {
  vi.mocked(fetchProductOfferingById).mockResolvedValue({
    id: 'off-1',
    productSpecification: { id: 'spec-1' },
  } as ProductOffering);
  vi.mocked(getProductSpecificationById).mockResolvedValue({
    relatedParty: providerId ? [{ id: providerId, role: 'provider' }] : [],
  } as ProductSpecification);
  vi.mocked(fetchOrganizationById).mockResolvedValue({ id: providerId, status } as Organization);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('assertOfferingsProviderActive', () => {
  it('rechaza con mensaje en español si el proveedor está closed', async () => {
    arrange('org-p', 'closed');
    await expect(assertOfferingsProviderActive(['off-1'])).rejects.toThrow(CLOSED_PROVIDER_MESSAGE);
  });

  it.each([undefined, 'initialized', 'validated'] as const)(
    'permite el proveedor con status %s',
    async (status) => {
      arrange('org-p', status);
      await expect(assertOfferingsProviderActive(['off-1'])).resolves.toBeUndefined();
    },
  );

  it('falla cerrado si no se puede determinar el proveedor', async () => {
    arrange(undefined);
    await expect(assertOfferingsProviderActive(['off-1'])).rejects.toThrow(
      'No se pudo determinar el proveedor',
    );
  });

  it('falla cerrado si la oferta no tiene especificación', async () => {
    vi.mocked(fetchProductOfferingById).mockResolvedValue({ id: 'off-1' } as ProductOffering);
    await expect(assertOfferingsProviderActive(['off-1'])).rejects.toThrow(
      'No se pudo determinar el proveedor',
    );
  });

  it('deduplica ofertas y organizaciones (una carga por proveedor)', async () => {
    arrange('org-p', 'validated');
    await assertOfferingsProviderActive(['off-1', 'off-1']);
    expect(fetchProductOfferingById).toHaveBeenCalledTimes(1);
    expect(fetchOrganizationById).toHaveBeenCalledTimes(1);
  });

  it('sin ofertas no consulta nada', async () => {
    await assertOfferingsProviderActive([]);
    expect(fetchProductOfferingById).not.toHaveBeenCalled();
  });
});
