import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCurrentSessionQuery } from '@/hooks/queries/useSessionQuery';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';

vi.mock('@/hooks/queries/useSessionQuery', () => ({
  useCurrentSessionQuery: vi.fn(),
}));

describe('useIsAuthenticated', () => {
  it('returns isAuthenticated: true when the session query resolves ok: true', () => {
    vi.mocked(useCurrentSessionQuery).mockReturnValue({
      data: { ok: true, userProfile: null },
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useIsAuthenticated());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isSessionLoading).toBe(false);
  });

  it('returns isAuthenticated: false and isSessionLoading: true while data is undefined (loading)', () => {
    vi.mocked(useCurrentSessionQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    const { result } = renderHook(() => useIsAuthenticated());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isSessionLoading).toBe(true);
  });

  it('returns isAuthenticated: false when the session query resolves ok: false', () => {
    vi.mocked(useCurrentSessionQuery).mockReturnValue({
      data: { ok: false, userProfile: null },
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useIsAuthenticated());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isSessionLoading).toBe(false);
  });
});
