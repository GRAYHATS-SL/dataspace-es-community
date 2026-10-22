// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateToken, verifySignedToken } from '@/lib/utils/tokens';

const SECRET = 'test-secret-value';

beforeEach(() => vi.stubEnv('TOKEN_SECRET', SECRET));
afterEach(() => vi.unstubAllEnvs());

describe('generateToken', () => {
  it('throws when TOKEN_SECRET is not set', async () => {
    vi.stubEnv('TOKEN_SECRET', '');
    await expect(generateToken('user-1')).rejects.toThrow('TOKEN_SECRET');
  });

  it('returns a token with format userId.timestamp.signature', async () => {
    const token = await generateToken('user-1');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('user-1');
    expect(Number(parts[1])).not.toBeNaN();
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/); // hex SHA-256
  });
});

describe('verifySignedToken', () => {
  it('returns false when TOKEN_SECRET is not set', async () => {
    vi.stubEnv('TOKEN_SECRET', '');
    expect(await verifySignedToken(`user-1.${Date.now()}.fakesig`)).toBe(false);
  });

  it('returns false for a token that does not have 3 parts', async () => {
    expect(await verifySignedToken('only.two')).toBe(false);
  });

  it('returns false when the timestamp is not a number', async () => {
    expect(await verifySignedToken('user-1.notanumber.fakesig')).toBe(false);
  });

  it('returns false for a token older than 7 days', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    // Build a properly-signed but expired token
    const crypto = await import('crypto');
    const data = `user-1.${eightDaysAgo}`;
    const sig = crypto.createHmac('sha256', SECRET).update(data).digest('hex');
    expect(await verifySignedToken(`user-1.${eightDaysAgo}.${sig}`)).toBe(false);
  });

  it('returns false when the signature has been tampered with (same length)', async () => {
    const token = await generateToken('user-1');
    const [userId, ts, signature] = token.split('.');
    const flippedChar = signature[0] === 'a' ? 'b' : 'a';
    const tamperedSignature = flippedChar + signature.slice(1);
    expect(await verifySignedToken(`${userId}.${ts}.${tamperedSignature}`)).toBe(false);
  });

  it('returns false when the signature has a different length', async () => {
    const token = await generateToken('user-1');
    const [userId, ts] = token.split('.');
    expect(await verifySignedToken(`${userId}.${ts}.tooshort`)).toBe(false);
  });

  it('returns true for a valid token', async () => {
    const token = await generateToken('user-42');
    expect(await verifySignedToken(token)).toBe(true);
  });
});
