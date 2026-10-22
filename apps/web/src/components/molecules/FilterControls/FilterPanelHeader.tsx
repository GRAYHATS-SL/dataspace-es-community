'use client';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils/cn';

export interface FilterPanelHeaderProps {
  activeFilterCount: number;
  onClearAll: () => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  mobileControlsId?: string;
}

/**
 * FilterPanelHeader - Standard header for filter panels
 *
 * @param {number} activeFilterCount - Total active filters, shown as a badge.
 * @param {() => void} onClearAll - Clear-all callback.
 * @param {boolean} [mobileOpen] - Whether the panel is expanded on mobile.
 * @param {() => void} [onMobileToggle] - Mobile toggle callback.
 * @param {string} [mobileControlsId] - Id of the content controlled by the toggle.
 */
const FilterPanelHeader = ({
  activeFilterCount,
  onClearAll,
  mobileOpen,
  onMobileToggle,
  mobileControlsId,
}: Readonly<FilterPanelHeaderProps>) => {
  const hasFilters = activeFilterCount > 0;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-2 min-w-0">
        <Icon name="SlidersHorizontal" size={14} className="text-gray-light shrink-0" />
        <Typography variant="caption" color="gray" className="leading-none shrink-0">
          Filtros
        </Typography>
        {hasFilters && (
          <span
            aria-label={`${activeFilterCount} filtro${activeFilterCount === 1 ? '' : 's'} activo${activeFilterCount === 1 ? '' : 's'}`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-white"
          >
            {activeFilterCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {hasFilters && (
          <Button
            size="xs"
            variant="ghost"
            aria-label="Limpiar todos los filtros activos"
            onClick={onClearAll}
            className="gap-1 text-gray hover:text-danger focus:ring-danger"
          >
            <Icon name="X" size={11} />
            Limpiar
          </Button>
        )}
        {onMobileToggle && (
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileControlsId}
            aria-label={mobileOpen ? 'Cerrar filtros' : 'Abrir filtros'}
            onClick={onMobileToggle}
            className="flex items-center justify-center rounded p-1 text-gray-light hover:text-gray md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <Icon
              name="ChevronDown"
              size={16}
              className={cn('transition-transform duration-200', mobileOpen && 'rotate-180')}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterPanelHeader;
