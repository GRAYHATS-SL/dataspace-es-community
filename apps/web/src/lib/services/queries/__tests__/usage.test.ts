// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import { getUsagesByProduct } from '@/lib/services/queries/usage';
import { getSession } from '@/lib/session';
import type { Usage } from '@/types/api';

const TOKEN = 'test-access-token';
const PRODUCT_ID = 'urn:ngsi-ld:product:token-1';
const OTHER_PRODUCT_ID = 'urn:ngsi-ld:product:token-2';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { roles: ['ADMIN'], organizationId: 'org-1', sub: 'did:key:test' },
  } as Awaited<ReturnType<typeof getSession>>);
}

function usage(id: string, productId: string): Usage {
  return {
    id,
    usageDate: '2026-01-01T00:00:00Z',
    ratedProductUsage: [{ productRef: { id: productId } }],
  };
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


describe('getUsagesByProduct', () => {
  it('returns only usage records linked to the given product', async () => {
    const mine = usage('usage-1', PRODUCT_ID);
    const other = usage('usage-2', OTHER_PRODUCT_ID);
    global.fetch = vi.fn().mockResolvedValue(okResponse([mine, other]));
    const result = await getUsagesByProduct(PRODUCT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('usage-1');
  });

  it('returns an empty array when no usage matches the product', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([usage('usage-1', OTHER_PRODUCT_ID)]));
    expect(await getUsagesByProduct(PRODUCT_ID)).toHaveLength(0);
  });

  it('rejects when the backend call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(errorResponse(503));
    await expect(getUsagesByProduct(PRODUCT_ID)).rejects.toThrow('HTTP 503');
  });
});
