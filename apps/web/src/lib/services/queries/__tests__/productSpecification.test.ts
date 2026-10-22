// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn(), getValidSession: vi.fn() }));
vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

import {
  applyOdrlCharacteristics,
  buildOdrlChars,
  createProductSpecification,
  createProductSpecificationWithPolicy,
  deleteProductSpecification,
  getProductSpecificationById,
  getProductSpecifications,
  getProductSpecificationsAll,
  getProductSpecificationsAllPublic,
  patchProductSpecification,
  patchProductSpecificationWithPolicy,
  publishProductSpecification,
  removeProductSpecResourceRef,
  removeProductSpecServiceRef,
} from '@/lib/services/queries/productSpecification';
import { getSession } from '@/lib/session';
import { trackError } from '@/lib/utils/sentry';
import type { ProductSpecification } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const SPEC_ID = 'urn:ngsi-ld:productSpecification:spec-1';
const RES_ID = 'urn:ngsi-ld:resourceSpecification:res-1';
const SVC_ID = 'urn:ngsi-ld:serviceSpecification:svc-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function spec(id: string, orgId = ORG_ID): ProductSpecification {
  return {
    id,
    name: `Spec ${id}`,
    relatedParty: [{ id: orgId, role: 'provider', '@referredType': 'Organization' }],
  } as ProductSpecification;
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
  mockSession();
});

// ─── getProductSpecifications ─────────────────────────────────────────────────

describe('getProductSpecifications', () => {
  it('calls GET /productSpecification?limit=100&offset=0', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getProductSpecifications();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productSpecification?limit=100&offset=0'),
      expect.anything(),
    );
  });

  it('returns only specs belonging to the current org', async () => {
    const own = spec(SPEC_ID);
    const other = spec('urn:ngsi-ld:productSpecification:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await getProductSpecifications();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SPEC_ID);
  });
});

// ─── getProductSpecificationsAll ──────────────────────────────────────────────

describe('getProductSpecificationsAll', () => {
  it('returns all specs without filtering by org', async () => {
    const own = spec(SPEC_ID);
    const other = spec('urn:ngsi-ld:productSpecification:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await getProductSpecificationsAll();
    expect(result).toHaveLength(2);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(getProductSpecificationsAll()).rejects.toThrow('HTTP 500');
  });
});

// ─── getProductSpecificationsAllPublic ────────────────────────────────────────

describe('getProductSpecificationsAllPublic', () => {
  it('calls GET /productSpecification?limit=100&offset=0 with no Authorization header', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getProductSpecificationsAllPublic();
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/productSpecification?limit=100&offset=0'),
      expect.anything(),
    );
    expect((init as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('returns all specs without filtering by org', async () => {
    const own = spec(SPEC_ID);
    const other = spec('urn:ngsi-ld:productSpecification:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await getProductSpecificationsAllPublic();
    expect(result).toHaveLength(2);
  });
});

// ─── getProductSpecificationById ──────────────────────────────────────────────

describe('getProductSpecificationById', () => {
  it('calls GET /productSpecification/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await getProductSpecificationById(SPEC_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productSpecification/${SPEC_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(getProductSpecificationById(SPEC_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createProductSpecification ───────────────────────────────────────────────

describe('createProductSpecification', () => {
  it('calls POST with relatedParty injected', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createProductSpecification({ name: 'Spec movilidad' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ORG_ID, role: 'provider' })]),
    );
  });

  it('passes productSpecCharacteristic through to the POST body when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    const chars = [{ name: 'meta', valueType: 'object' }];
    await createProductSpecification({
      name: 'Spec',
      productSpecCharacteristic: chars as never,
    });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.productSpecCharacteristic).toEqual(chars);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(createProductSpecification({ name: 'Spec movilidad' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── patchProductSpecification ────────────────────────────────────────────────

describe('patchProductSpecification', () => {
  it('calls PATCH /productSpecification/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await patchProductSpecification(SPEC_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(patchProductSpecification(SPEC_ID, { name: 'Updated' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── publishProductSpecification ─────────────────────────────────────────────

describe('publishProductSpecification', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...spec(SPEC_ID), lifecycleStatus: 'Launched' }));
    await publishProductSpecification(SPEC_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus: 'Launched' }),
      }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(publishProductSpecification(SPEC_ID)).rejects.toThrow('HTTP 500');
  });
});

// ─── deleteProductSpecification ───────────────────────────────────────────────

describe('deleteProductSpecification', () => {
  it('calls DELETE /productSpecification/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteProductSpecification(SPEC_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/productSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─── removeProductSpecResourceRef  🔴 ────────────────────────────────────────

describe('removeProductSpecResourceRef', () => {
  it('sends a single PATCH with the remaining refs', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    const current = [{ id: RES_ID }, { id: 'urn:ngsi-ld:resourceSpecification:keep' }];

    await removeProductSpecResourceRef(SPEC_ID, RES_ID, current);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      resourceSpecification: [{ id: 'urn:ngsi-ld:resourceSpecification:keep' }],
    });
  });

  it('sends an empty list when no refs remain after removal', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(spec(SPEC_ID)));
    await removeProductSpecResourceRef(SPEC_ID, RES_ID, [{ id: RES_ID }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ resourceSpecification: [] });
  });

  it('calls trackError and rethrows when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'));
    await expect(removeProductSpecResourceRef(SPEC_ID, RES_ID, [{ id: RES_ID }])).rejects.toThrow(
      'HTTP 502',
    );
    expect(trackError).toHaveBeenCalled();
  });
});

// ─── removeProductSpecServiceRef  🔴 ─────────────────────────────────────────

describe('removeProductSpecServiceRef', () => {
  it('sends a single PATCH with the remaining refs', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    const current = [{ id: SVC_ID }, { id: 'urn:ngsi-ld:serviceSpecification:keep' }];

    await removeProductSpecServiceRef(SPEC_ID, SVC_ID, current);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calls = vi.mocked(global.fetch).mock.calls;
    expect(JSON.parse((calls[0][1] as RequestInit).body as string)).toEqual({
      serviceSpecification: [{ id: 'urn:ngsi-ld:serviceSpecification:keep' }],
    });
  });

  it('sends an empty list when no refs remain after removal', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(okResponse(spec(SPEC_ID)));
    await removeProductSpecServiceRef(SPEC_ID, SVC_ID, [{ id: SVC_ID }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ serviceSpecification: [] });
  });

  it('calls trackError and rethrows when the PATCH fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'));
    await expect(removeProductSpecServiceRef(SPEC_ID, SVC_ID, [{ id: SVC_ID }])).rejects.toThrow(
      'HTTP 502',
    );
    expect(trackError).toHaveBeenCalled();
  });
});

// ─── Política de acceso v2 ────────────────────────────────────────────────────

const PROVIDER_DID = 'did:web:provider02.dataspace.es';
const POLICY = {
  odrlPathRegex: '^/(bytes/[0-9]+|anything/.*)$',
  odrlOfferId: 'httpbin-cuota',
  odrlBytesLimit: 51200,
  odrlRequestsLimit: 20,
};

type FetchCall = [string, RequestInit | undefined];
const callsWith = (method: string): FetchCall[] =>
  (vi.mocked(global.fetch).mock.calls as FetchCall[]).filter(([, i]) => i?.method === method);
const bodyOf = (call: FetchCall) => JSON.parse(call[1]?.body as string);

/** Fetch mock: organization with DID, current spec GET, and echo for POST/PATCH. */
function mockBackend(opts: { did?: string | null; current?: Partial<ProductSpecification> } = {}) {
  const did = opts.did === undefined ? PROVIDER_DID : opts.did;
  global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.includes('/party/v4/organization/'))
      return okResponse({
        id: ORG_ID,
        partyCharacteristic: did ? [{ name: 'did', value: did }] : [],
      });
    if (init?.method === 'POST' || init?.method === 'PATCH') return okResponse(spec(SPEC_ID));
    return okResponse({ ...spec(SPEC_ID), ...opts.current });
  });
}

describe('buildOdrlChars', () => {
  it('derives the uid from the did:web host and builds policy + fixed credential', async () => {
    mockBackend();
    const [policy, cred] = await buildOdrlChars({ ...POLICY, name: 'httpbin' });
    const v = policy.productSpecCharacteristicValue?.[0]?.value as Record<string, unknown>;
    expect(v['odrl:uid']).toBe('https://provider02.dataspace.es/policy/offer/httpbin-cuota');
    expect(v['tmf:offerId']).toBe('httpbin-cuota');
    expect(v['tmf:usageQuotaBytesLimit']).toBe(51200);
    expect(v['tmf:usageQuotaRequestsLimit']).toBe(20);
    expect(v['odrl:permission']).toMatchObject({ 'odrl:assigner': { '@id': PROVIDER_DID } });
    expect(cred.productSpecCharacteristicValue?.[0]?.value).toEqual({
      credentialsType: 'ConsumerCredential',
      claims: [],
    });
  });

  it('reads the organization from the session, never from the input', async () => {
    mockBackend();
    await buildOdrlChars({ ...POLICY, name: 'x', organizationId: 'urn:evil' } as never);
    const urls = vi.mocked(global.fetch).mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes(encodeURIComponent(ORG_ID)))).toBe(true);
    expect(urls.some((u) => u.includes('evil'))).toBe(false);
  });

  it('generates a slug-based uid for the unlimited offer and reuses an existing uid', async () => {
    mockBackend();
    const [unlimited] = await buildOdrlChars({ odrlPathRegex: '^/a$', name: 'Mi Spec' });
    const uid = (unlimited.productSpecCharacteristicValue?.[0]?.value as Record<string, unknown>)[
      'odrl:uid'
    ];
    expect(uid).toMatch(
      /^https:\/\/provider02\.dataspace\.es\/policy\/offer\/mi-spec-[0-9a-f]{8}$/,
    );
    const [reused] = await buildOdrlChars(
      { odrlPathRegex: '^/a$', name: 'Mi Spec' },
      'https://provider02.dataspace.es/policy/offer/previo',
    );
    expect(
      (reused.productSpecCharacteristicValue?.[0]?.value as Record<string, unknown>)['odrl:uid'],
    ).toBe('https://provider02.dataspace.es/policy/offer/previo');
  });

  it('fails with a clear error when the DID is not did:web or missing', async () => {
    mockBackend({ did: 'did:key:zabc' });
    await expect(buildOdrlChars(POLICY)).rejects.toThrow('did:web');
    mockBackend({ did: null });
    await expect(buildOdrlChars(POLICY)).rejects.toThrow('did:web');
  });

  it('ignores a non-string did value', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        okResponse({ id: ORG_ID, partyCharacteristic: [{ name: 'did', value: { x: 1 } }] }),
      );
    await expect(buildOdrlChars(POLICY)).rejects.toThrow('did:web');
  });
});

describe('createProductSpecificationWithPolicy', () => {
  it('creates the spec with ALL characteristics in a single POST (no PATCH)', async () => {
    mockBackend();
    const meta = { id: 'datasetMetadata', name: 'Metadatos', valueType: 'object' };
    await createProductSpecificationWithPolicy(
      { name: 'httpbin', productSpecCharacteristic: [meta] },
      POLICY,
    );
    expect(callsWith('POST')).toHaveLength(1);
    expect(callsWith('PATCH')).toHaveLength(0);
    const body = bodyOf(callsWith('POST')[0]);
    expect(body.productSpecCharacteristic.map((c: { id: string }) => c.id)).toEqual([
      'datasetMetadata',
      'policyConfig',
      'credentialsConfig',
    ]);
    expect(body.relatedParty).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ORG_ID, role: 'provider' })]),
    );
    expect(body).not.toHaveProperty('validFor');
    // The value travels as an object, not as JSON text.
    expect(typeof body.productSpecCharacteristic[1].productSpecCharacteristicValue[0].value).toBe(
      'object',
    );
  });

  it('works without extra characteristics and takes the name from the input', async () => {
    mockBackend();
    await createProductSpecificationWithPolicy({ name: 'Sin Medida' }, { odrlPathRegex: '^/a$' });
    const body = bodyOf(callsWith('POST')[0]);
    const uid =
      body.productSpecCharacteristic[0].productSpecCharacteristicValue[0].value['odrl:uid'];
    expect(uid).toContain('/policy/offer/sin-medida-');
  });

  it('does not POST anything when the DID is invalid', async () => {
    mockBackend({ did: 'did:key:z' });
    await expect(createProductSpecificationWithPolicy({ name: 'x' }, POLICY)).rejects.toThrow(
      'did:web',
    );
    expect(callsWith('POST')).toHaveLength(0);
  });
});

describe('patchProductSpecificationWithPolicy', () => {
  const metaOld = { id: 'datasetMetadata', name: 'old' };
  const metaNew = { id: 'datasetMetadata', name: 'new' };
  const token = { id: 'tokenOfferConfig', name: 'tok' };
  const custom = { name: 'custom', productSpecCharacteristicValue: [{ value: 'keep' }] };
  const v1Policy = {
    id: 'policyConfig',
    name: 'Política de acceso ODRL',
    valueType: 'authorizationPolicy',
    productSpecCharacteristicValue: [{ value: JSON.stringify({ 'odrl:uid': 'urn:policy:v1' }) }],
  };
  const v1Cred = {
    id: 'otraCred',
    name: 'Configuración de credenciales',
    valueType: 'credentialsConfiguration',
  };

  it('reads → merges by id/valueType → ONE PATCH with the complete list', async () => {
    mockBackend({
      current: { productSpecCharacteristic: [custom, metaOld, token, v1Policy, v1Cred] },
    });
    await patchProductSpecificationWithPolicy(
      SPEC_ID,
      { name: 'Nuevo', productSpecCharacteristic: [metaNew] },
      POLICY,
      ['tokenOfferConfig'],
    );
    expect(callsWith('PATCH')).toHaveLength(1);
    const body = bodyOf(callsWith('PATCH')[0]);
    expect(body.name).toBe('Nuevo');
    expect(
      body.productSpecCharacteristic.map((c: { id?: string; name: string }) => c.id ?? c.name),
    ).toEqual(['custom', 'datasetMetadata', 'policyConfig', 'credentialsConfig']);
    expect(body.productSpecCharacteristic[1].name).toBe('new');
    // v1 leftovers replaced, v2 policy as an object and v1 uid (urn:) not reused
    const policy = body.productSpecCharacteristic[2].productSpecCharacteristicValue[0].value;
    expect(policy['odrl:uid']).toBe('https://provider02.dataspace.es/policy/offer/httpbin-cuota');
    expect(body).not.toHaveProperty('relatedParty');
  });

  it('reuses the odrl:uid already stored in the specification', async () => {
    const stored = {
      id: 'policyConfig',
      valueType: 'authorizationPolicy',
      productSpecCharacteristicValue: [
        { value: { 'odrl:uid': 'https://provider02.dataspace.es/policy/offer/previo' } },
      ],
    };
    mockBackend({ current: { productSpecCharacteristic: [stored] } });
    await patchProductSpecificationWithPolicy(SPEC_ID, {}, POLICY);
    const body = bodyOf(callsWith('PATCH')[0]);
    expect(
      body.productSpecCharacteristic[0].productSpecCharacteristicValue[0].value['odrl:uid'],
    ).toBe('https://provider02.dataspace.es/policy/offer/previo');
  });

  it('uses the current spec name for the uid when the payload has none', async () => {
    mockBackend({ current: { name: 'Nombre Actual' } });
    await patchProductSpecificationWithPolicy(SPEC_ID, {}, { odrlPathRegex: '^/a$' });
    const body = bodyOf(callsWith('PATCH')[0]);
    expect(
      body.productSpecCharacteristic[0].productSpecCharacteristicValue[0].value['odrl:uid'],
    ).toContain('/policy/offer/nombre-actual-');
  });

  it('does not PATCH when the DID is invalid', async () => {
    mockBackend({ did: 'did:key:z' });
    await expect(patchProductSpecificationWithPolicy(SPEC_ID, {}, POLICY)).rejects.toThrow(
      'did:web',
    );
    expect(callsWith('PATCH')).toHaveLength(0);
  });

  it('rejects when the spec belongs to another organization', async () => {
    vi.mocked(getSession).mockResolvedValue({
      accessToken: TOKEN,
      userProfile: { roles: ['SELLER'], organizationId: ORG_ID },
    } as Awaited<ReturnType<typeof getSession>>);
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID, OTHER_ORG)));
    await expect(patchProductSpecificationWithPolicy(SPEC_ID, {}, POLICY)).rejects.toThrow();
    expect(callsWith('PATCH')).toHaveLength(0);
  });
});

describe('applyOdrlCharacteristics', () => {
  it('merges policy + credential with the existing chars in a single PATCH (v2 replaces lists)', async () => {
    const existing = { name: 'custom', productSpecCharacteristicValue: [{ value: 'keep' }] };
    mockBackend({ current: { productSpecCharacteristic: [existing] } });
    await applyOdrlCharacteristics(SPEC_ID, { ...POLICY, name: 'My Spec' });
    expect(callsWith('PATCH')).toHaveLength(1);
    const body = bodyOf(callsWith('PATCH')[0]);
    expect(body.productSpecCharacteristic[0]).toEqual(existing);
    expect(body.productSpecCharacteristic.map((c: { id?: string }) => c.id)).toEqual([
      undefined,
      'policyConfig',
      'credentialsConfig',
    ]);
  });
});
