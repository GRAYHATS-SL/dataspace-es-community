// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  createResourceSpecification,
  deleteResourceSpecification,
  getResourceSpecificationById,
  getResourceSpecifications,
  patchResourceSpecification,
  publishResourceSpecification,
} from '@/lib/services/queries/resourceSpecification';
import { getSession } from '@/lib/session';
import type { ResourceSpecification } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const OTHER_ORG = 'urn:ngsi-ld:organization:other';
const TOKEN = 'test-access-token';
const SPEC_ID = 'urn:ngsi-ld:resourceSpecification:res-1';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: ORG_ID },
  } as Awaited<ReturnType<typeof getSession>>);
}

function spec(id: string, orgId = ORG_ID): ResourceSpecification {
  return {
    id,
    name: `Spec ${id}`,
    relatedParty: [{ id: orgId, role: 'provider', '@referredType': 'Organization' }],
  } as ResourceSpecification;
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

// ─── getResourceSpecifications ────────────────────────────────────────────────

describe('getResourceSpecifications', () => {
  it('calls GET /resourceSpecification?limit=100&offset=0', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await getResourceSpecifications();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/resourceSpecification?limit=100&offset=0'),
      expect.anything(),
    );
  });

  it('returns only specs belonging to the current org', async () => {
    const own = spec(SPEC_ID);
    const other = spec('urn:ngsi-ld:resourceSpecification:other', OTHER_ORG);
    global.fetch = vi.fn().mockResolvedValue(okResponse([own, other]));
    const result = await getResourceSpecifications();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SPEC_ID);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(getResourceSpecifications()).rejects.toThrow('HTTP 500');
  });
});

// ─── getResourceSpecificationById ────────────────────────────────────────────

describe('getResourceSpecificationById', () => {
  it('calls GET /resourceSpecification/{id}', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await getResourceSpecificationById(SPEC_ID);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/resourceSpecification/${SPEC_ID}`),
      expect.anything(),
    );
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(404));
    await expect(getResourceSpecificationById(SPEC_ID)).rejects.toThrow('HTTP 404');
  });
});

// ─── createResourceSpecification ─────────────────────────────────────────────

describe('createResourceSpecification', () => {
  it('calls POST with relatedParty injected', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API tráfico' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.relatedParty).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ORG_ID, role: 'provider' })]),
    );
  });

  it('defaults lifecycleStatus to Active when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API tráfico' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('Active');
  });

  it('includes optional description when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API', description: 'Desc' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.description).toBe('Desc');
  });

  it('omits description when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('description');
  });

  it('includes isBundle when explicitly set to false', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API', isBundle: false });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.isBundle).toBe(false);
  });

  it('strips resourceSpecCharacteristic from the POST body', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({
      name: 'API',
      resourceSpecCharacteristic: [{ name: 'char', valueType: 'string' }] as never,
    });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('resourceSpecCharacteristic');
  });

  it('overrides the default lifecycleStatus when explicitly provided', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await createResourceSpecification({ name: 'API tráfico', lifecycleStatus: 'In design' });
    const [, init] = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.lifecycleStatus).toBe('In design');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(createResourceSpecification({ name: 'API tráfico' })).rejects.toThrow('HTTP 500');
  });
});

// ─── patchResourceSpecification ───────────────────────────────────────────────

describe('patchResourceSpecification', () => {
  it('calls PATCH /resourceSpecification/{id} with the given payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(spec(SPEC_ID)));
    await patchResourceSpecification(SPEC_ID, { name: 'Updated' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/resourceSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
    );
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(500));
    await expect(patchResourceSpecification(SPEC_ID, { name: 'Updated' })).rejects.toThrow(
      'HTTP 500',
    );
  });
});

// ─── publishResourceSpecification ────────────────────────────────────────────

describe('publishResourceSpecification', () => {
  it('PATCHes with { lifecycleStatus: Launched }', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse({ ...spec(SPEC_ID), lifecycleStatus: 'Launched' }));
    await publishResourceSpecification(SPEC_ID);
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
    await expect(publishResourceSpecification(SPEC_ID)).rejects.toThrow('HTTP 500');
  });
});

// ─── deleteResourceSpecification ─────────────────────────────────────────────

describe('deleteResourceSpecification', () => {
  it('calls DELETE /resourceSpecification/{id} and returns void', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await expect(deleteResourceSpecification(SPEC_ID)).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/resourceSpecification/${SPEC_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
