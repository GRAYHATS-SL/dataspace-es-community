import { useCallback, useMemo } from 'react';

import { useProductSpecifications } from '@/hooks/queries/useProductSpecificationQueries';
import type { ProductOffering } from '@/types/api';

/** Tells whether a `ProductOffering` belongs to the current user's organization. */
export const useIsOwnOffering = () => {
  const ownSpecsQuery = useProductSpecifications();

  const ownSpecIds = useMemo(() => {
    const set = new Set<string>();
    for (const spec of ownSpecsQuery.data ?? []) {
      if (spec.id) set.add(spec.id);
    }
    return set;
  }, [ownSpecsQuery.data]);

  const isOwnOffering = useCallback(
    (offering: ProductOffering): boolean => {
      const specId = offering.productSpecification?.id;
      return specId ? ownSpecIds.has(specId) : false;
    },
    [ownSpecIds],
  );

  return { isOwnOffering, isLoading: ownSpecsQuery.isLoading };
};
