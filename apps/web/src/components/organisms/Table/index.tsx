import { cva } from 'class-variance-authority';
import React from 'react';

import Card from '@/components/atoms/Card';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Table - Generic table with loading and empty states and custom row rendering.
 *
 * @example
 * <Table
 *   columns={[{ key: 'name', label: 'Nombre' }]}
 *   data={items}
 *   keyExtractor={(item) => item.id}
 *   renderRow={(item) => <td>{item.name}</td>}
 * />
 */

// ---------------------------------------------------------------------------
// CVA variant definitions
// ---------------------------------------------------------------------------

const tableVariants = cva('w-full border-collapse text-left', {
  variants: {
    size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  },
  defaultVariants: { size: 'md' },
});

const thPaddingVariants = cva('', {
  variants: {
    size: { sm: 'px-1 py-3', md: 'px-2 py-4', lg: 'px-4 py-5' },
  },
  defaultVariants: { size: 'md' },
});

const theadRowVariants = cva('border-b', {
  variants: {
    variant: {
      card: 'border-gray-lightest bg-gray-50/50',
      plain: 'border-gray-100',
    },
  },
  defaultVariants: { variant: 'card' },
});

const tbodyVariants = cva('divide-y', {
  variants: {
    variant: { card: 'divide-gray-50', plain: 'divide-gray-100' },
  },
  defaultVariants: { variant: 'card' },
});

const dataRowVariants = cva('transition-colors', {
  variants: {
    hoverable: { true: '', false: '' },
    variant: { card: '', plain: '' },
  },
  compoundVariants: [
    { hoverable: true, variant: 'card', class: 'hover:bg-gray-50/50' },
    { hoverable: true, variant: 'plain', class: 'hover:bg-muted/50' },
  ],
  defaultVariants: { hoverable: true, variant: 'card' },
});

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /** Passed directly to `style={{ width }}`. Tailwind dynamic classes are not used. */
  width?: string;
  className?: string;
}

export interface TableProps<T extends object> {
  columns: TableColumn[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  /** Preferred over index-based keys when data has a stable identity. */
  keyExtractor?: (item: T, index: number) => string | number;
  variant?: 'card' | 'plain';
  size?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  loading?: boolean;
  emptyState?: React.ReactNode;
  footer?: React.ReactNode;
  /** Applied to the outer wrapper element. */
  className?: string;
  /** Forwarded to the `<table>` element (e.g. aria-label, summary). */
  tableProps?: React.TableHTMLAttributes<HTMLTableElement>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TableInner<T extends object>(
  {
    columns,
    data,
    renderRow,
    keyExtractor,
    variant = 'card',
    size = 'md',
    hoverable = true,
    loading = false,
    emptyState,
    footer,
    className,
    tableProps,
  }: Readonly<TableProps<T>>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  // Resolved as a plain JSX value — NOT a nested component — to avoid
  // the "component defined inside render" identity-change bug.
  let tbodyRows: React.ReactNode;
  if (loading) {
    tbodyRows = (
      <tr role="row">
        <td colSpan={columns.length} className={cn('text-center', thPaddingVariants({ size }))}>
          <Typography variant="small" color="gray">
            Cargando...
          </Typography>
        </td>
      </tr>
    );
  } else if (data.length === 0) {
    tbodyRows = (
      <tr role="row">
        <td colSpan={columns.length} className={cn('text-center', thPaddingVariants({ size }))}>
          {emptyState ?? (
            <Typography variant="small" color="gray">
              No hay datos para mostrar
            </Typography>
          )}
        </td>
      </tr>
    );
  } else {
    tbodyRows = data.map((item, index) => (
      <tr
        key={keyExtractor ? keyExtractor(item, index) : index}
        className={dataRowVariants({ hoverable, variant })}
        role="row"
      >
        {renderRow(item, index)}
      </tr>
    ));
  }

  const tableContent = (
    <div className="overflow-x-auto">
      <table className={tableVariants({ size })} role="table" {...tableProps}>
        <thead>
          <tr className={theadRowVariants({ variant })} role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  thPaddingVariants({ size }),
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.className,
                )}
                style={column.width ? { width: column.width } : undefined}
                role="columnheader"
                scope="col"
              >
                <Typography variant="caption" color="gray">
                  {column.label}
                </Typography>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tbodyVariants({ variant })}>{tbodyRows}</tbody>
      </table>
    </div>
  );

  if (variant === 'card') {
    return (
      <Card
        ref={ref}
        variant="default"
        size="sm"
        radius="xl"
        className={cn('overflow-hidden', className)}
      >
        {tableContent}
        {footer}
      </Card>
    );
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {tableContent}
      {footer}
    </div>
  );
}

// forwardRef erases the generic parameter T; this cast restores it.
const Table = React.forwardRef(TableInner) as <T extends object>(
  props: TableProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement | null;

(Table as { displayName?: string }).displayName = 'Table';

export default Table;
