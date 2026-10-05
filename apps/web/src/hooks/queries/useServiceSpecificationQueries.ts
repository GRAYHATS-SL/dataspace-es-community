import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createServiceSpecification,
  deleteServiceSpecification,
  getServiceSpecificationById,
  getServiceSpecifications,
  patchServiceSpecification,
  publishServiceSpecification,
} from '@/lib/services/queries/serviceSpecification';
import type { NewServiceSpecification, ServiceSpecification } from '@/types/api';

import { createEntityQueries } from './createEntityQueries';
import { queryKeys } from './queryKeys';

const serviceSpecificationQueries = createEntityQueries<
  ServiceSpecification,
  NewServiceSpecification,
  Partial<NewServiceSpecification>
>({
  keys: queryKeys.serviceSpecifications,
  staleTime: STALE_TIME.STABLE,
  service: {
    list: getServiceSpecifications,
    byId: getServiceSpecificationById,
    create: createServiceSpecification,
    patch: patchServiceSpecification,
    publish: publishServiceSpecification,
    delete: deleteServiceSpecification,
  },
  invalidateOnDelete: [queryKeys.productSpecifications.all()],
});

/** Fetches the list of service specifications. */
export const useServiceSpecifications = serviceSpecificationQueries.useList;
/** Fetches a single service specification by id. Disabled when `id` is empty. */
export const useServiceSpecification = serviceSpecificationQueries.useDetail;
/** Creates a service specification. */
export const useCreateServiceSpecification = serviceSpecificationQueries.useCreate;
/** Partially updates a service specification. */
export const usePatchServiceSpecification = serviceSpecificationQueries.usePatch;
/** Publishes a service specification. */
export const usePublishServiceSpecification = serviceSpecificationQueries.usePublish;
/** Deletes a service specification. */
export const useDeleteServiceSpecification = serviceSpecificationQueries.useDelete;
