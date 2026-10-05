import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchCategoriesPublic,
  fetchCategoryById,
  fetchLaunchedCategories,
  patchCategory,
  publishCategory,
} from '@/lib/services/queries/category';
import type { Category, NewCategory } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const categoryQueries = createEntityQueries<Category, NewCategory>({
  keys: queryKeys.categories,
  staleTime: STALE_TIME.CATALOG,
  service: {
    list: fetchCategories,
    byId: fetchCategoryById,
    create: createCategory,
    patch: patchCategory,
    publish: publishCategory,
    delete: deleteCategory,
  },
  invalidateOnDelete: [queryKeys.catalogs.all(), queryKeys.offerings.all()],
});

/** Fetches the list of categories. */
export const useCategories = categoryQueries.useList;
/** Fetches a single category by id. Disabled when `id` is empty. */
export const useCategory = categoryQueries.useDetail;
/** Creates a category. */
export const useCreateCategory = categoryQueries.useCreate;
/** Partially updates a category. */
export const usePatchCategory = categoryQueries.usePatch;
/** Publishes a category. */
export const usePublishCategory = categoryQueries.usePublish;
/** Deletes a category. */
export const useDeleteCategory = categoryQueries.useDelete;

/** Fetches the launched categories. */
export const useLaunchedCategories = (options?: {
  enabled?: boolean;
}): UseQueryResult<Category[], Error> =>
  useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list({ lifecycleStatus: 'Launched' }),
    queryFn: fetchLaunchedCategories,
    staleTime: STALE_TIME.CATALOG,
    enabled: options?.enabled,
  });

/** Fetches the categories of the public catalog (no authentication). */
export const useCategoriesPublic = (options?: {
  enabled?: boolean;
}): UseQueryResult<Category[], Error> =>
  useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list({ scope: 'public' }),
    queryFn: fetchCategoriesPublic,
    staleTime: STALE_TIME.CATALOG,
    enabled: options?.enabled,
  });
