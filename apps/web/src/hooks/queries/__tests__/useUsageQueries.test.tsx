import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/usage', () => ({
  getUsagesByProduct: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import { useUsagesByProduct } from '@/hooks/queries/useUsageQueries';
import { getUsagesByProduct } from '@/lib/services/queries/usage';
import type { Usage } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const PRODUCT_ID = 'urn:ngsi-ld:product:prod-1';
const usage = { id: 'usage-1' } as Usage;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useUsagesByProduct', () => {
  it('fetches usages for the given product', async () => {
    vi.mocked(getUsagesByProduct).mockResolvedValue([usage]);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useUsagesByProduct(PRODUCT_ID), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getUsagesByProduct).toHaveBeenCalledWith(PRODUCT_ID);
    expect(result.current.data).toEqual([usage]);
    expect(queryClient.getQueryData(queryKeys.usages.list({ productId: PRODUCT_ID }))).toEqual([
      usage,
    ]);
  });

  it('stays disabled and never fetches when productId is falsy', () => {
    const { result } = renderHook(() => useUsagesByProduct(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(getUsagesByProduct).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces isError without throwing so the caller can show limits without consumption', async () => {
    vi.mocked(getUsagesByProduct).mockRejectedValue(new Error('TMF635 down'));
    const { result } = renderHook(() => useUsagesByProduct(PRODUCT_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('TMF635 down');
    expect(result.current.data).toBeUndefined();
  });
});
