import type { KeyboardEvent } from 'react';
import { useRef } from 'react';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  'aria-label'?: string;
}

/**
 * Segmented - Inline group of exclusive buttons (compact alternative to `Select`)
 *
 * @param {T} value - Selected value.
 * @param {(value: T) => void} onChange - Change callback.
 * @param {SegmentedOption<T>[]} options - Group options.
 * @param {string} [className] - Additional CSS classes.
 * @param {string} ['aria-label'] - Accessible label of the `radiogroup`.
 */
export default function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: Readonly<SegmentedProps<T>>) {
  const buttonRefs = useRef(new Map<number, HTMLButtonElement | null>());

  const selectByIndex = (index: number) => {
    const wrapped = (index + options.length) % options.length;
    const next = options.at(wrapped);
    if (next) onChange(next.value);
    buttonRefs.current.get(wrapped)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectByIndex(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      selectByIndex(index - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-fit gap-0.5 rounded-lg border border-gray-lightest bg-muted p-0.5',
        className,
      )}
    >
      {options.map((option, index) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current.set(index, el);
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active ? 'bg-white text-primary shadow-sm' : 'text-gray hover:text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
