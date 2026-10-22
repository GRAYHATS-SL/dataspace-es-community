// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createServiceSpecification,
  deleteServiceSpecification,
  getServiceSpecificationById,
  getServiceSpecifications,
  patchServiceSpecification,
  publishServiceSpecification,
} from '@/lib/services/queries/serviceSpecification';
import { getSession } from '@/lib/session';
import type { ServiceSpecification } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const SPEC_ID = 'urn:ngsi-ld:serviceSpecification:svc-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function spec(id: string, orgId = ORG_ID): ServiceSpecification {
  return {
    id,
    name: `Spec ${id}`,
    relatedParty: [{ id: orgId, role: 'provider', '@referredType': 'Organization' }],
  } as ServiceSpecification;
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

// ─── getServiceSpecifications ─────────────────────────────────────────────────

describe('getServiceSpecifications', () => {
  it('calls GET /serviceSpecification?limit=100&offset=0', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getServiceSpecifications();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/serviceSpecification?limit=100&offset=0'),
      expect.anything(),
    );
  });

  it('returns only specs belonging to the current org', async () => {
    const own = spec(SPEC_ID);
    const other = spec('urn:ngsi-ld:serviceSpecification:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await getServiceSpecifications();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SPEC_ID);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(getServiceSpecifications()).rejects.toThrow('HTTP 500');
  });
});

// ─── getServiceSpecificationById ──────────────────────────────────────────────

describe('getServiceSpecificationById', () => {
  it('calls GET /serviceSpecification/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await getServiceSpecificationById(SPEC_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/serviceSpecification/${SPEC_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(getServiceSpecificationById(SPEC_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createServiceSpecification ───────────────────────────────────────────────

describe('createServiceSpecification', () => {
  it('calls POST with relatedParty injected', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio climático' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ORG_ID, role: 'provider' })]),
    );
  });

  it('defaults lifecycleStatus to Active when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('Active');
  });

  it('includes optional description when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio', description: 'Mi servicio' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.description).toBe('Mi servicio');
  });

  it('omits description when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('description');
  });

  it('includes isBundle when explicitly set to true', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Bundle', isBundle: true });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.isBundle).toBe(true);
  });

  it('includes specCharacteristic when the array is non-empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    const chars = [{ name: 'endpoint', valueType: 'string' }];
    await createServiceSpecification({ name: 'Servicio', specCharacteristic: chars as never });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.specCharacteristic).toEqual(chars);
  });

  it('omits specCharacteristic when the array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio', specCharacteristic: [] as never });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('specCharacteristic');
  });

  it('overrides the default lifecycleStatus when explicitly provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createServiceSpecification({ name: 'Servicio climático', lifecycleStatus: 'In design' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('In design');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(createServiceSpecification({ name: 'Servicio climático' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── patchServiceSpecification ────────────────────────────────────────────────

describe('patchServiceSpecification', () => {
  it('calls PATCH /serviceSpecification/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await patchServiceSpecification(SPEC_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/serviceSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(patchServiceSpecification(SPEC_ID, { name: 'Updated' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── publishServiceSpecification ─────────────────────────────────────────────

describe('publishServiceSpecification', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...spec(SPEC_ID), lifecycleStatus: 'Launched' }));
    await publishServiceSpecification(SPEC_ID);
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
    await expect(publishServiceSpecification(SPEC_ID)).rejects.toThrow('HTTP 500');
  });
});

// ─── deleteServiceSpecification ───────────────────────────────────────────────

describe('deleteServiceSpecification', () => {
  it('calls DELETE /serviceSpecification/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteServiceSpecification(SPEC_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/serviceSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
