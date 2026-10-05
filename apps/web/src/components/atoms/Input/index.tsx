import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Input - Text input with variants and error state.
 * Accepts every native input attribute.
 */

const inputVariants = cva(
  'flex w-full rounded-md border px-4 py-3 text-sm transition-colors placeholder:text-gray focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-lightest bg-white focus-visible:ring-primary',
        filled: 'border-transparent bg-muted focus-visible:ring-primary',
        error: 'border-danger bg-white focus-visible:ring-danger',
      },
      size: {
        sm: 'h-9 px-3 py-1 text-sm',
        default: 'h-10 px-3 py-2',
        lg: 'h-12 px-4 py-3 text-sm md:text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  label?: string;
  description?: React.ReactNode;
  prefix?: string;
  suffix?: string;
}

const Input = React.forwardRef<HTMLInputElement, Readonly<InputProps>>(
  (
    {
      className,
      variant,
      size,
      error,
      label,
      description,
      prefix,
      suffix,
      type,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const reactId = React.useId();
    const finalVariant = error ? 'error' : variant;
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex w-full flex-col gap-1">
        {label && (
          <Typography as="label" htmlFor={inputId} variant="form-label" className="font-semibold">
            {label}
            {required && (
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
        <div className="relative">
          {prefix && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-gray-400">
              {prefix}
            </span>
          )}
          <input
            type={type}
            id={inputId}
            required={required}
            aria-required={required ? true : undefined}
            className={cn(
              inputVariants({ variant: finalVariant, size }),
              prefix && 'pl-16',
              suffix && 'pr-16',
              className,
            )}
            ref={ref}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          {suffix && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-gray-400">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <Typography as="span" id={errorId} variant="small" className="text-danger" role="alert">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
