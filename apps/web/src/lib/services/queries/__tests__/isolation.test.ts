// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn(), getValidSession: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

import { createCatalog, deleteCatalog, patchCatalog } from '@/lib/services/queries/catalog';
import { createCategory,fetchOwnCategories } from '@/lib/services/queries/category';
import { patchOrganization } from '@/lib/services/queries/party';
import { fetchProductById } from '@/lib/services/queries/productInventory';
import {
  createProductOffering,
  deleteProductOffering,
  setProductOfferingPriceRefs,
} from '@/lib/services/queries/productOffering';
import {
  createProductOfferingPrice,
  deleteProductOfferingPrice,
  getOwnProductOfferingPrices,
} from '@/lib/services/queries/productOfferingPrice';
import {
  createProductOrder,
  fetchProductOrderById,
  patchProductOrder,
} from '@/lib/services/queries/productOrder';
import { patchProductSpecification } from '@/lib/services/queries/productSpecification';
import { getUsagesByProduct } from '@/lib/services/queries/usage';
import { getSession } from '@/lib/session';

const ORG_A = 'urn:ngsi-ld:organization:A';
const ORG_B = 'urn:ngsi-ld:organization:B';

const rp = (id: string, role = 'provider') => [{ id, role, '@referredType': 'Organization' }];

function session(roles: string[], organizationId = ORG_A) {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: 'tok',
    userProfile: { roles, organizationId, sub: 'did:key:test' },
  } as Awaited<ReturnType<typeof getSession>>);
}

type Routes = Record<string, unknown>;

/** Routes `fetch` by URL substring (most specific first); unrouted calls return []. */
function mockBackend(routes: Routes) {
  const calls: { url: string; method: string; body?: string }[] = [];
  global.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body as string | undefined });
    // Key `POST /path` = that method only; `/path` = any method.
    const key = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((k) => {
        const m = /^(GET|POST|PATCH|DELETE) (.*)$/.exec(k);
        return m ? m[1] === method && url.includes(m[2]) : url.includes(k);
      });
    const data = key ? new Map(Object.entries(routes)).get(key) : [];
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(''),
    };
  }) as unknown as typeof fetch;
  return { calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

const CAT_B = 'urn:ngsi-ld:catalog:b1';
const CAT_A = 'urn:ngsi-ld:catalog:a1';
const SPEC_A = 'urn:ngsi-ld:productSpecification:a1';
const SPEC_B = 'urn:ngsi-ld:productSpecification:b1';
const OFF_A = 'urn:ngsi-ld:productOffering:a1';
const OFF_B = 'urn:ngsi-ld:productOffering:b1';
const PRICE_A = 'urn:ngsi-ld:productOfferingPrice:a1';
const PRICE_ORPHAN = 'urn:ngsi-ld:productOfferingPrice:orphan';
const PRICE_B = 'urn:ngsi-ld:productOfferingPrice:b1';

const CATALOG_URL = '/productCatalogManagement/v4/catalog/';
const SPEC_URL = '/productCatalogManagement/v4/productSpecification/';
const OFFERING_URL = '/productCatalogManagement/v4/productOffering/';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('catálogos: org A no modifica lo de org B', () => {
  const backend = () =>
    mockBackend({
      [`${CATALOG_URL}${encodeURIComponent(CAT_B)}`]: { id: CAT_B, relatedParty: rp(ORG_B) },
      [`${CATALOG_URL}${encodeURIComponent(CAT_A)}`]: { id: CAT_A, relatedParty: rp(ORG_A) },
    });

  it('SELLER de A no puede patch/delete un catálogo de B (y no se emite ninguna escritura)', async () => {
    session(['SELLER']);
    const b = backend();
    await expect(patchCatalog(CAT_B, { name: 'x' })).rejects.toThrow(/Forbidden/);
    await expect(deleteCatalog(CAT_B)).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('SELLER de A puede modificar el suyo y no puede transferir la propiedad vía relatedParty', async () => {
    session(['SELLER']);
    const b = backend();
    await patchCatalog(CAT_A, { name: 'ok', relatedParty: rp(ORG_B) });
    const [write] = b.writes();
    expect(write.method).toBe('PATCH');
    expect(JSON.parse(write.body ?? '{}')).toEqual({ name: 'ok' });
  });

  it('ADMIN puede operar sobre cualquier catálogo', async () => {
    session(['ADMIN']);
    const b = backend();
    await deleteCatalog(CAT_B);
    expect(b.writes()).toHaveLength(1);
  });

  it('un usuario sin rol SELLER no puede crear catálogos', async () => {
    session(['BUYER']);
    mockBackend({});
    await expect(createCatalog({ name: 'x' } as never)).rejects.toThrow(/Forbidden/);
  });
});

describe('especificaciones y ofertas: propiedad por spec', () => {
  const backend = (extra: Routes = {}) =>
    mockBackend({
      [`${SPEC_URL}${encodeURIComponent(SPEC_B)}`]: { id: SPEC_B, relatedParty: rp(ORG_B) },
      [`${SPEC_URL}${encodeURIComponent(SPEC_A)}`]: { id: SPEC_A, relatedParty: rp(ORG_A) },
      [`${OFFERING_URL}${encodeURIComponent(OFF_B)}`]: {
        id: OFF_B,
        productSpecification: { id: SPEC_B },
      },
      [`${OFFERING_URL}${encodeURIComponent(OFF_A)}`]: {
        id: OFF_A,
        productSpecification: { id: SPEC_A },
      },
      ...extra,
    });

  it('no se puede patch una spec de otra organización', async () => {
    session(['SELLER']);
    const b = backend();
    await expect(patchProductSpecification(SPEC_B, { name: 'x' })).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('no se puede borrar una oferta cuya spec es de otra organización', async () => {
    session(['SELLER']);
    const b = backend();
    await expect(deleteProductOffering(OFF_B)).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('se puede borrar una oferta propia', async () => {
    session(['SELLER']);
    const b = backend();
    await deleteProductOffering(OFF_A);
    expect(b.writes()).toHaveLength(1);
  });

  it('no se puede crear una oferta apuntando a la spec de otra organización', async () => {
    session(['SELLER']);
    const b = backend();
    await expect(
      createProductOffering({ name: 'x', productSpecification: { id: SPEC_B } } as never),
    ).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('no se puede vincular a una oferta propia un precio ajeno', async () => {
    session(['SELLER']);
    const b = backend({
      '/productOffering?': [{ id: OFF_B, productSpecification: { id: SPEC_B }, productOfferingPrice: [{ id: PRICE_B }] }],
      '/productSpecification?': [{ id: SPEC_B, relatedParty: rp(ORG_B) }],
      '/party/v4/organization/': { id: ORG_A, partyCharacteristic: [] },
    });
    await expect(setProductOfferingPriceRefs(OFF_A, [PRICE_B])).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });
});

describe('precios: sin relatedParty, propiedad por marca `provider` u oferta propia', () => {
  const ownerMark = (org: string) => [
    { name: 'provider', productSpecCharacteristicValue: [{ value: org }] },
  ];
  const priceRoutes = (orphanMark?: unknown): Routes => ({
    '/productOfferingPrice?': [
      { id: PRICE_A },
      { id: PRICE_ORPHAN, ...(orphanMark ? { prodSpecCharValueUse: orphanMark } : {}) },
      { id: PRICE_B },
    ],
    '/productOffering?': [
      { id: OFF_A, productSpecification: { id: SPEC_A }, productOfferingPrice: [{ id: PRICE_A }] },
      { id: OFF_B, productSpecification: { id: SPEC_B }, productOfferingPrice: [{ id: PRICE_B }] },
    ],
    '/productSpecification?': [
      { id: SPEC_A, relatedParty: rp(ORG_A) },
      { id: SPEC_B, relatedParty: rp(ORG_B) },
    ],
    [`/party/v4/organization/${encodeURIComponent(ORG_A)}`]: {
      id: ORG_A,
      partyCharacteristic: [],
    },
  });

  it('un precio recién creado y sin vincular es visible para su creador (y los de B no)', async () => {
    session(['SELLER']);
    mockBackend(priceRoutes(ownerMark(ORG_A)));
    const own = await getOwnProductOfferingPrices();
    expect(own.map((p) => p.id).sort()).toEqual([PRICE_A, PRICE_ORPHAN].sort());
  });

  it('acepta la marca como valor suelto (TMF devuelve las listas de un elemento sin array)', async () => {
    session(['SELLER']);
    mockBackend(
      priceRoutes({ name: 'provider', productSpecCharacteristicValue: { value: ORG_A } }),
    );
    const own = await getOwnProductOfferingPrices();
    expect(own.map((p) => p.id)).toContain(PRICE_ORPHAN);
  });

  it('un precio sin vincular marcado por otra organización no es visible', async () => {
    session(['SELLER']);
    mockBackend(priceRoutes(ownerMark(ORG_B)));
    const own = await getOwnProductOfferingPrices();
    expect(own.map((p) => p.id)).toEqual([PRICE_A]);
  });

  it('crear un precio lo marca con la organización de la sesión, sin tocar la organización', async () => {
    session(['SELLER']);
    const b = mockBackend({
      ...priceRoutes(),
      'POST /productOfferingPrice': { id: PRICE_ORPHAN },
    });
    await createProductOfferingPrice({ name: 'p', priceType: 'one time' });
    const post = b.writes().find((c) => c.method === 'POST' && c.url.includes('/productOfferingPrice'));
    expect(post?.body).toContain('prodSpecCharValueUse');
    expect(post?.body).toContain('"provider"');
    expect(post?.body).toContain(ORG_A);
    expect(b.writes().some((c) => c.url.includes('/party/v4/organization/'))).toBe(false);
  });

  it('al crear un precio conserva la descripción y los parámetros de cotización dinámica', async () => {
    session(['SELLER']);
    const b = mockBackend({
      ...priceRoutes(),
      'POST /productOfferingPrice': { id: PRICE_ORPHAN },
    });
    await createProductOfferingPrice({
      name: 'p',
      description: 'qué incluye',
      priceType: 'one time',
      pricingLogicAlgorithm: [{ description: '{"P0":5}' }],
    });
    const post = b.writes().find((c) => c.method === 'POST' && c.url.includes('/productOfferingPrice'));
    expect(post?.body).toContain('"description":"qué incluye"');
    expect(post?.body).toContain('pricingLogicAlgorithm');
    expect(post?.body).toContain('P0');
  });

  it('no se puede borrar un precio de otra organización', async () => {
    session(['SELLER']);
    const b = mockBackend(priceRoutes());
    await expect(deleteProductOfferingPrice(PRICE_B)).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('se puede borrar un precio propio aunque no esté vinculado', async () => {
    session(['SELLER']);
    const b = mockBackend(priceRoutes(ownerMark(ORG_A)));
    await deleteProductOfferingPrice(PRICE_ORPHAN);
    expect(b.writes()).toHaveLength(1);
  });
});

describe('categorías: solo ADMIN escribe', () => {
  it('SELLER no puede crear categorías', async () => {
    session(['SELLER']);
    const b = mockBackend({});
    await expect(createCategory({ name: 'x' } as never)).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('ADMIN crea y ve todas las categorías (también las recién creadas sin vincular)', async () => {
    session(['ADMIN']);
    mockBackend({ '/category?': [{ id: 'c1' }, { id: 'c2' }] });
    await createCategory({ name: 'x' } as never);
    expect((await fetchOwnCategories()).map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('SELLER solo ve las categorías de sus catálogos y ofertas', async () => {
    session(['SELLER']);
    mockBackend({
      '/category?': [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
      '/catalog?': [
        { id: CAT_A, relatedParty: rp(ORG_A), category: [{ id: 'c1' }] },
        { id: CAT_B, relatedParty: rp(ORG_B), category: [{ id: 'c3' }] },
      ],
      '/productOffering?': [
        { id: OFF_A, productSpecification: { id: SPEC_A }, category: [{ id: 'c2' }] },
      ],
      '/productSpecification?': [{ id: SPEC_A, relatedParty: rp(ORG_A) }],
    });
    expect((await fetchOwnCategories()).map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });
});

describe('pedidos, inventario y uso', () => {
  const ORDER = 'urn:ngsi-ld:productOrder:o1';
  const orderOf = (buyer: string, seller: string) => ({
    id: ORDER,
    relatedParty: [...rp(buyer, 'buyer'), ...rp(seller, 'seller')],
  });

  it('un tercero no puede leer ni modificar un pedido ajeno', async () => {
    session(['BUYER', 'SELLER']);
    const b = mockBackend({ [`/productOrder/${encodeURIComponent(ORDER)}`]: orderOf(ORG_B, 'urn:ngsi-ld:organization:C') });
    await expect(fetchProductOrderById(ORDER)).rejects.toThrow(/Forbidden/);
    await expect(patchProductOrder(ORDER, { state: 'completed' })).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
  });

  it('comprador y vendedor del pedido sí pueden operar', async () => {
    session(['SELLER']);
    const b = mockBackend({ [`/productOrder/${encodeURIComponent(ORDER)}`]: orderOf(ORG_B, ORG_A) });
    await patchProductOrder(ORDER, { state: 'inProgress' });
    expect(b.writes()).toHaveLength(1);
  });

  it('createProductOrder exige BUYER y fija el comprador desde la sesión', async () => {
    session(['SELLER']);
    mockBackend({});
    const payload = { relatedParty: [...rp(ORG_B, 'buyer'), ...rp(ORG_B, 'seller')] } as never;
    await expect(createProductOrder(payload)).rejects.toThrow(/Forbidden/);

    session(['BUYER']);
    const b = mockBackend({ 'POST /productOrder': {} });
    await createProductOrder(payload);
    const body = JSON.parse(b.writes()[0].body ?? '{}') as { relatedParty: { id: string; role: string }[] };
    // v2: the buyer goes as a `Customer` set from the session; the client's `buyer` is discarded.
    const customers = body.relatedParty.filter((p) => p.role === 'Customer');
    expect(customers).toEqual([expect.objectContaining({ id: ORG_A })]);
    expect(body.relatedParty.some((p) => p.role === 'buyer')).toBe(false);
    expect(body.relatedParty).toContainEqual(expect.objectContaining({ id: ORG_B, role: 'seller' }));
  });

  it('un producto de inventario ajeno no se puede leer ni consultar su uso', async () => {
    session(['BUYER']);
    mockBackend({
      '/productInventory/v4/product/': { id: 'p1', relatedParty: [...rp(ORG_B, 'buyer'), ...rp(ORG_B, 'seller')] },
    });
    await expect(fetchProductById('p1')).rejects.toThrow(/Forbidden/);
    await expect(getUsagesByProduct('p1')).rejects.toThrow(/Forbidden/);
  });
});

describe('organización: solo la propia', () => {
  it('no se puede patch otra organización; la propia sí', async () => {
    session(['SELLER']);
    const b = mockBackend({});
    await expect(patchOrganization(ORG_B, { name: 'hack' })).rejects.toThrow(/Forbidden/);
    expect(b.writes()).toHaveLength(0);
    await patchOrganization(ORG_A, { name: 'mi org' });
    expect(b.writes()).toHaveLength(1);
  });
});
