import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Container - Centered layout wrapper with max-width and optional padding.
 */

const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-3xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-none',
    },
    padding: {
      true: 'px-6 md:px-10 lg:px-16 xl:px-24',
      false: 'px-4 sm:px-6 md:px-10 lg:px-0',
    },
  },
  defaultVariants: {
    size: 'lg',
    padding: false,
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, Readonly<ContainerProps>>(
  ({ className, size, padding, ...props }, ref) => {
    return (
      <div className={cn(containerVariants({ size, padding }), className)} ref={ref} {...props} />
    );
  },
);

Container.displayName = 'Container';

export default Container;
