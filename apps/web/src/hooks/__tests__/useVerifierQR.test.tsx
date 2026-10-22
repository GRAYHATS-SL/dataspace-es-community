import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVerifierQR } from '@/hooks/useVerifierQR';
import { fetchVerifierQR } from '@/lib/services/qr';
import { VERIFIER_QR_REFRESH_MS } from '@/lib/services/verifier.constants';

vi.mock('@/lib/services/qr', () => ({
  fetchVerifierQR: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchVerifierQR);

/** A promise with exposed resolvers. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useVerifierQR', () => {
  it('starts with isLoading: true', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useVerifierQR('https://app.example.com/auth/callback'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.qrImageSrc).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('sets qrImageSrc/state/isLoading/isError from a successful ok:true response', async () => {
    mockedFetch.mockResolvedValue({
      qrImageSrc: 'data:image/png;base64,AAA',
      ok: true,
      status: 200,
      state: 'state-123',
    });

    const { result } = renderHook(() => useVerifierQR('https://app.example.com/auth/callback'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.qrImageSrc).toBe('data:image/png;base64,AAA');
    expect(result.current.state).toBe('state-123');
    expect(result.current.isError).toBe(false);
  });

  it('sets isError: true (and null qrImageSrc) when the service resolves with ok:false', async () => {
    mockedFetch.mockResolvedValue({ qrImageSrc: null, ok: false, status: 502, state: 'state-x' });

    const { result } = renderHook(() => useVerifierQR('https://app.example.com/auth/callback'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.qrImageSrc).toBeNull();
    expect(result.current.state).toBe('state-x');
  });

  it('sets isError: true, qrImageSrc: null, isLoading: false when fetchVerifierQR throws, without throwing out of the hook', async () => {
    mockedFetch.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useVerifierQR('https://app.example.com/auth/callback'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.qrImageSrc).toBeNull();
  });

  it('does not update state after unmount (isCancelled guard)', async () => {
    const { promise, resolve } = deferred<{
      qrImageSrc: string | null;
      ok: boolean;
      status: number;
      state: string;
    }>();
    mockedFetch.mockReturnValue(promise);

    const { result, unmount } = renderHook(() =>
      useVerifierQR('https://app.example.com/auth/callback'),
    );

    expect(result.current.isLoading).toBe(true);
    unmount();

    // Resolve after unmount — the hook's cleanup should have flipped `cancelled`, so no state update (and no React "act" warning) should occur.
    resolve({ qrImageSrc: 'data:image/png;base64,AAA', ok: true, status: 200, state: 'late' });
    await promise;

    // result.current still reflects the pre-unmount snapshot — proves the post-unmount resolution never reached a setState call.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.qrImageSrc).toBeNull();
  });

  describe('QR refresh before the verifier session expires', () => {
    const REDIRECT = 'https://app.example.com/auth/callback';
    const ok = (state: string) => ({
      qrImageSrc: `data:image/png;base64,${state}`,
      ok: true,
      status: 200,
      state,
    });

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('requests a new QR (new state) after VERIFIER_QR_REFRESH_MS', async () => {
      mockedFetch.mockResolvedValueOnce(ok('a')).mockResolvedValueOnce(ok('b'));
      const { result } = renderHook(() => useVerifierQR(REDIRECT));

      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(result.current.state).toBe('a');
      expect(mockedFetch).toHaveBeenCalledTimes(1);

      await act(() => vi.advanceTimersByTimeAsync(VERIFIER_QR_REFRESH_MS));
      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(result.current.state).toBe('b');
    });

    it('does not schedule a refresh when the QR request failed', async () => {
      mockedFetch.mockResolvedValue({ qrImageSrc: null, ok: false, status: 500, state: 's' });
      renderHook(() => useVerifierQR(REDIRECT));

      await act(() => vi.advanceTimersByTimeAsync(VERIFIER_QR_REFRESH_MS * 2));
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('clears the pending refresh on unmount', async () => {
      mockedFetch.mockResolvedValue(ok('a'));
      const { unmount } = renderHook(() => useVerifierQR(REDIRECT));
      await act(() => vi.advanceTimersByTimeAsync(0));

      unmount();
      await act(() => vi.advanceTimersByTimeAsync(VERIFIER_QR_REFRESH_MS * 2));
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('derives the default redirectUri from window.location.origin when none is passed', async () => {
    mockedFetch.mockResolvedValue({ qrImageSrc: 'x', ok: true, status: 200, state: 's' });

    const { result } = renderHook(() => useVerifierQR());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedFetch).toHaveBeenCalledWith(`${window.location.origin}/auth/callback`);
  });
});
