import { useQuery } from '@tanstack/react-query';

import * as categoryApi from '@/lib/services/queries/category';
import type { Category, NewCategory } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const categoryQueries = createEntityQueries<Category, NewCategory>({
  keys: queryKeys.categories,
  service: {
    list: categoryApi.fetchCategories,
    byId: categoryApi.fetchCategoryById,
    create: categoryApi.createCategory,
    patch: categoryApi.patchCategory,
    publish: categoryApi.publishCategory,
    delete: categoryApi.deleteCategory,
  },
  invalidateOnDelete: [queryKeys.catalogs.all(), queryKeys.offerings.all()],
});

/** Fetches the full list of categories (all lifecycle statuses). */
export const useCategories = categoryQueries.useList;
/** Fetches the categories shown in the Categories tab. */
export const useOwnCategories = (options?: { enabled?: boolean }) =>
  useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list({ scope: 'own' }),
    queryFn: categoryApi.fetchOwnCategories,
    enabled: options?.enabled,
  });
/** Creates a new category. Invalidates the categories cache. */
export const useCreateCategory = categoryQueries.useCreate;
/** Partially updates a category. Invalidates the categories cache. */
export const usePatchCategory = categoryQueries.usePatch;
/** Publishes a category (`lifecycleStatus` → `Launched`). */
export const usePublishCategory = categoryQueries.usePublish;
/** Deletes a category. Invalidates categories, catalogs, and offerings caches. */
export const useDeleteCategory = categoryQueries.useDelete;

/** React Query hook — fetches the categories a SELLER can pick (`Active` or `Launched`). */
export const useLaunchedCategories = () =>
  useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list({ lifecycleStatus: 'Launched' }),
    queryFn: categoryApi.fetchLaunchedCategories,
  });

/** React Query hook — public (unauthenticated) variant of `useCategories`. */
export const useCategoriesPublic = (options?: { enabled?: boolean }) =>
  useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list({ scope: 'public' }),
    queryFn: categoryApi.fetchCategoriesPublic,
    enabled: options?.enabled,
  });
