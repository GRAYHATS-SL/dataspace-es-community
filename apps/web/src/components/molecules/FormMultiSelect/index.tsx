import { forwardRef, type ReactNode } from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/** Option of `MultiSelect`. */
export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

/** Props of `MultiSelect`. */
export interface MultiSelectProps {
  label?: string;
  description?: string;
  error?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  disabled?: boolean;
  loading?: boolean;
  name?: string;
}

/** Multiple selector rendered as a checkbox list inside a bordered panel. */
export const MultiSelect = forwardRef<HTMLDivElement, Readonly<MultiSelectProps>>(
  ({ label, description, error, options, value, onChange, onBlur, disabled, loading }, ref) => {
    const selected = new Set(value);

    const toggle = (optValue: string) => {
      if (selected.has(optValue)) {
        onChange(value.filter((v) => v !== optValue));
      } else {
        onChange([...value, optValue]);
      }
    };

    let listContent: ReactNode;
    if (loading) {
      listContent = <p className="px-3.5 py-2.5 text-sm text-gray">Cargando...</p>;
    } else if (options.length === 0) {
      listContent = <p className="px-3.5 py-2.5 text-sm text-gray">No hay opciones disponibles.</p>;
    } else {
      listContent = (
        <div className="max-h-44 divide-y divide-gray-lightest overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-muted',
                disabled && 'cursor-default',
              )}
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => !disabled && toggle(option.value)}
                disabled={disabled}
                className="h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-primary">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-gray">{option.description}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <Typography as="label" variant="form-label" className="font-semibold">
            {label}
          </Typography>
        )}
        {description && (
          <Typography variant="form-description" color="gray">
            {description}
          </Typography>
        )}
        <div
          ref={ref}
          tabIndex={-1}
          className={cn(
            'rounded-lg border border-gray-lightest bg-white',
            error && 'border-danger',
            disabled && 'opacity-50',
          )}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) onBlur?.();
          }}
        >
          {listContent}
        </div>
        {error && (
          <Typography variant="small" color="danger">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
