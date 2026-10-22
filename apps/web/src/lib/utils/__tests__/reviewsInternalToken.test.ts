// @vitest-environment node
import crypto from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ReviewsInternalTokenPayload,
  signReviewsInternalToken,
} from '@/lib/utils/reviewsInternalToken';

const SECRET = 'test-secret-value';

const PAYLOAD: ReviewsInternalTokenPayload = {
  offeringId: 'urn:ngsi-ld:product-offering:off1',
  organizationId: 'urn:ngsi-ld:organization:org1',
  individualId: 'urn:ngsi-ld:individual:ind1',
};

beforeEach(() => vi.stubEnv('TOKEN_SECRET', SECRET));
afterEach(() => vi.unstubAllEnvs());

describe('signReviewsInternalToken', () => {
  it('throws when TOKEN_SECRET is not set', async () => {
    vi.stubEnv('TOKEN_SECRET', '');
    await expect(signReviewsInternalToken(PAYLOAD)).rejects.toThrow('TOKEN_SECRET');
  });

  it('returns a token with format base64urlPayload.hexSignature', async () => {
    const token = await signReviewsInternalToken(PAYLOAD);
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatch(/^[0-9a-f]{64}$/); // hex SHA-256
  });

  it('embeds the payload fields and an iat timestamp in the encoded portion', async () => {
    const before = Date.now();
    const token = await signReviewsInternalToken(PAYLOAD);
    const after = Date.now();
    const [payloadB64] = token.split('.');
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    expect(decoded).toMatchObject(PAYLOAD);
    expect(decoded.iat).toBeGreaterThanOrEqual(before);
    expect(decoded.iat).toBeLessThanOrEqual(after);
  });

  it('produces a signature verifiable with the same HMAC-SHA256 secret', async () => {
    const token = await signReviewsInternalToken(PAYLOAD);
    const [payloadB64, sig] = token.split('.');
     
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('hex');
    expect(sig).toBe(expectedSig);
  });

  it('produces a different signature when TOKEN_SECRET changes', async () => {
    const token = await signReviewsInternalToken(PAYLOAD);
    const [payloadB64, sig] = token.split('.');
     
    const otherSig = crypto.createHmac('sha256', 'other-secret').update(payloadB64).digest('hex');
    expect(sig).not.toBe(otherSig);
  });
});
