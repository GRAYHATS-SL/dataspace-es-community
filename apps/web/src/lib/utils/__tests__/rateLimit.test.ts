import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit, getClientIp } from '@/lib/utils/rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit and blocks the next one', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('k-limit', 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit('k-limit', 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps independent counters per key', () => {
    checkRateLimit('k-a', 1, 60_000);
    expect(checkRateLimit('k-a', 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit('k-b', 1, 60_000).allowed).toBe(true);
  });

  it('resets the counter once the window has elapsed', () => {
    checkRateLimit('k-reset', 1, 1_000);
    expect(checkRateLimit('k-reset', 1, 1_000).allowed).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(checkRateLimit('k-reset', 1, 1_000).allowed).toBe(true);
  });

  it('prunes expired buckets when the map is full', () => {
    for (let i = 0; i < 10_000; i++) checkRateLimit(`k-fill-${i}`, 1, 1_000);
    vi.advanceTimersByTime(1_001);
    expect(checkRateLimit('k-after-prune', 1, 1_000).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  it('uses the first hop of X-Forwarded-For', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to X-Real-IP and then to "unknown"', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
