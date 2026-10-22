import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/resourceSpecification', () => ({
  createResourceSpecification: vi.fn(),
  deleteResourceSpecification: vi.fn(),
  getResourceSpecificationById: vi.fn(),
  getResourceSpecifications: vi.fn(),
  patchResourceSpecification: vi.fn(),
  publishResourceSpecification: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateResourceSpecification,
  useDeleteResourceSpecification,
  usePatchResourceSpecification,
  usePublishResourceSpecification,
  useResourceSpecification,
  useResourceSpecifications,
} from '@/hooks/queries/useResourceSpecificationQueries';
import {
  createResourceSpecification,
  deleteResourceSpecification,
  getResourceSpecificationById,
  getResourceSpecifications,
  patchResourceSpecification,
  publishResourceSpecification,
} from '@/lib/services/queries/resourceSpecification';
import type { NewResourceSpecification, ResourceSpecification } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const RES_ID = 'urn:ngsi-ld:resourceSpecification:res-1';
const resource = { id: RES_ID } as ResourceSpecification;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useResourceSpecifications', () => {
  it('calls getResourceSpecifications', async () => {
    vi.mocked(getResourceSpecifications).mockResolvedValue([resource]);
    const { result } = renderHook(() => useResourceSpecifications(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getResourceSpecifications).toHaveBeenCalledTimes(1);
  });
});

describe('useResourceSpecification', () => {
  it('calls getResourceSpecificationById with the given id', async () => {
    vi.mocked(getResourceSpecificationById).mockResolvedValue(resource);
    const { result } = renderHook(() => useResourceSpecification(RES_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getResourceSpecificationById).toHaveBeenCalledWith(RES_ID);
  });
});

describe('useCreateResourceSpecification', () => {
  it('calls createResourceSpecification and invalidates resourceSpecifications.all()', async () => {
    vi.mocked(createResourceSpecification).mockResolvedValue(resource);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateResourceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New resource' } as Partial<NewResourceSpecification>);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.resourceSpecifications.all(),
    });
  });
});

describe('usePatchResourceSpecification', () => {
  it('calls patchResourceSpecification with (id, payload) and invalidates resourceSpecifications.all()', async () => {
    vi.mocked(patchResourceSpecification).mockResolvedValue(resource);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchResourceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: RES_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchResourceSpecification).toHaveBeenCalledWith(RES_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.resourceSpecifications.all(),
    });
  });
});

describe('usePublishResourceSpecification', () => {
  it('calls publishResourceSpecification and invalidates resourceSpecifications.all()', async () => {
    vi.mocked(publishResourceSpecification).mockResolvedValue(resource);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishResourceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(RES_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.resourceSpecifications.all(),
    });
  });
});

describe('useDeleteResourceSpecification', () => {
  it('calls deleteResourceSpecification and invalidates resource + productSpecifications caches', async () => {
    vi.mocked(deleteResourceSpecification).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteResourceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(RES_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteResourceSpecification).mock.calls[0]?.[0]).toBe(RES_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.resourceSpecifications.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});
