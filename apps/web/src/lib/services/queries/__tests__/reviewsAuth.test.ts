// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));

import {
  assertActiveBuyerOwnership,
  issueReviewsInternalToken,
} from '@/lib/services/queries/reviewsAuth';
import { getSession } from '@/lib/session';
import { deriveReviewsAuthorId } from '@/lib/utils/reviewsAuthorId';
import type { ProductInventory } from '@/types/api';

const ORG_ID = 'urn:ngsi-ld:organization:org-123';
const EMAIL = 'ana@empresa.com';
const OFFERING_ID = 'urn:ngsi-ld:productOffering:offer-1';
const OTHER_OFFERING_ID = 'urn:ngsi-ld:productOffering:otra';
const OTHER_ORG_ID = 'urn:ngsi-ld:organization:otra';
const TOKEN = 'test-access-token';
const TOKEN_SECRET = 'a-very-long-shared-secret-used-only-in-tests';

function mockSession() {
  vi.mocked(getSession).mockResolvedValue({
    accessToken: TOKEN,
    userProfile: { organizationId: ORG_ID, email: EMAIL, sub: 'did:web:consumer02.dataspace.es' },
  } as Awaited<ReturnType<typeof getSession>>);
}

function okResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  };
}

function activeBuyerInventory(overrides?: Partial<ProductInventory>): ProductInventory {
  return {
    id: 'urn:ngsi-ld:product:prod-1',
    status: 'active',
    relatedParty: [{ id: ORG_ID, role: 'buyer', '@referredType': 'Organization' }],
    productOffering: { id: OFFERING_ID },
    ...overrides,
  } as ProductInventory;
}

beforeEach(() => {
  mockSession();
  process.env.TOKEN_SECRET = TOKEN_SECRET;
});

afterEach(() => {
  delete process.env.TOKEN_SECRET;
});

describe('assertActiveBuyerOwnership', () => {
  it('resuelve sin error si existe un ProductInventory activo de la oferta como comprador', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([activeBuyerInventory()]));
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).resolves.toBeUndefined();
  });

  it('lanza HTTP 403 si la organización no tiene ningún ProductInventory como comprador', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });

  it('lanza HTTP 403 si el ProductInventory de esa oferta no está activo', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse([activeBuyerInventory({ status: 'suspended' })]));
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });

  it('lanza HTTP 403 si el ProductInventory activo es de otra oferta', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        okResponse([activeBuyerInventory({ productOffering: { id: OTHER_OFFERING_ID } })]),
      );
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });

  it('lanza HTTP 403 si el ProductInventory activo no tiene productOffering', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okResponse([activeBuyerInventory({ productOffering: undefined })]));
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });

  it('lanza HTTP 403 si el ProductInventory activo de esa oferta pertenece a otra organización', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okResponse([
        activeBuyerInventory({
          relatedParty: [{ id: OTHER_ORG_ID, role: 'buyer', '@referredType': 'Organization' }],
        }),
      ]),
    );
    await expect(assertActiveBuyerOwnership(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });
});

describe('issueReviewsInternalToken', () => {
  it('no firma ningún token cuando la verificación de ownership falla', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([]));
    await expect(issueReviewsInternalToken(OFFERING_ID)).rejects.toThrow('HTTP 403');
  });

  it('firma un token cuyo payload incluye offeringId, organizationId e individualId (HMAC del email) tras verificar el ownership', async () => {
    global.fetch = vi.fn().mockResolvedValue(okResponse([activeBuyerInventory()]));

    const token = await issueReviewsInternalToken(OFFERING_ID);
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    expect(payload).toMatchObject({
      offeringId: OFFERING_ID,
      organizationId: ORG_ID,
      individualId: deriveReviewsAuthorId(EMAIL),
    });
    expect(payload.individualId).not.toContain(EMAIL);
    expect(typeof payload.iat).toBe('number');
  });
});
