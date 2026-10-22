import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/serviceSpecification', () => ({
  createServiceSpecification: vi.fn(),
  deleteServiceSpecification: vi.fn(),
  getServiceSpecificationById: vi.fn(),
  getServiceSpecifications: vi.fn(),
  patchServiceSpecification: vi.fn(),
  publishServiceSpecification: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateServiceSpecification,
  useDeleteServiceSpecification,
  usePatchServiceSpecification,
  usePublishServiceSpecification,
  useServiceSpecification,
  useServiceSpecifications,
} from '@/hooks/queries/useServiceSpecificationQueries';
import {
  createServiceSpecification,
  deleteServiceSpecification,
  getServiceSpecificationById,
  getServiceSpecifications,
  patchServiceSpecification,
  publishServiceSpecification,
} from '@/lib/services/queries/serviceSpecification';
import type { NewServiceSpecification, ServiceSpecification } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const SVC_ID = 'urn:ngsi-ld:serviceSpecification:svc-1';
const service = { id: SVC_ID } as ServiceSpecification;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useServiceSpecifications', () => {
  it('calls getServiceSpecifications', async () => {
    vi.mocked(getServiceSpecifications).mockResolvedValue([service]);
    const { result } = renderHook(() => useServiceSpecifications(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getServiceSpecifications).toHaveBeenCalledTimes(1);
  });
});

describe('useServiceSpecification', () => {
  it('calls getServiceSpecificationById with the given id', async () => {
    vi.mocked(getServiceSpecificationById).mockResolvedValue(service);
    const { result } = renderHook(() => useServiceSpecification(SVC_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getServiceSpecificationById).toHaveBeenCalledWith(SVC_ID);
  });
});

describe('useCreateServiceSpecification', () => {
  it('calls createServiceSpecification and invalidates serviceSpecifications.all()', async () => {
    vi.mocked(createServiceSpecification).mockResolvedValue(service);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateServiceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New service' } as Partial<NewServiceSpecification>);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.serviceSpecifications.all(),
    });
  });
});

describe('usePatchServiceSpecification', () => {
  it('calls patchServiceSpecification with (id, payload) and invalidates serviceSpecifications.all()', async () => {
    vi.mocked(patchServiceSpecification).mockResolvedValue(service);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchServiceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: SVC_ID, payload: { name: 'Renamed' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(patchServiceSpecification).toHaveBeenCalledWith(SVC_ID, { name: 'Renamed' });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.serviceSpecifications.all(),
    });
  });
});

describe('usePublishServiceSpecification', () => {
  it('calls publishServiceSpecification and invalidates serviceSpecifications.all()', async () => {
    vi.mocked(publishServiceSpecification).mockResolvedValue(service);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePublishServiceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(SVC_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.serviceSpecifications.all(),
    });
  });
});

describe('useDeleteServiceSpecification', () => {
  it('calls deleteServiceSpecification and invalidates service + productSpecifications caches', async () => {
    vi.mocked(deleteServiceSpecification).mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteServiceSpecification(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(SVC_ID);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(deleteServiceSpecification).mock.calls[0]?.[0]).toBe(SVC_ID);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.serviceSpecifications.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.productSpecifications.all(),
    });
  });
});
