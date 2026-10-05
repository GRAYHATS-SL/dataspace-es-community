import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Typography - Text component with configurable element, variant and color.
 *
 * @example
 * <Typography as="h1" variant="hero" color="primary">
 *   Título
 * </Typography>
 */

const typographyVariants = cva('antialiased', {
  variants: {
    variant: {
      hero: 'text-3xl leading-[1.1] font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl',
      'hero-subtitle': 'text-3xl leading-relaxed font-bold',
      title: 'text-2xl font-bold tracking-tight md:text-3xl',
      'section-title': 'text-2xl font-bold',
      subtitle: 'text-sm md:text-base lg:text-lg font-bold',
      'section-subtitle': 'text-lg font-medium',
      'card-title': 'text-xl font-bold',
      body: 'text-sm lg:text-base leading-relaxed',
      'card-description': 'text-base',
      small: 'text-sm',
      caption: 'text-xs font-bold tracking-widest uppercase',
      'metadata-label': 'text-xs font-medium tracking-wide md:uppercase',
      'metadata-value': 'text-sm font-mono font-medium',
      'form-label': 'text-sm font-medium',
      'form-description': 'text-sm text-gray',
      'form-hint': 'text-xs text-gray',
    },
    color: {
      primary: 'text-primary',
      secondary: 'text-secondary',
      muted: 'text-muted',
      white: 'text-white',
      black: 'text-black',
      gray: 'text-gray',
      'gray-light': 'text-gray-light',
      danger: 'text-danger',
      success: 'text-success',
      warning: 'text-warning',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'black',
  },
});

type ElementType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';

export interface TypographyProps
  extends
    Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  as?: ElementType;
  htmlFor?: string;
}

const Typography = React.forwardRef<HTMLElement, Readonly<TypographyProps>>(
  ({ className, as = 'p', variant, color, ...props }, ref) => {
    const Component = as;

    return (
      <Component
        className={cn(typographyVariants({ variant, color }), className)}
        ref={ref as never}
        {...props}
      />
    );
  },
);

Typography.displayName = 'Typography';

export default Typography;
