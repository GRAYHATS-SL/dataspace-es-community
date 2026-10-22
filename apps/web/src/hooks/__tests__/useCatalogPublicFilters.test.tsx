import { renderHook } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCatalogPublicFilters } from '@/hooks/useCatalogPublicFilters';
import type { OfferingFilters } from '@/lib/utils/filterOfferings';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

function setup(query = '') {
  const params = new URLSearchParams(query);
  vi.mocked(useSearchParams).mockReturnValue(params as never);
  vi.mocked(usePathname).mockReturnValue('/catalogo');
  const push = vi.fn();
  vi.mocked(useRouter).mockReturnValue({ push } as never);
  const { result } = renderHook(() => useCatalogPublicFilters());
  return { result, push };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useCatalogPublicFilters', () => {
  describe('reading filters from URL params', () => {
    it('defaults to empty values when no params are present', () => {
      const { result } = setup();
      expect(result.current.filters).toEqual<OfferingFilters>({
        searchTerm: '',
        statusFilters: [],
        catalogFilters: [],
        categoriaFilters: [],
        precioFilters: [],
        proveedorFilters: [],
        fechaFilter: '',
        formatoFilters: [],
        standardFilters: [],
        licenseFilters: [],
        qualityFilters: [],
      });
    });

    it('reads searchTerm (q) as a plain string', () => {
      const { result } = setup('q=sensores');
      expect(result.current.filters.searchTerm).toBe('sensores');
    });

    it('reads status as a comma-split array', () => {
      const { result } = setup('status=Active,Launched');
      expect(result.current.filters.statusFilters).toEqual(['Active', 'Launched']);
    });

    it('reads catalog as a comma-split array', () => {
      const { result } = setup('catalog=cat-1,cat-2');
      expect(result.current.filters.catalogFilters).toEqual(['cat-1', 'cat-2']);
    });

    it('reads cat as a comma-split array', () => {
      const { result } = setup('cat=c1,c2,c3');
      expect(result.current.filters.categoriaFilters).toEqual(['c1', 'c2', 'c3']);
    });

    it('reads precio as a comma-split array', () => {
      const { result } = setup('precio=one time,recurring');
      expect(result.current.filters.precioFilters).toEqual(['one time', 'recurring']);
    });

    it('reads prov as a comma-split array', () => {
      const { result } = setup('prov=Acme,Globex');
      expect(result.current.filters.proveedorFilters).toEqual(['Acme', 'Globex']);
    });

    it('reads fecha as a single string (not split)', () => {
      const { result } = setup('fecha=7d');
      expect(result.current.filters.fechaFilter).toBe('7d');
    });

    it('reads formato as a comma-split array', () => {
      const { result } = setup('formato=csv,json');
      expect(result.current.filters.formatoFilters).toEqual(['csv', 'json']);
    });

    it('reads standard as a comma-split array', () => {
      const { result } = setup('standard=ISO,DCAT');
      expect(result.current.filters.standardFilters).toEqual(['ISO', 'DCAT']);
    });

    it('reads license as a comma-split array', () => {
      const { result } = setup('license=CC-BY,ODbL');
      expect(result.current.filters.licenseFilters).toEqual(['CC-BY', 'ODbL']);
    });

    it('reads quality as a comma-split array', () => {
      const { result } = setup('quality=high,medium');
      expect(result.current.filters.qualityFilters).toEqual(['high', 'medium']);
    });

    it('filters out empty segments produced by trailing commas', () => {
      const { result } = setup('status=Active,');
      expect(result.current.filters.statusFilters).toEqual(['Active']);
    });
  });

  describe('special characters', () => {
    const SPECIAL = `a&b #c %d +e "f" 'g' h/i ñ é 日本 😀`;

    it('round-trips free text in q through the URL unchanged', () => {
      const { result, push } = setup();
      result.current.setFilters({ searchTerm: SPECIAL });

      const url = push.mock.calls[0][0] as string;
      expect(url).not.toMatch(/#|\s/);
      expect(new URLSearchParams(url.split('?')[1]).get('q')).toBe(SPECIAL);
    });

    it('does not split a multi-value filter on a comma inside a value', () => {
      const { result, push } = setup();
      result.current.setFilters({ proveedorFilters: ['Acme, S.L.', '100% & más'] });

      const url = push.mock.calls[0][0] as string;
      const raw = new URLSearchParams(url.split('?')[1]).get('prov');
      const { result: reread } = setup(`prov=${encodeURIComponent(raw ?? '')}`);
      expect(reread.current.filters.proveedorFilters).toEqual(['Acme, S.L.', '100% & más']);
    });

    it('keeps a stray % from a hand-edited URL instead of throwing', () => {
      const { result } = setup('prov=100%25%25');
      expect(result.current.filters.proveedorFilters).toEqual(['100%%']);
    });
  });

  describe('setFilters', () => {
    it('merges a partial update onto the current filters and pushes the resulting query string', () => {
      const { result, push } = setup('q=old');
      result.current.setFilters({ statusFilters: ['Active'] });

      expect(push).toHaveBeenCalledTimes(1);
      const url = push.mock.calls[0][0] as string;
      expect(url).toContain('/catalogo?');
      const qs = new URLSearchParams(url.split('?')[1]);
      expect(qs.get('q')).toBe('old');
      expect(qs.get('status')).toBe('Active');
    });

    it('strips the page param on any filter change', () => {
      const { result, push } = setup('page=3&q=old');
      result.current.setFilters({ searchTerm: 'new' });

      const url = push.mock.calls[0][0] as string;
      const qs = new URLSearchParams(url.split('?')[1]);
      expect(qs.has('page')).toBe(false);
      expect(qs.get('q')).toBe('new');
    });

    it('removes a param entirely when the corresponding filter is cleared to empty', () => {
      const { result, push } = setup('status=Active');
      result.current.setFilters({ statusFilters: [] });

      const url = push.mock.calls[0][0] as string;
      expect(url).toBe('/catalogo');
    });
  });

  describe('clearAllFilters', () => {
    it('pushes the bare pathname with no query string', () => {
      const { result, push } = setup('q=old&status=Active&page=2');
      result.current.clearAllFilters();

      expect(push).toHaveBeenCalledWith('/catalogo');
    });
  });

  describe('activeFilterCount', () => {
    it('is 0 when no filters are active', () => {
      const { result } = setup();
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('counts non-empty array filters and non-empty string filters', () => {
      // 2 array filters (status, cat) + 1 string filter (fecha) = 3
      const { result } = setup('status=Active&cat=c1,c2&fecha=7d');
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('counts every active dimension across all filter kinds', () => {
      const { result } = setup(
        'q=term&status=Active&catalog=cat-1&cat=c1&precio=recurring&prov=Acme&fecha=today&formato=csv&standard=ISO&license=CC-BY&quality=high',
      );
      expect(result.current.activeFilterCount).toBe(11);
    });
  });
});
