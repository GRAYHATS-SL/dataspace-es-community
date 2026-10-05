import React from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { RadioOptionProps } from '@/types/radioselector';

import ComplexRadioContent from './ComplexRadioContent';

/**
 * RadioOption - Single radio option, rendered as a plain radio ("simple") or a selectable card ("complex").
 */
const RadioOption = React.forwardRef<HTMLInputElement, Readonly<RadioOptionProps>>(
  (
    {
      name = '',
      value,
      checked = false,
      onChange,
      onBlur,
      children,
      className,
      disabled = false,
      id,
      title,
      description,
      icon,
      variant = 'simple',
      ...props
    },
    ref,
  ) => {
    const uniqueId = id || `${name}-${value}`;
    const isComplex = variant === 'complex' || icon || title || description;

    return (
      <label
        className={cn(
          'group relative block cursor-pointer',
          !isComplex &&
            'focus-within:ring-primary flex items-start gap-3 rounded-lg border border-transparent p-3 transition-colors focus-within:ring-2 focus-within:ring-offset-2 hover:border-gray-200 hover:bg-gray-50',
          className,
        )}
        htmlFor={uniqueId}
      >
        <input
          ref={ref}
          type="radio"
          id={uniqueId}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={cn(
            isComplex
              ? 'peer sr-only'
              : 'text-primary focus:ring-primary mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-describedby={description ? `${uniqueId}-desc` : `${uniqueId}-description`}
          {...props}
        />
        {isComplex ? (
          <ComplexRadioContent
            uniqueId={uniqueId}
            checked={checked}
            disabled={disabled}
            title={title}
            description={description}
            icon={icon}
          >
            {children}
          </ComplexRadioContent>
        ) : (
          <div id={`${uniqueId}-description`} className="flex-1">
            <Typography variant="small" className={disabled ? 'text-gray-400' : ''}>
              {children}
            </Typography>
          </div>
        )}
      </label>
    );
  },
);

RadioOption.displayName = 'RadioOption';
export default RadioOption;
