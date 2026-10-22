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
import type { FilterOptions, OfferingFilters } from '@/lib/utils/filterOfferings';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'Launched', label: 'Publicada' },
  { value: 'Active', label: 'Activa' },
  { value: 'In design', label: 'En diseño' },
  { value: 'In test', label: 'En test' },
  { value: 'Retired', label: 'Retirada' },
  { value: 'Obsolete', label: 'Obsoleta' },
] as const;

const PRICE_OPTIONS = [
  { value: 'free', label: 'Gratuito' },
  { value: 'one time', label: 'Pago único' },
  { value: 'recurring', label: 'Suscripción' },
  { value: 'usage', label: 'Por uso' },
] as const;

const FECHA_OPTIONS: Array<{ value: Exclude<OfferingFilters['fechaFilter'], ''>; label: string }> =
  [
    { value: 'today', label: 'Hoy' },
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Último mes' },
    { value: '90d', label: 'Últimos 3 meses' },
    { value: 'older', label: 'Más de 90 días' },
  ];

// ── Helpers ──────────────────────────────────────────────────────────────────

const toggleSingle = <T extends string>(current: T | '', value: T): T | '' =>
  current === value ? '' : value;

const toggleMulti = (current: string[], value: string): string[] =>
  current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

// ── Active chips ─────────────────────────────────────────────────────────────

type Chip = { id: string; label: string; onRemove: () => void };

const buildChips = (
  filters: OfferingFilters,
  filterOptions: FilterOptions,
  onFilterChange: (p: Partial<OfferingFilters>) => void,
): Chip[] => {
  const chips: Chip[] = [];
  const rm = (key: keyof OfferingFilters, val: string) =>
    onFilterChange({ [key]: (Reflect.get(filters, key) as string[]).filter((v) => v !== val) });

  for (const v of filters.statusFilters)
    chips.push({
      id: `s-${v}`,
      label: STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v,
      onRemove: () => rm('statusFilters', v),
    });
  for (const v of filters.catalogFilters)
    chips.push({
      id: `c-${v}`,
      label: filterOptions.catalogos.find((c) => c.id === v)?.name ?? v,
      onRemove: () => rm('catalogFilters', v),
    });
  for (const v of filters.categoriaFilters)
    chips.push({
      id: `ca-${v}`,
      label: filterOptions.categorias.find((c) => c.id === v)?.name ?? v,
      onRemove: () => rm('categoriaFilters', v),
    });
  for (const v of filters.precioFilters)
    chips.push({
      id: `p-${v}`,
      label: PRICE_OPTIONS.find((o) => o.value === v)?.label ?? v,
      onRemove: () => rm('precioFilters', v),
    });
  for (const v of filters.proveedorFilters)
    chips.push({ id: `pv-${v}`, label: v, onRemove: () => rm('proveedorFilters', v) });
  if (filters.fechaFilter)
    chips.push({
      id: `f-${filters.fechaFilter}`,
      label:
        FECHA_OPTIONS.find((o) => o.value === filters.fechaFilter)?.label ?? filters.fechaFilter,
      onRemove: () => onFilterChange({ fechaFilter: '' }),
    });
  for (const v of filters.formatoFilters)
    chips.push({ id: `fo-${v}`, label: v, onRemove: () => rm('formatoFilters', v) });
  for (const v of filters.licenseFilters)
    chips.push({ id: `li-${v}`, label: v, onRemove: () => rm('licenseFilters', v) });
  for (const v of filters.standardFilters)
    chips.push({ id: `st-${v}`, label: v, onRemove: () => rm('standardFilters', v) });
  for (const v of filters.qualityFilters)
    chips.push({ id: `qu-${v}`, label: v, onRemove: () => rm('qualityFilters', v) });

  return chips;
};

// ── Main component ────────────────────────────────────────────────────────────

interface OfferingFilterPanelProps {
  filters: OfferingFilters;
  filterOptions: FilterOptions;
  activeFilterCount: number;
  onFilterChange: (partial: Partial<OfferingFilters>) => void;
  onClearAll: () => void;
}

/**
 * OfferingFilterPanel - Catalog filter panel with collapsible sections and active filter chips
 *
 * @param {OfferingFilters} filters - Current filters.
 * @param {FilterOptions} filterOptions - Available options per filter.
 * @param {number} activeFilterCount - Number of active filters.
 * @param {(partial: Partial<OfferingFilters>) => void} onFilterChange - Called on filter change.
 * @param {() => void} onClearAll - Clears all filters.
 */
const OfferingFilterPanel = ({
  filters,
  filterOptions,
  activeFilterCount,
  onFilterChange,
  onClearAll,
}: Readonly<OfferingFilterPanelProps>) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const chips = buildChips(filters, filterOptions, onFilterChange);

  const taxCount =
    filters.statusFilters.length + filters.catalogFilters.length + filters.categoriaFilters.length;
  const dataCount =
    filters.formatoFilters.length +
    filters.standardFilters.length +
    filters.licenseFilters.length +
    filters.qualityFilters.length;
  const comercialCount =
    filters.precioFilters.length + filters.proveedorFilters.length + (filters.fechaFilter ? 1 : 0);

  const hasDataOptions =
    filterOptions.formatos.length > 0 ||
    filterOptions.licenses.length > 0 ||
    filterOptions.standards.length > 0 ||
    filterOptions.qualities.length > 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <FilterPanelHeader
        activeFilterCount={activeFilterCount}
        onClearAll={onClearAll}
        mobileOpen={mobileOpen}
        onMobileToggle={() => setMobileOpen((v) => !v)}
        mobileControlsId="filter-panel-content"
      />

      <div
        id="filter-panel-content"
        className={cn(mobileOpen ? 'block md:block' : 'hidden md:block')}
      >
        {/* Chips de filtros activos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1 border-b border-gray-100">
            {chips.map((chip) => (
              <ActiveChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </div>
        )}

        {/* Taxonomía */}
        <AccordionSection label="Taxonomía" activeCount={taxCount} defaultOpen={true}>
          <FilterGroup id="filter-estado" label="Estado">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <FilterPill
                key={value}
                label={label}
                selected={filters.statusFilters.includes(value)}
                onClick={() =>
                  onFilterChange({ statusFilters: toggleMulti(filters.statusFilters, value) })
                }
              />
            ))}
          </FilterGroup>
          {filterOptions.catalogos.length > 0 && (
            <FilterGroup id="filter-catalogo" label="Catálogo">
              {filterOptions.catalogos.map(({ id, name }) => (
                <FilterPill
                  key={id}
                  label={name}
                  selected={filters.catalogFilters.includes(id)}
                  onClick={() =>
                    onFilterChange({ catalogFilters: toggleMulti(filters.catalogFilters, id) })
                  }
                />
              ))}
            </FilterGroup>
          )}
          {filterOptions.categorias.length > 0 && (
            <FilterGroup id="filter-categoria" label="Categoría">
              {filterOptions.categorias.map(({ id, name }) => (
                <FilterPill
                  key={id}
                  label={name}
                  selected={filters.categoriaFilters.includes(id)}
                  onClick={() =>
                    onFilterChange({ categoriaFilters: toggleMulti(filters.categoriaFilters, id) })
                  }
                />
              ))}
            </FilterGroup>
          )}
        </AccordionSection>

        {/* Datos */}
        {hasDataOptions && (
          <AccordionSection label="Datos" activeCount={dataCount} defaultOpen={dataCount > 0}>
            {filterOptions.formatos.length > 0 && (
              <FilterGroup id="filter-formato" label="Formato">
                {filterOptions.formatos.map((v) => (
                  <FilterPill
                    key={v}
                    label={v}
                    selected={filters.formatoFilters.includes(v)}
                    onClick={() =>
                      onFilterChange({ formatoFilters: toggleMulti(filters.formatoFilters, v) })
                    }
                  />
                ))}
              </FilterGroup>
            )}
            {filterOptions.licenses.length > 0 && (
              <FilterGroup id="filter-license" label="Licencia">
                {filterOptions.licenses.map((v) => (
                  <FilterPill
                    key={v}
                    label={v}
                    selected={filters.licenseFilters.includes(v)}
                    onClick={() =>
                      onFilterChange({ licenseFilters: toggleMulti(filters.licenseFilters, v) })
                    }
                  />
                ))}
              </FilterGroup>
            )}
            {filterOptions.standards.length > 0 && (
              <FilterGroup id="filter-standard" label="Estándar">
                {filterOptions.standards.map((v) => (
                  <FilterPill
                    key={v}
                    label={v}
                    selected={filters.standardFilters.includes(v)}
                    onClick={() =>
                      onFilterChange({ standardFilters: toggleMulti(filters.standardFilters, v) })
                    }
                  />
                ))}
              </FilterGroup>
            )}
            {filterOptions.qualities.length > 0 && (
              <FilterGroup id="filter-quality" label="Calidad">
                {filterOptions.qualities.map((v) => (
                  <FilterPill
                    key={v}
                    label={v}
                    selected={filters.qualityFilters.includes(v)}
                    onClick={() =>
                      onFilterChange({ qualityFilters: toggleMulti(filters.qualityFilters, v) })
                    }
                  />
                ))}
              </FilterGroup>
            )}
          </AccordionSection>
        )}

        {/* Comercial */}
        <AccordionSection
          label="Comercial"
          activeCount={comercialCount}
          defaultOpen={comercialCount > 0}
        >
          <FilterGroup id="filter-precio" label="Modelo de precio">
            {PRICE_OPTIONS.map(({ value, label }) => (
              <FilterPill
                key={value}
                label={label}
                selected={filters.precioFilters.includes(value)}
                onClick={() =>
                  onFilterChange({ precioFilters: toggleMulti(filters.precioFilters, value) })
                }
              />
            ))}
          </FilterGroup>
          {filterOptions.proveedores.length > 0 && (
            <FilterGroup id="filter-proveedor" label="Proveedor">
              {filterOptions.proveedores.map((name) => (
                <FilterPill
                  key={name}
                  label={name}
                  selected={filters.proveedorFilters.includes(name)}
                  onClick={() =>
                    onFilterChange({
                      proveedorFilters: toggleMulti(filters.proveedorFilters, name),
                    })
                  }
                />
              ))}
            </FilterGroup>
          )}
          <FilterGroup id="filter-fecha" label="Última actualización">
            {FECHA_OPTIONS.map(({ value, label }) => (
              <FilterPill
                key={value}
                label={label}
                selected={filters.fechaFilter === value}
                onClick={() =>
                  onFilterChange({ fechaFilter: toggleSingle(filters.fechaFilter, value) })
                }
              />
            ))}
          </FilterGroup>
        </AccordionSection>
      </div>
    </div>
  );
};

export default OfferingFilterPanel;
