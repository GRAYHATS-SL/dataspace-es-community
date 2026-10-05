'use client';

import { useState } from 'react';

import {
  AccordionSection,
  ActiveChip,
  FilterGroup,
  FilterPanelHeader,
  FilterPill,
} from '@/components/molecules/FilterControls';
import { cn } from '@/lib/utils/cn';
import type { DateFilter, FilterOptions, OfferingFilters } from '@/lib/utils/filterOfferings';

type Option = { value: string; label: string };
type ListKey = Exclude<keyof OfferingFilters, 'searchTerm' | 'fechaFilter'>;

const STATUS_OPTIONS: Option[] = [
  { value: 'Launched', label: 'Publicada' },
  { value: 'Active', label: 'Activa' },
  { value: 'In design', label: 'En diseño' },
  { value: 'In test', label: 'En test' },
  { value: 'Retired', label: 'Retirada' },
  { value: 'Obsolete', label: 'Obsoleta' },
];

const PRICE_OPTIONS: Option[] = [
  { value: 'free', label: 'Gratuito' },
  { value: 'one time', label: 'Pago único' },
  { value: 'recurring', label: 'Suscripción' },
  { value: 'usage', label: 'Por uso' },
];

const FECHA_OPTIONS: Array<{ value: Exclude<DateFilter, ''>; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Últimos 3 meses' },
  { value: 'older', label: 'Más de 90 días' },
];

/** Toggles a value inside a multi-select list. */
const toggleMulti = (current: string[], value: string): string[] =>
  current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

/** Maps a plain list of values to options. */
const toOptions = (values: string[]): Option[] => values.map((v) => ({ value: v, label: v }));

/** Maps `{ id, name }` entries to options. */
const idsToOptions = (items: { id: string; name: string }[]): Option[] =>
  items.map(({ id, name }) => ({ value: id, label: name }));

type Chip = { id: string; label: string; onRemove: () => void };

/** Builds the removable chips of every active multi-select filter. */
const buildChips = (
  filters: OfferingFilters,
  optionsByKey: Record<ListKey, Option[]>,
  onFilterChange: (p: Partial<OfferingFilters>) => void,
): Chip[] => {
  const chips: Chip[] = (Object.keys(optionsByKey) as ListKey[]).flatMap((key) =>
    filters[key].map((value) => ({
      id: `${key}-${value}`,
      label: optionsByKey[key].find((o) => o.value === value)?.label ?? value,
      onRemove: () => onFilterChange({ [key]: toggleMulti(filters[key], value) }),
    })),
  );
  if (filters.fechaFilter) {
    chips.push({
      id: `fecha-${filters.fechaFilter}`,
      label: FECHA_OPTIONS.find((o) => o.value === filters.fechaFilter)?.label ?? '',
      onRemove: () => onFilterChange({ fechaFilter: '' }),
    });
  }
  return chips;
};

interface PillGroupProps {
  id: string;
  label: string;
  filterKey: ListKey;
  options: Option[];
  filters: OfferingFilters;
  onFilterChange: (partial: Partial<OfferingFilters>) => void;
}

/** Multi-select pill group bound to one filter key (hidden when there are no options). */
const PillGroup = ({
  id,
  label,
  filterKey,
  options,
  filters,
  onFilterChange,
}: Readonly<PillGroupProps>) => {
  if (options.length === 0) return null;
  return (
    <FilterGroup id={id} label={label}>
      {options.map(({ value, label: optionLabel }) => (
        <FilterPill
          key={value}
          label={optionLabel}
          selected={filters[filterKey].includes(value)}
          onClick={() => onFilterChange({ [filterKey]: toggleMulti(filters[filterKey], value) })}
        />
      ))}
    </FilterGroup>
  );
};

/** Props of `OfferingFilterPanel`. */
export interface OfferingFilterPanelProps {
  filters: OfferingFilters;
  filterOptions: FilterOptions;
  activeFilterCount: number;
  onFilterChange: (partial: Partial<OfferingFilters>) => void;
  onClearAll: () => void;
}

/** OfferingFilterPanel - Catalog filters in collapsible sections with active-filter chips. */
const OfferingFilterPanel = ({
  filters,
  filterOptions,
  activeFilterCount,
  onFilterChange,
  onClearAll,
}: Readonly<OfferingFilterPanelProps>) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const optionsByKey: Record<ListKey, Option[]> = {
    statusFilters: STATUS_OPTIONS,
    catalogFilters: idsToOptions(filterOptions.catalogos),
    categoriaFilters: idsToOptions(filterOptions.categorias),
    precioFilters: PRICE_OPTIONS,
    proveedorFilters: toOptions(filterOptions.proveedores),
  };

  const chips = buildChips(filters, optionsByKey, onFilterChange);
  const countOf = (keys: ListKey[]) => keys.reduce((sum, k) => sum + filters[k].length, 0);
  const taxCount = countOf(['statusFilters', 'catalogFilters', 'categoriaFilters']);
  const comercialCount =
    countOf(['precioFilters', 'proveedorFilters']) + (filters.fechaFilter ? 1 : 0);
  const groupProps = { filters, onFilterChange };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <FilterPanelHeader
        activeFilterCount={activeFilterCount}
        onClearAll={onClearAll}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen((v) => !v)}
        mobileControlsId="filter-panel-content"
      />

      <div id="filter-panel-content" className={cn(mobileOpen ? 'block' : 'hidden md:block')}>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 pt-1 pb-3">
            {chips.map((chip) => (
              <ActiveChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </div>
        )}

        <AccordionSection label="Taxonomía" activeCount={taxCount} defaultOpen>
          <PillGroup {...groupProps} id="filter-estado" label="Estado" filterKey="statusFilters" options={optionsByKey.statusFilters} />
          <PillGroup {...groupProps} id="filter-catalogo" label="Catálogo" filterKey="catalogFilters" options={optionsByKey.catalogFilters} />
          <PillGroup {...groupProps} id="filter-categoria" label="Categoría" filterKey="categoriaFilters" options={optionsByKey.categoriaFilters} />
        </AccordionSection>

        <AccordionSection label="Comercial" activeCount={comercialCount} defaultOpen={comercialCount > 0}>
          <PillGroup {...groupProps} id="filter-precio" label="Modelo de precio" filterKey="precioFilters" options={optionsByKey.precioFilters} />
          <PillGroup {...groupProps} id="filter-proveedor" label="Proveedor" filterKey="proveedorFilters" options={optionsByKey.proveedorFilters} />
          <FilterGroup id="filter-fecha" label="Última actualización">
            {FECHA_OPTIONS.map(({ value, label }) => (
              <FilterPill
                key={value}
                label={label}
                selected={filters.fechaFilter === value}
                onClick={() => onFilterChange({ fechaFilter: filters.fechaFilter === value ? '' : value })}
              />
            ))}
          </FilterGroup>
        </AccordionSection>
      </div>
    </div>
  );
};

export default OfferingFilterPanel;
