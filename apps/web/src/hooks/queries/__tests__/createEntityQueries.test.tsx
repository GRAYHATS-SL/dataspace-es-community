import type { QueryKey } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

/** In-memory service that records every call; never touches the network. */
function createFakeService(seed: Widget[] = [{ id: '1', name: 'Widget One' }]) {
  const store = new Map<string, Widget>(seed.map((w) => [w.id, w]));
  const calls = {
    list: 0,
    byId: [] as string[],
    create: [] as NewWidget[],
    deleted: [] as string[],
  };
  let nextId = store.size + 1;

  const service = {
    list: async (): Promise<Widget[]> => {
      calls.list += 1;
      return [...store.values()];
    },
    byId: async (id: string): Promise<Widget> => {
      calls.byId.push(id);
      const found = store.get(id);
      if (!found) throw new Error(`HTTP 404: ${id}`);
      return found;
    },
    create: async (payload: NewWidget): Promise<Widget> => {
      calls.create.push(payload);
      const created = { id: String(nextId++), ...payload };
      store.set(created.id, created);
      return created;
    },
    patch: async (id: string, payload: Partial<NewWidget>): Promise<Widget> => {
      const current = store.get(id);
      if (!current) throw new Error(`HTTP 404: ${id}`);
      const updated = { ...current, ...payload };
      store.set(id, updated);
      return updated;
    },
    delete: async (id: string): Promise<void> => {
      calls.deleted.push(id);
      store.delete(id);
    },
  };

  return { service, calls, store };
}

describe('createEntityQueries', () => {
  it('useList returns the service list under keys.list()', async () => {
    const queryClient = createTestQueryClient();
    const { service, calls } = createFakeService();
    const queries = createEntityQueries<Widget, NewWidget>({ keys: widgetKeys, service });

    const { result } = renderHook(() => queries.useList(), { wrapper: wrapperFor(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.list).toBe(1);
    expect(result.current.data).toEqual([{ id: '1', name: 'Widget One' }]);
    expect(queryClient.getQueryData(widgetKeys.list())).toEqual([{ id: '1', name: 'Widget One' }]);
  });

  it('useList exposes isError without throwing when the service rejects', async () => {
    const queryClient = createTestQueryClient();
    const { service } = createFakeService();
    const failing = {
      ...service,
      list: async (): Promise<Widget[]> => {
        throw new Error('API_BASE_URL is not configured');
      },
    };
    const queries = createEntityQueries<Widget, NewWidget>({ keys: widgetKeys, service: failing });

    const { result } = renderHook(() => queries.useList(), { wrapper: wrapperFor(queryClient) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('API_BASE_URL is not configured');
  });

  it('useDetail fetches by id and stays idle when id is empty', async () => {
    const queryClient = createTestQueryClient();
    const { service, calls } = createFakeService();
    const queries = createEntityQueries<Widget, NewWidget>({ keys: widgetKeys, service });

    const { result } = renderHook(() => queries.useDetail('1'), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: '1', name: 'Widget One' });

    const { result: idle } = renderHook(() => queries.useDetail(''), {
      wrapper: wrapperFor(queryClient),
    });
    expect(idle.current.fetchStatus).toBe('idle');
    expect(calls.byId).toEqual(['1']);
  });

  it('useCreate invalidates keys.all() and extra keys, and the list refetches', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { service, calls } = createFakeService();
    const queries = createEntityQueries<Widget, NewWidget>({
      keys: widgetKeys,
      service,
      invalidateOnWrite: [relatedKeys.all()],
    });

    const { result } = renderHook(
      () => ({ list: queries.useList(), create: queries.useCreate() }),
      { wrapper: wrapperFor(queryClient) },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    act(() => {
      result.current.create.mutate({ name: 'Widget Two' });
    });

    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
    expect(calls.create).toEqual([{ name: 'Widget Two' }]);
    expect(calls.list).toBe(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: relatedKeys.all() });
  });

  it('useDelete removes the entity and invalidates keys.all() plus invalidateOnDelete', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { service, calls, store } = createFakeService();
    const queries = createEntityQueries<Widget, NewWidget>({
      keys: widgetKeys,
      service,
      invalidateOnDelete: [relatedKeys.all()],
    });

    const { result } = renderHook(() => queries.useDelete(), {
      wrapper: wrapperFor(queryClient),
    });
    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls.deleted).toEqual(['1']);
    expect(store.has('1')).toBe(false);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: widgetKeys.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: relatedKeys.all() });
  });

  it('exposes usePublish only when the service declares publish', () => {
    const { service } = createFakeService();
    const withoutPublish = createEntityQueries<Widget, NewWidget>({ keys: widgetKeys, service });
    const withPublish = createEntityQueries<Widget, NewWidget>({
      keys: widgetKeys,
      service: { ...service, publish: async (id: string) => ({ id, name: 'Published' }) },
    });

    expect('usePublish' in withoutPublish).toBe(false);
    expect('usePublish' in withPublish).toBe(true);
  });
});
