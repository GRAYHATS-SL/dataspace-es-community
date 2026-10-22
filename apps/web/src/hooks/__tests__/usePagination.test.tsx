import { renderHook } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePagination } from '@/hooks/usePagination';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const ITEMS = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

function setup({ page = '', items = ITEMS, pageSize = 10 } = {}) {
  const params = new URLSearchParams(page ? `page=${page}` : '');
  vi.mocked(useSearchParams).mockReturnValue(params as never);
  vi.mocked(usePathname).mockReturnValue('/test');
  const push = vi.fn();
  vi.mocked(useRouter).mockReturnValue({ push } as never);
  const { result } = renderHook(() => usePagination(items, pageSize));
  return { result, push };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── usePagination ────────────────────────────────────────────────────────────

describe('usePagination', () => {
  it('returns the first page of items by default', () => {
    const { result } = setup();
    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.paginatedItems[0]).toEqual({ id: 1 });
    expect(result.current.paginatedItems[9]).toEqual({ id: 10 });
  });

  it('returns items for page 2 when page=2 is in the URL', () => {
    const { result } = setup({ page: '2' });
    expect(result.current.paginatedItems[0]).toEqual({ id: 11 });
    expect(result.current.paginatedItems[4]).toEqual({ id: 15 });
  });

  it('calculates totalPages as Math.ceil(items.length / pageSize)', () => {
    const { result } = setup();
    expect(result.current.totalPages).toBe(Math.ceil(25 / 10)); // 3
  });

  it('hasPrev is false on page 1', () => {
    const { result } = setup();
    expect(result.current.hasPrev).toBe(false);
  });

  it('hasPrev is true on page 2', () => {
    const { result } = setup({ page: '2' });
    expect(result.current.hasPrev).toBe(true);
  });

  it('hasNext is true when there are more pages', () => {
    const { result } = setup();
    expect(result.current.hasNext).toBe(true);
  });

  it('hasNext is false on the last page', () => {
    const { result } = setup({ page: '3' });
    expect(result.current.hasNext).toBe(false);
  });

  it('returns totalPages=1 and empty paginatedItems for empty items', () => {
    const { result } = setup({ items: [] });
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toHaveLength(0);
    expect(result.current.rangeStart).toBe(0);
  });

  it('returns all items in a single page when pageSize exceeds items.length', () => {
    const { result } = setup({ items: ITEMS, pageSize: 100 });
    expect(result.current.paginatedItems).toHaveLength(25);
    expect(result.current.totalPages).toBe(1);
  });

  it('goToPage(2) calls router.push with page=2 query param', () => {
    const { result, push } = setup();
    result.current.goToPage(2);
    expect(push).toHaveBeenCalledWith('/test?page=2');
  });

  it('goToPage(1) calls router.push without page param (default page)', () => {
    const { result, push } = setup({ page: '2' });
    result.current.goToPage(1);
    expect(push).toHaveBeenCalledWith('/test');
  });

  it('clamps an out-of-range page to totalPages', () => {
    const { result } = setup({ page: '999' });
    expect(result.current.currentPage).toBe(3);
  });

  it('clamps a negative page to 1', () => {
    const { result } = setup({ page: '-5' });
    expect(result.current.currentPage).toBe(1);
  });

  it('floors a fractional page to an integer', () => {
    const { result } = setup({ page: '2.9' });
    expect(result.current.currentPage).toBe(2);
  });

  it('falls back to 1 for a non-numeric page value', () => {
    const { result } = setup({ page: 'abc' });
    expect(result.current.currentPage).toBe(1);
  });

  it('goToPage with a non-integer value clamps to a safe integer page', () => {
    const { result, push } = setup();
    result.current.goToPage(2.9);
    expect(push).toHaveBeenCalledWith('/test?page=2');
  });

  it('goToPage(NaN) does not push a NaN page param', () => {
    const { result, push } = setup();
    result.current.goToPage(NaN);
    expect(push).toHaveBeenCalledWith('/test');
  });

  it('computes rangeStart and rangeEnd correctly for page 2', () => {
    const { result } = setup({ page: '2' });
    expect(result.current.rangeStart).toBe(11);
    expect(result.current.rangeEnd).toBe(20);
  });
});
