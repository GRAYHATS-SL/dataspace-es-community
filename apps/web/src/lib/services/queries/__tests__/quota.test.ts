// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/services/quotaClient', () => ({ fetchProviderQuota: vi.fn() }));
vi.mock('@/lib/services/queries/party', () => ({
  fetchOrganizationById: vi.fn(),
  fetchOrganizations: vi.fn(),
}));
vi.mock('@/lib/services/queries/productOffering', () => ({ fetchProductOfferingById: vi.fn() }));
vi.mock('@/lib/services/queries/productSpecification', () => ({
  getProductSpecificationById: vi.fn(),
}));
vi.mock('@/lib/services/queries/productOrder', () => ({ fetchProductOrdersAsBuyer: vi.fn() }));
vi.mock('@/lib/services/queries/ownership', () => ({ getOwnedOfferings: vi.fn() }));

import { getOwnedOfferings } from '@/lib/services/queries/ownership';
import { fetchOrganizationById, fetchOrganizations } from '@/lib/services/queries/party';
import { fetchProductOfferingById } from '@/lib/services/queries/productOffering';
import { fetchProductOrdersAsBuyer } from '@/lib/services/queries/productOrder';
import { getProductSpecificationById } from '@/lib/services/queries/productSpecification';
import { fetchMyQuotas, fetchProviderQuotas } from '@/lib/services/queries/quota';
import { fetchProviderQuota } from '@/lib/services/quotaClient';
import { getSession } from '@/lib/session';
import { buildPolicyChar } from '@/lib/utils/productSpecPolicy';
import type { Organization, ProductOrder, ProductSpecification } from '@/types/api';

const MY_ORG = 'urn:org:me';
const PROVIDER = 'urn:org:provider02';
const PROVIDER_DID = 'did:web:provider02.dataspace.es';

const org = (id: string, did: string, extra: Partial<Organization> = {}): Organization => ({
  id,
  name: id,
  partyCharacteristic: [
    { name: 'did', value: did },
    {
      name: 'contractManagement',
      value: { address: 'https://contract.provider02.dataspace.es', scope: 'default' },
    },
  ],
  ...extra,
});

const spec = (withLimits = true): ProductSpecification => ({
  id: 'spec-1',
  relatedParty: [{ id: PROVIDER, role: 'provider', '@referredType': 'Organization' }],
  productSpecCharacteristic: [
    buildPolicyChar(
      {
        odrlPathRegex: '^/x$',
        odrlOfferId: 'provider02-cuota',
        ...(withLimits ? { odrlBytesLimit: 100, odrlRequestsLimit: 5 } : {}),
      },
      PROVIDER_DID,
      'https://x/policy/offer/a',
    ),
  ],
});

const order = (id: string, state: ProductOrder['state'], offeringId = 'off-1'): ProductOrder => ({
  id,
  state,
  productOrderItem: [{ id: '1', productOffering: { id: offeringId } }],
});

const quota = (over: Partial<Record<string, number | boolean>> = {}) => ({
  allowed: true,
  bytesCap: 100,
  bytesConsumed: 10,
  bytesOk: true,
  requestsCap: 5,
  requestsConsumed: 1,
  requestsOk: true,
  ...over,
});

function mockSession(roles: string[]) {
  vi.mocked(getSession).mockResolvedValue({
    userProfile: { roles, organizationId: MY_ORG, sub: 'did:web:person' },
  } as Awaited<ReturnType<typeof getSession>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchOrganizationById).mockImplementation(async (id) =>
    id === MY_ORG ? org(MY_ORG, 'did:web:consumer02.dataspace.es') : org(PROVIDER, PROVIDER_DID),
  );
  vi.mocked(fetchProductOfferingById).mockResolvedValue({
    id: 'off-1',
    name: 'Oferta',
    productSpecification: { id: 'spec-1' },
  });
  vi.mocked(getProductSpecificationById).mockResolvedValue(spec());
  vi.mocked(fetchProviderQuota).mockResolvedValue(quota());
});

describe('fetchMyQuotas', () => {
  it('exige rol BUYER', async () => {
    mockSession(['SELLER']);
    await expect(fetchMyQuotas()).rejects.toThrow('Forbidden');
  });

  it('consulta pedidos completed y cancelled, con el DID de MI organización', async () => {
    mockSession(['BUYER']);
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([
      order('o1', 'completed'),
      order('o2', 'completed'),
      order('o3', 'cancelled'),
      order('o4', 'pending', 'off-2'),
    ]);
    const entries = await fetchMyQuotas();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      offeringId: 'off-1',
      completedOrders: 2,
      cancelledOrders: 1,
    });
    expect(fetchProviderQuota).toHaveBeenCalledTimes(1);
    expect(fetchProviderQuota).toHaveBeenCalledWith({
      endpoints: {
        contractBase: 'https://contract.provider02.dataspace.es',
        verifierBase: 'https://verifier.provider02.dataspace.es',
      },
      consumerDid: 'did:web:consumer02.dataspace.es',
      offerId: 'provider02-cuota',
    });
    expect('view' in entries[0].outcome && entries[0].outcome.view.status).toBe('active');
  });

  it('no consulta ofertas sin tmf:offerId (ilimitadas)', async () => {
    mockSession(['BUYER']);
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([order('o1', 'completed')]);
    vi.mocked(getProductSpecificationById).mockResolvedValue({
      ...spec(),
      productSpecCharacteristic: [],
    });
    expect(await fetchMyQuotas()).toEqual([]);
    expect(fetchProviderQuota).not.toHaveBeenCalled();
  });

  it('un fallo del provider se devuelve como error de esa entrada', async () => {
    mockSession(['BUYER']);
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([order('o1', 'completed')]);
    vi.mocked(fetchProviderQuota).mockRejectedValue(new Error('Quota (quota): HTTP 403'));
    const [entry] = await fetchMyQuotas();
    expect(entry.outcome).toEqual({ error: 'Quota (quota): HTTP 403' });
  });

  it('no envía credenciales a una dirección no confiable', async () => {
    mockSession(['BUYER']);
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([order('o1', 'completed')]);
    vi.mocked(fetchOrganizationById).mockImplementation(async (id) =>
      id === MY_ORG
        ? org(MY_ORG, 'did:web:consumer02.dataspace.es')
        : {
            id: PROVIDER,
            partyCharacteristic: [
              { name: 'did', value: PROVIDER_DID },
              { name: 'contractManagement', value: { address: 'https://evil.example.com' } },
            ],
          },
    );
    const [entry] = await fetchMyQuotas();
    expect('error' in entry.outcome).toBe(true);
    expect(fetchProviderQuota).not.toHaveBeenCalled();
  });

  it('falla si mi organización no tiene DID', async () => {
    mockSession(['BUYER']);
    vi.mocked(fetchProductOrdersAsBuyer).mockResolvedValue([]);
    vi.mocked(fetchOrganizationById).mockResolvedValue({ id: MY_ORG, partyCharacteristic: [] });
    await expect(fetchMyQuotas()).rejects.toThrow('DID');
  });
});

describe('fetchProviderQuotas', () => {
  beforeEach(() => {
    vi.mocked(fetchOrganizationById).mockResolvedValue(org(MY_ORG, PROVIDER_DID));
    vi.mocked(getOwnedOfferings).mockResolvedValue([
      { id: 'off-1', name: 'Oferta', productSpecification: { id: 'spec-1' } },
    ]);
    vi.mocked(fetchOrganizations).mockResolvedValue([
      org(MY_ORG, PROVIDER_DID),
      org('urn:org:c1', 'did:web:consumer01.dataspace.es'),
      org('urn:org:c2', 'did:web:consumer02.dataspace.es'),
      org('urn:org:closed', 'did:web:consumer03.dataspace.es', { status: 'closed' }),
      org('urn:org:mkt', 'did:web:marketplacev2.dataspace.es'),
    ]);
  });

  it('exige rol SELLER', async () => {
    mockSession(['BUYER']);
    await expect(fetchProviderQuotas()).rejects.toThrow('Forbidden');
  });

  it('sondea solo consumers activos y devuelve los que tienen compra aplicada', async () => {
    mockSession(['SELLER']);
    vi.mocked(fetchProviderQuota).mockImplementation(async ({ consumerDid }) =>
      consumerDid.includes('consumer02')
        ? quota()
        : quota({ bytesCap: 0, requestsCap: 0, bytesConsumed: 0, requestsConsumed: 0 }),
    );
    const sweep = await fetchProviderQuotas();
    expect(sweep.scanned).toBe(2);
    expect(sweep.entries.map((e) => e.consumerDid)).toEqual(['did:web:consumer02.dataspace.es']);
    expect(sweep.errors).toEqual([]);
  });

  it('ignora ofertas ilimitadas', async () => {
    mockSession(['SELLER']);
    vi.mocked(getProductSpecificationById).mockResolvedValue(spec(false));
    const sweep = await fetchProviderQuotas();
    expect(sweep.scanned).toBe(0);
    expect(fetchProviderQuota).not.toHaveBeenCalled();
  });

  it('agrupa los errores repetidos', async () => {
    mockSession(['SELLER']);
    vi.mocked(fetchProviderQuota).mockRejectedValue(new Error('Quota (quota-token): HTTP 400'));
    const sweep = await fetchProviderQuotas();
    expect(sweep.entries).toEqual([]);
    expect(sweep.errors).toEqual(['Quota (quota-token): HTTP 400']);
  });
});
