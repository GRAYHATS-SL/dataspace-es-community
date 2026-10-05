import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Checkbox - Accessible checkbox with label and error state.
 */

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, Readonly<CheckboxProps>>(
  ({ className, label, description, error, required, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        <label className="group flex cursor-pointer items-start gap-4">
          <div className="pt-0.5">
            <input
              type="checkbox"
              required={required}
              aria-required={required ? true : undefined}
              className={cn(
                'text-primary accent-primary h-5 w-5 rounded border-gray-300 bg-transparent',
                'focus:ring-primary transition-colors focus:ring-offset-0 group-hover:border-primary',
                error && 'border-danger focus:ring-danger',
                className,
              )}
              ref={ref}
              {...props}
            />
          </div>
          {(label || description) && (
            <div className="flex flex-col gap-0.5">
              {label && (
                <Typography variant="form-label" className="leading-relaxed">
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
            </div>
          )}
        </label>
        {error && (
          <Typography variant="small" className="text-danger ml-9">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
