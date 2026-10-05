import { forwardRef, SelectHTMLAttributes, useId } from 'react';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Select - Styled native select with label, description, error and placeholder.
 */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  loading?: boolean;
}

const Select = forwardRef<HTMLSelectElement, Readonly<SelectProps>>(
  (
    { className, label, description, error, options, placeholder, loading, disabled, id, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const isDisabled = disabled || loading;
    const effectivePlaceholder = loading ? 'Cargando...' : placeholder;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <Typography as="label" htmlFor={selectId} variant="form-label" className="font-semibold">
            {label}
            {props.required && (
              <>
                <span aria-hidden="true" className="ml-0.5 text-danger">
                  *
                </span>
                <span className="sr-only"> (requerido)</span>
              </>
            )}
          </Typography>
        )}
        {description && (
          <Typography variant="form-description" color="gray">
            {description}
          </Typography>
        )}
        <div className="relative" aria-busy={loading} aria-live="polite">
          <select
            id={selectId}
            className={cn(
              'flex h-10 w-full rounded-md border border-gray-lightest bg-white px-3 py-2 text-sm transition-colors',
              'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'cursor-pointer appearance-none pr-10',
              error && 'border-danger focus-visible:ring-danger',
              className,
            )}
            ref={ref}
            disabled={isDisabled}
            aria-required={props.required ? true : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
          >
            {effectivePlaceholder && (
              <option value="" disabled>
                {effectivePlaceholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon name="ChevronDown" className="text-gray-400" aria-hidden="true" />
          </div>
        </div>
        {error && (
          <Typography id={errorId} variant="small" color="danger" role="alert">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
