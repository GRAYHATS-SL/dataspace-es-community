import React from 'react';

import RadioOption from '@/components/atoms/RadioOption';
import { cn } from '@/lib/utils';
import type { RadioSelectorOption, RadioSelectorProps } from '@/types/radioselector';

/**
 * RadioSelector - Controlled group of `RadioOption` with automatic variant detection
 *
 * @param {RadioSelectorOption[]} options - Group options.
 * @param {RadioOptionVariant} [variant] - Forces the variant.
 * @param {string} [className] - Additional CSS classes.
 * @param {string} ['aria-label'] - Accessible label of the `radiogroup`.
 * @param {string} ['aria-labelledby'] - Id of the element labelling the `radiogroup`.
 * @param {boolean} [disabled=false] - Disables all options.
 * @param {string} [value] - Selected value.
 * @param {ChangeEventHandler<HTMLInputElement>} [onChange] - Change callback.
 * @param {FocusEventHandler<HTMLInputElement>} [onBlur] - Blur callback.
 * @param {string} [name] - Common input group name.
 * @param {Ref<HTMLDivElement>} ref - Ref forwarded to the container.
 */
const RadioSelector = React.forwardRef<HTMLDivElement, Readonly<RadioSelectorProps>>(
  (
    {
      options,
      variant,
      className,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      disabled = false,
      value,
      onChange,
      onBlur,
      name,
    },
    ref,
  ) => {
    const detectedVariant = React.useMemo(() => {
      if (variant) return variant;
      if (!options || options.length === 0) return 'simple';
      const firstOption = options[0];
      return 'title' in firstOption || 'icon' in firstOption || 'description' in firstOption
        ? 'complex'
        : 'simple';
    }, [variant, options]);

    return (
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn('space-y-3', detectedVariant === 'complex' && 'space-y-4', className)}
      >
        {options.map((option: RadioSelectorOption) => {
          const isChecked = value === option.value;
          return (
            <RadioOption
              key={option.value}
              variant={detectedVariant}
              name={name}
              value={option.value}
              checked={isChecked}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled || option.disabled}
              {...('label' in option ? { children: option.label } : {})}
              {...('title' in option ? { title: option.title } : {})}
              {...('description' in option ? { description: option.description } : {})}
              {...('icon' in option ? { icon: option.icon } : {})}
            />
          );
        })}
      </div>
    );
  },
);

RadioSelector.displayName = 'RadioSelector';
export default RadioSelector;
