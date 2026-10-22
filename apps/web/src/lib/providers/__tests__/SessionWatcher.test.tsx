import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionWatcher } from '@/lib/providers/SessionWatcher';
import { identifySentryUser, trackError } from '@/lib/utils/sentry';

const replace = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryCache: () => ({ subscribe: () => () => undefined }),
    getMutationCache: () => ({ subscribe: () => () => undefined }),
  }),
}));

vi.mock('@/lib/utils/sentry', () => ({
  identifySentryUser: vi.fn(),
  trackError: vi.fn(),
}));

class FakeBroadcastChannel {
  onmessage: (() => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe('SessionWatcher — initial check', () => {
  it('redirects to login when the session endpoint answers 401', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 401, ok: false } as Response);

    render(<SessionWatcher initialExpiresAt={null} initialUserProfile={null} />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/inicio-sesion?error=session_expired'));
    expect(trackError).not.toHaveBeenCalled();
  });

  it('reports an unexpected failure of the check to Sentry without redirecting', async () => {
    const failure = new Error('boom');
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ expiresAt: Date.now() + 3_600_000, userProfile: null }),
    } as Response);
    // 1st call: initial effect; 2nd: inside `check`, after the response.
    vi.mocked(identifySentryUser)
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw failure;
      });

    render(<SessionWatcher initialExpiresAt={null} initialUserProfile={null} />);

    await waitFor(() =>
      expect(trackError).toHaveBeenCalledWith(failure, { reason: 'session_check_failed' }),
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
