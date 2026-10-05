'use client';

import { useCallback, useMemo } from 'react';

import type { ProductOffering } from '@/types/api';

/** Return value of `useIsOwnOffering`. */
export interface UseIsOwnOfferingReturn {
  isOwnOffering: (offering: ProductOffering) => boolean;
  isLoading: boolean;
}

/** Tells whether an offering belongs to the current user (hides the buy action). */
export const useIsOwnOffering = (): UseIsOwnOfferingReturn => {
  // Here you define your business logic (ids of the specifications owned by the current user).
  const ownSpecIds = useMemo(() => new Set<string>(), []);

  const isOwnOffering = useCallback(
    (offering: ProductOffering): boolean => {
      const specId = offering.productSpecification?.id;
      return specId ? ownSpecIds.has(specId) : false;
    },
    [ownSpecIds],
  );

  return { isOwnOffering, isLoading: false };
};
