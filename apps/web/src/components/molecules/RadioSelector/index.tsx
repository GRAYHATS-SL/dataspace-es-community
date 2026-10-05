import React from 'react';

import RadioOption from '@/components/atoms/RadioOption';
import { cn } from '@/lib/utils';
import type { RadioSelectorOption, RadioSelectorProps } from '@/types/radioselector';

/** Controlled group of `RadioOption`s; detects the simple/complex variant from the first option. */
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
        {options.map((option: RadioSelectorOption) => (
          <RadioOption
            key={option.value}
            variant={detectedVariant}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled || option.disabled}
            {...('label' in option ? { children: option.label } : {})}
            {...('title' in option ? { title: option.title } : {})}
            {...('description' in option ? { description: option.description } : {})}
            {...('icon' in option ? { icon: option.icon } : {})}
          />
        ))}
      </div>
    );
  },
);

RadioSelector.displayName = 'RadioSelector';

export default RadioSelector;
