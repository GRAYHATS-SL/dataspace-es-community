import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createResourceSpecification,
  deleteResourceSpecification,
  getResourceSpecificationById,
  getResourceSpecifications,
  patchResourceSpecification,
  publishResourceSpecification,
} from '@/lib/services/queries/resourceSpecification';
import type { NewResourceSpecification, ResourceSpecification } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const resourceSpecificationQueries = createEntityQueries<
  ResourceSpecification,
  NewResourceSpecification,
  Partial<NewResourceSpecification>
>({
  keys: queryKeys.resourceSpecifications,
  staleTime: STALE_TIME.STABLE,
  service: {
    list: getResourceSpecifications,
    byId: getResourceSpecificationById,
    create: createResourceSpecification,
    patch: patchResourceSpecification,
    publish: publishResourceSpecification,
    delete: deleteResourceSpecification,
  },
  invalidateOnDelete: [queryKeys.productSpecifications.all()],
});

/** Fetches the list of resource specifications owned by the current organization. */
export const useResourceSpecifications = resourceSpecificationQueries.useList;
/** Fetches a single resource specification by id. Disabled when `id` is falsy. */
export const useResourceSpecification = resourceSpecificationQueries.useDetail;
/** Creates a new resource specification. Invalidates the resource specifications cache. */
export const useCreateResourceSpecification = resourceSpecificationQueries.useCreate;
/** Partially updates a resource specification. Invalidates the resource specifications cache. */
export const usePatchResourceSpecification = resourceSpecificationQueries.usePatch;
/** Publishes a resource specification (`lifecycleStatus` → `Launched`). */
export const usePublishResourceSpecification = resourceSpecificationQueries.usePublish;
/** Deletes a resource specification. Invalidates resource + product specifications caches. */
export const useDeleteResourceSpecification = resourceSpecificationQueries.useDelete;
