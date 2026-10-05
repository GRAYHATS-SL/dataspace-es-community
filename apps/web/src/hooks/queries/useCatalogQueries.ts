import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
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
  staleTime: STALE_TIME.CATALOG,
  service: {
    list: fetchCatalogs,
    byId: fetchCatalogById,
    create: createCatalog,
    patch: patchCatalog,
    publish: publishCatalog,
    delete: deleteCatalog,
  },
});

/** Fetches the list of catalogs. */
export const useCatalogs = catalogQueries.useList;
/** Fetches a single catalog by id. Disabled when `id` is empty. */
export const useCatalog = catalogQueries.useDetail;
/** Creates a catalog. */
export const useCreateCatalog = catalogQueries.useCreate;
/** Partially updates a catalog. */
export const usePatchCatalog = catalogQueries.usePatch;
/** Publishes a catalog. */
export const usePublishCatalog = catalogQueries.usePublish;
/** Deletes a catalog. */
export const useDeleteCatalog = catalogQueries.useDelete;

/** Fetches the launched catalogs. */
export const useLaunchedCatalogs = (options?: {
  enabled?: boolean;
}): UseQueryResult<Catalog[], Error> =>
  useQuery<Catalog[], Error>({
    queryKey: queryKeys.catalogs.list({ lifecycleStatus: 'Launched' }),
    queryFn: fetchLaunchedCatalogs,
    staleTime: STALE_TIME.CATALOG,
    enabled: options?.enabled,
  });

/** Fetches the launched catalogs of the public catalog (no authentication). */
export const useLaunchedCatalogsPublic = (options?: {
  enabled?: boolean;
}): UseQueryResult<Catalog[], Error> =>
  useQuery<Catalog[], Error>({
    queryKey: queryKeys.catalogs.list({ scope: 'public', lifecycleStatus: 'Launched' }),
    queryFn: fetchLaunchedCatalogsPublic,
    staleTime: STALE_TIME.CATALOG,
    enabled: options?.enabled,
  });

/** Arguments of `useSetCatalogCategories`. */
export interface SetCatalogCategoriesArgs {
  id: string;
  categoryIds: string[];
}

/** Replaces the category references of a catalog. */
export const useSetCatalogCategories = (): UseMutationResult<
  Catalog,
  Error,
  SetCatalogCategoriesArgs
> => {
  const invalidate = useInvalidate();
  return useMutation<Catalog, Error, SetCatalogCategoriesArgs>({
    mutationFn: ({ id, categoryIds }) => setCatalogCategories(id, categoryIds),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.catalogs.all(), queryKeys.categories.all());
    },
  });
};
