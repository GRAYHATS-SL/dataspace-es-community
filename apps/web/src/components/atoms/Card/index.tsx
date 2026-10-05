import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card - Base container with variants, sizes and radius options.
 *
 * @example
 * <Card variant="elevated" size="md" radius="lg" hover>
 *   <CardHeader>Título</CardHeader>
 *   <CardContent>Contenido</CardContent>
 * </Card>
 */

const cardVariants = cva('overflow-hidden transition-all duration-200', {
  variants: {
    variant: {
      default: 'bg-white border border-gray-100 shadow-xs',
      elevated: 'bg-white border border-gray-100 shadow-sm',
      outlined: 'bg-white border border-gray-200',
      ghost: 'bg-transparent border border-transparent',
      interactive:
        'bg-white border border-gray-100 shadow-xs hover:shadow-sm hover:bg-muted/20 cursor-pointer',
      feature: 'bg-white border border-gray-lightest shadow-xs flex flex-col gap-6',
    },
    size: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    },
    radius: {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
    },
    hover: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    {
      hover: true,
      variant: ['default', 'elevated', 'outlined', 'ghost', 'feature'],
      class: 'hover:shadow-lg',
    },
  ],
  defaultVariants: {
    variant: 'default',
    size: 'md',
    radius: 'xl',
    hover: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, Readonly<CardProps>>(
  ({ className, variant, size, radius, hover, ...props }, ref) => {
    return (
      <div
        className={cn(cardVariants({ variant, size, radius, hover }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

// Card Header subcomponent
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const CardHeader = React.forwardRef<HTMLDivElement, Readonly<CardHeaderProps>>(
  ({ className, ...props }, ref) => {
    return <div className={cn('flex flex-col space-y-1.5', className)} ref={ref} {...props} />;
  },
);

CardHeader.displayName = 'CardHeader';

// Card Content subcomponent
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

const CardContent = React.forwardRef<HTMLDivElement, Readonly<CardContentProps>>(
  ({ className, ...props }, ref) => {
    return <div className={cn('flex-1', className)} ref={ref} {...props} />;
  },
);

CardContent.displayName = 'CardContent';

// Card Footer subcomponent
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const CardFooter = React.forwardRef<HTMLDivElement, Readonly<CardFooterProps>>(
  ({ className, ...props }, ref) => {
    return <div className={cn('flex items-center pt-4', className)} ref={ref} {...props} />;
  },
);

CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardFooter, CardHeader };
export default Card;
