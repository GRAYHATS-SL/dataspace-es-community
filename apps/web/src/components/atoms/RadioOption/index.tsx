import React from 'react';

import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { RadioOptionProps } from '@/types/radioselector';

import ComplexRadioContent from './ComplexRadioContent';

/**
 * RadioOption - Single radio option, in simple or complex variant
 *
 * @param {string} [name] - Radio group name.
 * @param {string} value - Input value.
 * @param {boolean} [checked=false] - Whether the option is selected.
 * @param {ChangeEventHandler<HTMLInputElement>} [onChange] - Selection callback.
 * @param {FocusEventHandler<HTMLInputElement>} [onBlur] - Blur callback.
 * @param {React.ReactNode} [children] - Content of the simple variant.
 * @param {string} [className] - Additional CSS classes for the label.
 * @param {boolean} [disabled=false] - Disables the option.
 * @param {string} [id] - Input id.
 * @param {string} [title] - Title of the complex variant.
 * @param {string} [description] - Description of the complex variant.
 * @param {ValidIconName} [icon] - Icon of the complex variant.
 * @param {RadioOptionVariant} [variant='simple'] - Forces the variant.
 * @param {Ref<HTMLInputElement>} ref - Ref forwarded to the native `<input>`.
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
