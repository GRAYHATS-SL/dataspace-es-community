import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductSpecifications } from '@/hooks/queries/useProductSpecificationQueries';
import { useIsOwnOffering } from '@/hooks/useIsOwnOffering';
import type { ProductOffering, ProductSpecification } from '@/types/api';

vi.mock('@/hooks/queries/useProductSpecificationQueries', () => ({
  useProductSpecifications: vi.fn(),
}));

const mockOwnSpecsQuery = (data: ProductSpecification[] | undefined, isLoading = false) => {
  vi.mocked(useProductSpecifications).mockReturnValue({ data, isLoading } as never);
};

const offeringWithSpecId = (id: string | undefined): ProductOffering =>
  ({
    id: 'offering-1',
    productSpecification: id ? { id } : undefined,
  }) as ProductOffering;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useIsOwnOffering', () => {
  it('returns true when offering.productSpecification.id is in the own-specs set', () => {
    mockOwnSpecsQuery([{ id: 'spec-1' } as ProductSpecification, { id: 'spec-2' } as ProductSpecification]);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isOwnOffering(offeringWithSpecId('spec-1'))).toBe(true);
  });

  it('returns false when offering.productSpecification.id is not in the own-specs set', () => {
    mockOwnSpecsQuery([{ id: 'spec-1' } as ProductSpecification]);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isOwnOffering(offeringWithSpecId('spec-999'))).toBe(false);
  });

  it('returns false when offering.productSpecification is undefined', () => {
    mockOwnSpecsQuery([{ id: 'spec-1' } as ProductSpecification]);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isOwnOffering(offeringWithSpecId(undefined))).toBe(false);
  });

  it('ignores specs without an id when building the own-specs set', () => {
    mockOwnSpecsQuery([{ id: undefined } as ProductSpecification]);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isOwnOffering(offeringWithSpecId(undefined))).toBe(false);
  });

  it('treats an undefined ownSpecsQuery.data as an empty set', () => {
    mockOwnSpecsQuery(undefined);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isOwnOffering(offeringWithSpecId('spec-1'))).toBe(false);
  });

  it('reflects ownSpecsQuery.isLoading', () => {
    mockOwnSpecsQuery(undefined, true);
    const { result } = renderHook(() => useIsOwnOffering());

    expect(result.current.isLoading).toBe(true);
  });

  it('memoizes isOwnOffering across re-renders when ownSpecsQuery.data is unchanged', () => {
    const data = [{ id: 'spec-1' } as ProductSpecification];
    mockOwnSpecsQuery(data);
    const { result, rerender } = renderHook(() => useIsOwnOffering());

    const first = result.current.isOwnOffering;
    rerender();
    const second = result.current.isOwnOffering;

    expect(first).toBe(second);
  });

  it('returns a new isOwnOffering reference when ownSpecsQuery.data changes', () => {
    mockOwnSpecsQuery([{ id: 'spec-1' } as ProductSpecification]);
    const { result, rerender } = renderHook(() => useIsOwnOffering());
    const first = result.current.isOwnOffering;

    mockOwnSpecsQuery([{ id: 'spec-2' } as ProductSpecification]);
    rerender();
    const second = result.current.isOwnOffering;

    expect(first).not.toBe(second);
  });
});
