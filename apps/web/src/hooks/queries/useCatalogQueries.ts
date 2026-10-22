import { useMutation, useQuery } from '@tanstack/react-query';

import {
  createCatalog,
  deleteCatalog,
  fetchCatalogById,
  fetchCatalogs,
  fetchLaunchedCatalogs,
  fetchLaunchedCatalogsPublic,
  patchCatalog,
  publishCatalog,
  setCatalogCategories,
} from '@/lib/services/queries/catalog';
import type { Catalog, NewCatalog } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

const catalogQueries = createEntityQueries<Catalog, NewCatalog>({
  keys: queryKeys.catalogs,
  service: {
    list: fetchCatalogs,
    byId: fetchCatalogById,
    create: createCatalog,
    patch: patchCatalog,
    publish: publishCatalog,
    delete: deleteCatalog,
  },
});

/** Fetches the list of catalogs owned by the current organization. */
export const useCatalogs = catalogQueries.useList;
/** Fetches a single catalog by id. Disabled when `id` is falsy. */
export const useCatalog = catalogQueries.useDetail;
/** Creates a new catalog. Invalidates the catalogs cache. */
export const useCreateCatalog = catalogQueries.useCreate;
/** Partially updates a catalog. Invalidates the catalogs cache. */
export const usePatchCatalog = catalogQueries.usePatch;
/** Publishes a catalog (`lifecycleStatus` → `Launched`). */
export const usePublishCatalog = catalogQueries.usePublish;
/** Deletes a catalog. Invalidates the catalogs cache. */
export const useDeleteCatalog = catalogQueries.useDelete;

/** React Query hook — fetches the list of catalogs filtered by `Launched` lifecycle status. */
export const useLaunchedCatalogs = (options?: { enabled?: boolean }) =>
  useQuery<Catalog[], Error>({
    queryKey: queryKeys.catalogs.list({ lifecycleStatus: 'Launched' }),
    queryFn: fetchLaunchedCatalogs,
    enabled: options?.enabled,
  });

/** React Query hook — public (unauthenticated) variant of `useLaunchedCatalogs`. */
export const useLaunchedCatalogsPublic = (options?: { enabled?: boolean }) =>
  useQuery<Catalog[], Error>({
    queryKey: queryKeys.catalogs.list({ scope: 'public', lifecycleStatus: 'Launched' }),
    queryFn: fetchLaunchedCatalogsPublic,
    enabled: options?.enabled,
  });

/** Mutation hook — replaces the full list of category references on a catalog. */
export const useSetCatalogCategories = () => {
  const invalidate = useInvalidate();
  return useMutation<Catalog, Error, { id: string; categoryIds: string[] }>({
    mutationFn: ({ id, categoryIds }) => setCatalogCategories(id, categoryIds),
    onSuccess: () => invalidate(queryKeys.catalogs.all()),
  });
};
