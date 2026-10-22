import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentSessionQuery } from '@/hooks/queries/useSessionQuery';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

function okResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(''),
  };
}

function errorResponse(status: number, body = 'Internal Error') {
  return {
    ok: false,
    status,
    statusText: 'Server Error',
    json: () => Promise.reject(new Error('no json')),
    text: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── useCurrentSessionQuery ───────────────────────────────────────────────────

describe('useCurrentSessionQuery', () => {
  it('calls GET /api/auth/session with credentials include and cache no-store', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true, userProfile: null }) as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('resolves { ok: false, userProfile: null } without throwing on a 401 response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual({ ok: false, userProfile: null });
  });

  it('throws HTTP ${status}: ${body} for a non-401 error response, using res.text()', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, 'boom') as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('HTTP 500: boom');
  });

  it('falls back to res.statusText when res.text() rejects', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.reject(new Error('body stream unusable')),
    } as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('HTTP 503: Service Unavailable');
  });

  it('returns userProfile as-is when the ok response includes it', async () => {
    const userProfile = {
      name: 'Ada Lovelace',
      organization: 'Analytical Engines Ltd',
      sub: 'did:key:ada',
      roles: ['buyer'],
    };
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true, userProfile }) as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ok: true, userProfile });
  });

  it('normalizes a missing userProfile key to null on an ok response', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ ok: true }) as never);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ok: true, userProfile: null });
  });

  it('does not retry on failure — fetch is called exactly once before surfacing the error', async () => {
    // Deliberately NOT using createTestQueryClient here: that helper defaults queries to retry:false, which would mask the hook failing to disable retry itself. This uses a plain QueryClient (React Query's default retry: 3 with backoff) so the assertion only passes because the hook's own `retry: false` option overrides the client default.
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCurrentSessionQuery(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe('network down');
  });
});
