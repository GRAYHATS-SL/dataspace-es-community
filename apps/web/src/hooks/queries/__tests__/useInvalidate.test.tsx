import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useInvalidate } from '@/hooks/queries/useInvalidate';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

describe('useInvalidate', () => {
  it('invalidates a single query key', () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidate(), { wrapper: wrapperFor(queryClient) });

    result.current(['widgets']);

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['widgets'] });
  });

  it('invalidates every key passed, in order, one call per key', () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidate(), { wrapper: wrapperFor(queryClient) });

    result.current(['widgets'], ['gadgets'], ['gizmos']);

    expect(invalidateSpy).toHaveBeenCalledTimes(3);
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: ['widgets'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: ['gadgets'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(3, { queryKey: ['gizmos'] });
  });

  it('does nothing when called with no keys', () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidate(), { wrapper: wrapperFor(queryClient) });

    expect(() => result.current()).not.toThrow();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
