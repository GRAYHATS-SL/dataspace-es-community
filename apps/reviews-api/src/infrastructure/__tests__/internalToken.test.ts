import crypto from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { verifyInternalToken } from '@infrastructure/internalToken.js';

const SECRET = 'a-very-long-shared-secret-used-only-in-tests';
const OFFERING_ID = 'offering-1';

const signToken = (payload: Record<string, unknown>, secret = SECRET): string => {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
};

const validPayload = (overrides?: Record<string, unknown>) => ({
  sub: 'user-1',
  iat: Date.now(),
  ...overrides,
});

describe('verifyInternalToken', () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  it('accepts a valid token and returns the payload', () => {
    const result = verifyInternalToken(signToken(validPayload()), OFFERING_ID);

    expect(result).toEqual({ ok: true, value: { sub: 'user-1' } });
  });

  it('accepts a valid token without sub', () => {
    const result = verifyInternalToken(signToken({ iat: Date.now() }), OFFERING_ID);

    expect(result).toEqual({ ok: true, value: {} });
  });

  it('accepts a token bound to the route offering', () => {
    const result = verifyInternalToken(signToken(validPayload({ offeringId: OFFERING_ID })), OFFERING_ID);

    expect(result.ok).toBe(true);
  });

  it('rejects a token bound to another offering', () => {
    const result = verifyInternalToken(signToken(validPayload({ offeringId: 'offering-2' })), OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects an expired token (60s TTL exceeded)', () => {
    const result = verifyInternalToken(signToken(validPayload({ iat: Date.now() - 61_000 })), OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects a token with iat in the future', () => {
    const result = verifyInternalToken(signToken(validPayload({ iat: Date.now() + 5_000 })), OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects a token with a wrong signature', () => {
    const token = signToken(validPayload(), 'another-completely-different-secret');

    expect(verifyInternalToken(token, OFFERING_ID)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects a payload with an invalid shape', () => {
    const token = signToken({ sub: 42, iat: Date.now() });

    expect(verifyInternalToken(token, OFFERING_ID)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects a malformed token', () => {
    expect(verifyInternalToken('token-without-valid-format', OFFERING_ID)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects when TOKEN_SECRET is not configured', () => {
    delete process.env.TOKEN_SECRET;

    expect(verifyInternalToken(signToken(validPayload()), OFFERING_ID)).toEqual({ ok: false, error: 'invalid' });
  });
});
