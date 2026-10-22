import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenDebugButton } from '@/components/debug/TokenDebugButton';
import { getDecodedToken, getSessionProfile } from '@/lib/services/session';
import { trackError } from '@/lib/utils/sentry';

vi.mock('@/lib/services/session', () => ({
  getDecodedToken: vi.fn(),
  getSessionProfile: vi.fn(),
}));

vi.mock('@/lib/utils/sentry', () => ({ trackError: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('TokenDebugButton — initial load', () => {
  it('reports a failed session load to Sentry instead of leaving an unhandled rejection', async () => {
    const failure = new Error('session unavailable');
    vi.mocked(getDecodedToken).mockRejectedValue(failure);
    vi.mocked(getSessionProfile).mockResolvedValue(null);

    render(<TokenDebugButton />);

    await waitFor(() =>
      expect(trackError).toHaveBeenCalledWith(failure, { reason: 'token_debug_load_failed' }),
    );
  });

  it('does not report anything when the session loads correctly', async () => {
    vi.mocked(getDecodedToken).mockResolvedValue(null);
    vi.mocked(getSessionProfile).mockResolvedValue(null);

    render(<TokenDebugButton />);

    await waitFor(() => expect(getDecodedToken).toHaveBeenCalled());
    expect(trackError).not.toHaveBeenCalled();
  });
});

describe('TokenDebugButton — click', () => {
  it('reports a failed load on click and clears the loading state', async () => {
    const failure = new Error('boom');
    vi.mocked(getDecodedToken).mockResolvedValueOnce(null).mockRejectedValueOnce(failure);
    vi.mocked(getSessionProfile).mockResolvedValue(null);

    render(<TokenDebugButton />);
    await waitFor(() => expect(getDecodedToken).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(trackError).toHaveBeenCalledWith(failure, { reason: 'token_debug_load_failed' }),
    );
    await waitFor(() => expect(screen.getByRole('button').textContent).not.toContain('...'));
  });
});
