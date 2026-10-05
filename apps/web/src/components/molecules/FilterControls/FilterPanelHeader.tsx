'use client';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils/cn';

/** Props of `FilterPanelHeader`. */
export interface FilterPanelHeaderProps {
  activeFilterCount: number;
  onClearAll: () => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  mobileControlsId?: string;
}

/** FilterPanelHeader - Filter panel header with count badge, "clear" button and mobile toggle. */
const FilterPanelHeader = ({
  activeFilterCount,
  onClearAll,
  mobileOpen,
  onMobileToggle,
  mobileControlsId,
}: Readonly<FilterPanelHeaderProps>) => {
  const hasFilters = activeFilterCount > 0;
  const plural = activeFilterCount === 1 ? '' : 's';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon name="SlidersHorizontal" size={14} className="shrink-0 text-gray-light" />
        <Typography variant="caption" color="gray" className="shrink-0 leading-none">
          Filtros
        </Typography>
        {hasFilters && (
          <span
            aria-label={`${activeFilterCount} filtro${plural} activo${plural}`}
            className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-white"
          >
            {activeFilterCount}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
            className="flex items-center justify-center rounded p-1 text-gray-light hover:text-gray focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none md:hidden"
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
