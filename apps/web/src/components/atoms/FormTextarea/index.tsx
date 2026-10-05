import { forwardRef, ReactNode, TextareaHTMLAttributes, useId } from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * Textarea - Multiline text field with label and error state.
 */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: ReactNode;
  error?: string;
  id?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, Readonly<TextareaProps>>(
  ({ className, label, description, error, id, required, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <Typography as="label" htmlFor={textareaId} variant="small" className="font-semibold">
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
          <Typography variant="small" color="gray">
            {description}
          </Typography>
        )}
        <textarea
          id={textareaId}
          required={required}
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'border-gray-lightest w-full rounded-lg border bg-white p-3.5 text-sm',
            'focus:ring-primary focus:border-primary transition-all outline-none focus:ring-2',
            'resize-none placeholder:text-gray-400',
            error && 'border-danger focus:border-danger focus:ring-danger',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <Typography id={errorId} variant="small" className="text-danger" role="alert">
            {error}
          </Typography>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
export { Textarea };
