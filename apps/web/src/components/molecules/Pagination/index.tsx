import React from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

/**
 * Number of sibling pages shown on each side of the current page.
 */
const SIBLING_COUNT = 1;

const ELLIPSIS = '…' as const;
type PageItem = number | typeof ELLIPSIS;

/**
 * Builds the list of pages to render, with ellipses where needed.
 */
function buildPageRange(current: number, total: number): PageItem[] {
  if (total <= 1) return [1];

  const left = Math.max(2, current - SIBLING_COUNT);
  const right = Math.min(total - 1, current + SIBLING_COUNT);

  const pages: PageItem[] = [1];
  if (left > 2) pages.push(ELLIPSIS);
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push(ELLIPSIS);
  pages.push(total);

  return pages;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination - Accessible page navigation with ellipses.
 * Renders nothing when `totalPages <= 1`.
 */
const Pagination: React.FC<Readonly<PaginationProps>> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
}) => {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="Paginación del catálogo"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {/* Previous */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Ir a la página anterior"
        className="gap-1"
      >
        <Icon name="ChevronLeft" size={16} />
      </Button>

      {/* Pages */}
      {pages.map((page, i) =>
        page === ELLIPSIS ? (
          <span
            key={`ellipsis-${pages[i - 1] ?? 'start'}-${pages[i + 1] ?? 'end'}`}
            aria-hidden="true"
            className="select-none px-2 text-sm text-gray-400"
          >
            {ELLIPSIS}
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(page)}
            aria-label={`Ir a la página ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            className="min-w-8"
          >
            {page}
          </Button>
        ),
      )}

      {/* Next */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Ir a la página siguiente"
        className="gap-1"
      >
        <Icon name="ChevronRight" size={16} />
      </Button>
    </nav>
  );
};

export default Pagination;
