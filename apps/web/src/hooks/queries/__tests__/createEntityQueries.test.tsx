import type { QueryKey } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEntityQueries } from '@/hooks/queries/createEntityQueries';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

interface Widget {
  id: string;
  name: string;
}

interface NewWidget {
  name: string;
}

const widgetKeys = {
  all: (): QueryKey => ['widgets'],
  list: (params?: object): QueryKey => ['widgets', 'list', params],
  detail: (id: string | number): QueryKey => ['widgets', 'detail', id],
};

const relatedKeys = {
  all: (): QueryKey => ['related'],
};

const list = vi.fn(async () => [{ id: '1', name: 'Widget One' }]);
const byId = vi.fn(async (id: string) => ({ id, name: 'Widget One' }));
const create = vi.fn(async (payload: NewWidget): Promise<Widget> => ({ id: 'new-id', ...payload }));
const patch = vi.fn(
  async (id: string, payload: Partial<NewWidget>): Promise<Widget> => ({
    id,
    name: payload.name ?? 'Widget One',
  }),
);
const del = vi.fn<(id: string) => Promise<void>>(async () => undefined);
const publish = vi.fn(async (id: string): Promise<Widget> => ({ id, name: 'Published Widget' }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createEntityQueries', () => {
  describe('useList', () => {
    it('fetches the list via service.list under keys.list()', async () => {
      const queryClient = createTestQueryClient();
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
      });
      const { result } = renderHook(() => queries.useList(), { wrapper: wrapperFor(queryClient) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(list).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual([{ id: '1', name: 'Widget One' }]);
      expect(queryClient.getQueryData(widgetKeys.list())).toEqual([
        { id: '1', name: 'Widget One' },
      ]);
    });

    it('surfaces isError without throwing when service.list rejects', async () => {
      const queryClient = createTestQueryClient();
      const failingList = vi.fn(async (): Promise<Widget[]> => {
        throw new Error('network down');
      });
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list: failingList, byId, create, patch, delete: del },
      });
      const { result } = renderHook(() => queries.useList(), { wrapper: wrapperFor(queryClient) });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(failingList).toHaveBeenCalledTimes(1);
      expect(result.current.error?.message).toBe('network down');
    });
  });

  describe('useDetail', () => {
    it('fetches a single entity by id', async () => {
      const queryClient = createTestQueryClient();
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
      });
      const { result } = renderHook(() => queries.useDetail('42'), {
        wrapper: wrapperFor(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(byId).toHaveBeenCalledWith('42');
      expect(result.current.data).toEqual({ id: '42', name: 'Widget One' });
    });

    it('stays disabled and never calls service.byId when id is falsy', () => {
      const queryClient = createTestQueryClient();
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
      });
      const { result } = renderHook(() => queries.useDetail(''), {
        wrapper: wrapperFor(queryClient),
      });

      expect(byId).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreate', () => {
    it('calls service.create and invalidates keys.all() plus invalidateOnWrite on success', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
        invalidateOnWrite: [relatedKeys.all()],
      });
      const { result } = renderHook(() => queries.useCreate(), {
        wrapper: wrapperFor(queryClient),
      });

      result.current.mutate({ name: 'Brand new widget' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // React Query v5 calls mutationFn with a second (internal) context argument when it's passed by direct reference — assert on the payload it actually cares about.
      expect(create.mock.calls[0]?.[0]).toEqual({ name: 'Brand new widget' });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: relatedKeys.all() });
    });
  });

  describe('usePatch', () => {
    it('calls service.patch with the { id, payload } shape and invalidates on success', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
      });
      const { result } = renderHook(() => queries.usePatch(), { wrapper: wrapperFor(queryClient) });

      result.current.mutate({ id: '1', payload: { name: 'Renamed widget' } });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(patch).toHaveBeenCalledWith('1', { name: 'Renamed widget' });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
    });
  });

  describe('useDelete', () => {
    it('calls service.delete and invalidates keys.all() plus invalidateOnDelete cascade', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
        invalidateOnDelete: [relatedKeys.all()],
      });
      const { result } = renderHook(() => queries.useDelete(), {
        wrapper: wrapperFor(queryClient),
      });

      result.current.mutate('1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(del.mock.calls[0]?.[0]).toBe('1');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: relatedKeys.all() });
    });
  });

  describe('usePublish (overload with publish)', () => {
    it('exposes usePublish when the service declares publish, and it invalidates on success', async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del, publish },
      });
      expect('usePublish' in queries).toBe(true);

      const { result } = renderHook(() => queries.usePublish(), {
        wrapper: wrapperFor(queryClient),
      });
      result.current.mutate('1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(publish.mock.calls[0]?.[0]).toBe('1');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
    });
  });

  describe('overload without publish', () => {
    it('does not expose usePublish when the service has no publish function', () => {
      const queries = createEntityQueries<Widget, NewWidget>({
        keys: widgetKeys,
        service: { list, byId, create, patch, delete: del },
      });

      expect('usePublish' in queries).toBe(false);
    });
  });
});
