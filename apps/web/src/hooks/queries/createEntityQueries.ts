import {
  type QueryKey,
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useInvalidate } from './useInvalidate';

interface EntityKeys {
  all: () => QueryKey;
  list: (params?: object) => QueryKey;
  detail: (id: string | number) => QueryKey;
}

/**
 * `TCreatePayload` defaults to `TNewEntity`; pass it explicitly when a service accepts a
 * `Partial<TNewEntity>` on create.
 */
interface EntityServiceBase<TEntity, TNewEntity, TCreatePayload = TNewEntity> {
  list: () => Promise<TEntity[]>;
  byId: (id: string) => Promise<TEntity>;
  create: (payload: TCreatePayload) => Promise<TEntity>;
  patch: (id: string, payload: Partial<TNewEntity>) => Promise<TEntity>;
  delete: (id: string) => Promise<void>;
}

interface EntityServiceWithPublish<
  TEntity,
  TNewEntity,
  TCreatePayload = TNewEntity,
> extends EntityServiceBase<TEntity, TNewEntity, TCreatePayload> {
  publish: (id: string) => Promise<TEntity>;
}

interface CreateEntityQueriesConfig<TService> {
  keys: EntityKeys;
  service: TService;
  staleTime?: number;
  /** Extra query keys to invalidate (besides `keys.all()`) on create/patch/publish. */
  invalidateOnWrite?: QueryKey[];
  /** Extra query keys to invalidate (besides `keys.all()`) on delete only. */
  invalidateOnDelete?: QueryKey[];
}

type PatchArgs<TNewEntity> = { id: string; payload: Partial<TNewEntity> };

interface EntityQueriesBase<TEntity, TNewEntity, TCreatePayload> {
  useList: (options?: { enabled?: boolean }) => UseQueryResult<TEntity[], Error>;
  useDetail: (id: string, options?: { enabled?: boolean }) => UseQueryResult<TEntity, Error>;
  useCreate: () => UseMutationResult<TEntity, Error, TCreatePayload>;
  usePatch: () => UseMutationResult<TEntity, Error, PatchArgs<TNewEntity>>;
  useDelete: () => UseMutationResult<void, Error, string>;
}

interface EntityQueriesWithPublish<TEntity, TNewEntity, TCreatePayload> extends EntityQueriesBase<
  TEntity,
  TNewEntity,
  TCreatePayload
> {
  usePublish: () => UseMutationResult<TEntity, Error, string>;
}

/**
 * React Query hook factory for the CRUD skeleton shared by TM Forum entities
 * (list/detail/create/patch/publish?/delete). Every mutation invalidates `keys.all()`
 * plus the optional extra keys.
 */
export function createEntityQueries<TEntity, TNewEntity, TCreatePayload = TNewEntity>(
  config: CreateEntityQueriesConfig<EntityServiceWithPublish<TEntity, TNewEntity, TCreatePayload>>,
): EntityQueriesWithPublish<TEntity, TNewEntity, TCreatePayload>;
export function createEntityQueries<TEntity, TNewEntity, TCreatePayload = TNewEntity>(
  config: CreateEntityQueriesConfig<EntityServiceBase<TEntity, TNewEntity, TCreatePayload>>,
): EntityQueriesBase<TEntity, TNewEntity, TCreatePayload>;
export function createEntityQueries<TEntity, TNewEntity, TCreatePayload = TNewEntity>(
  config: CreateEntityQueriesConfig<
    EntityServiceBase<TEntity, TNewEntity, TCreatePayload> &
      Partial<EntityServiceWithPublish<TEntity, TNewEntity, TCreatePayload>>
  >,
):
  | EntityQueriesBase<TEntity, TNewEntity, TCreatePayload>
  | EntityQueriesWithPublish<TEntity, TNewEntity, TCreatePayload> {
  const { keys, service, staleTime, invalidateOnWrite = [], invalidateOnDelete = [] } = config;

  const useList = (options?: { enabled?: boolean }) =>
    useQuery<TEntity[], Error>({
      queryKey: keys.list(),
      queryFn: service.list,
      staleTime,
      enabled: options?.enabled,
    });

  const useDetail = (id: string, options?: { enabled?: boolean }) =>
    useQuery<TEntity, Error>({
      queryKey: keys.detail(id),
      queryFn: () => service.byId(id),
      enabled: !!id && (options?.enabled ?? true),
      staleTime,
    });

  const useCreate = () => {
    const invalidate = useInvalidate();
    return useMutation<TEntity, Error, TCreatePayload>({
      mutationFn: service.create,
      onSuccess: () => invalidate(keys.all(), ...invalidateOnWrite),
    });
  };

  const usePatch = () => {
    const invalidate = useInvalidate();
    return useMutation<TEntity, Error, PatchArgs<TNewEntity>>({
      mutationFn: ({ id, payload }) => service.patch(id, payload),
      onSuccess: () => invalidate(keys.all(), ...invalidateOnWrite),
    });
  };

  const useDelete = () => {
    const invalidate = useInvalidate();
    return useMutation<void, Error, string>({
      mutationFn: service.delete,
      onSuccess: () => invalidate(keys.all(), ...invalidateOnDelete),
    });
  };

  const base: EntityQueriesBase<TEntity, TNewEntity, TCreatePayload> = {
    useList,
    useDetail,
    useCreate,
    usePatch,
    useDelete,
  };

  if (!service.publish) return base;

  const publish = service.publish;
  const usePublish = () => {
    const invalidate = useInvalidate();
    return useMutation<TEntity, Error, string>({
      mutationFn: publish,
      onSuccess: () => invalidate(keys.all(), ...invalidateOnWrite),
    });
  };

  return { ...base, usePublish };
}
