// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { getJWTExp, isJWTExpired } from '@/lib/utils/jwtEdge';

/** Builds a minimal unsigned JWT-like token for testing. */
function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.fake-sig`;
}

const PAST_EXP = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead

describe('isJWTExpired', () => {
  it('returns true when exp is in the past', () => {
    expect(isJWTExpired(makeToken({ exp: PAST_EXP }))).toBe(true);
  });

  it('returns false when exp is in the future', () => {
    expect(isJWTExpired(makeToken({ exp: FUTURE_EXP }))).toBe(false);
  });

  it('returns true for a token with fewer than 3 segments', () => {
    expect(isJWTExpired('only.two')).toBe(true);
  });

  it('returns true for a token with more than 3 segments', () => {
    expect(isJWTExpired('a.b.c.d')).toBe(true);
  });

  it('returns true when the payload is not valid JSON', () => {
    const badPayload = Buffer.from('not-json').toString('base64');
    expect(isJWTExpired(`header.${badPayload}.sig`)).toBe(true);
  });

  it('returns true when exp is absent from the payload', () => {
    expect(isJWTExpired(makeToken({ sub: 'user-id' }))).toBe(true);
  });

  it('returns true when exp is not a number', () => {
    expect(isJWTExpired(makeToken({ exp: 'tomorrow' }))).toBe(true);
  });
});

describe('getJWTExp', () => {
  it('returns the numeric exp from a valid token', () => {
    expect(getJWTExp(makeToken({ exp: FUTURE_EXP }))).toBe(FUTURE_EXP);
  });

  it('returns null for a token with fewer than 3 segments', () => {
    expect(getJWTExp('bad')).toBeNull();
  });

  it('returns null when exp is absent from the payload', () => {
    expect(getJWTExp(makeToken({ sub: 'user-id' }))).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    const badPayload = Buffer.from('not-json').toString('base64');
    expect(getJWTExp(`header.${badPayload}.sig`)).toBeNull();
  });
});
