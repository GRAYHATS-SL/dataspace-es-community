import { useId } from 'react';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

const STAR_LABEL: Record<(typeof RATING_VALUES)[number], string> = {
  1: '1 estrella',
  2: '2 estrellas',
  3: '3 estrellas',
  4: '4 estrellas',
  5: '5 estrellas',
};

export interface StarRatingProps {
  label?: string;
  value: number;
  onChange?: (value: number) => void;
  onBlur?: () => void;
  name?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Read-only mode: renders static stars. */
  readOnly?: boolean;
  size?: number;
}

/**
 * StarRating - Accessible 1-5 star rating built on native radio inputs.
 */
export function StarRating({
  label,
  value,
  onChange,
  onBlur,
  name,
  error,
  required,
  disabled,
  readOnly,
  size = 24,
}: Readonly<StarRatingProps>) {
  const generatedId = useId();
  const groupId = name ?? generatedId;
  const errorId = `${groupId}-error`;

  if (readOnly) {
    return (
      <div
        role="img"
        aria-label={`Valoración: ${value} de 5 estrellas`}
        className="flex items-center gap-0.5"
      >
        {RATING_VALUES.map((star) => (
          <Icon
            key={star}
            name="Star"
            size={size}
            className={star <= Math.round(value) ? 'fill-warning text-warning' : 'text-gray-200'}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Typography as="span" variant="form-label" id={`${groupId}-label`}>
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
      <div
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="flex items-center gap-1"
      >
        {RATING_VALUES.map((star) => {
          const inputId = `${groupId}-star-${star}`;
          return (
            <label
              key={star}
              htmlFor={inputId}
              className={cn(
                'cursor-pointer rounded-sm p-0.5 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                id={inputId}
                name={groupId}
                value={star}
                checked={value === star}
                disabled={disabled}
                required={required}
                onChange={() => onChange?.(star)}
                onBlur={onBlur}
                className="sr-only"
              />
              <span className="sr-only">{STAR_LABEL[star]}</span>
              <Icon
                aria-hidden="true"
                name="Star"
                size={size}
                className={cn(
                  'transition-colors',
                  star <= value ? 'fill-warning text-warning' : 'text-gray-200',
                )}
              />
            </label>
          );
        })}
      </div>
      {error && (
        <Typography id={errorId} variant="small" className="text-danger" role="alert">
          {error}
        </Typography>
      )}
    </div>
  );
}

export default StarRating;
