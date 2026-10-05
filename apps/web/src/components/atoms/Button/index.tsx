import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Button - Base button with variants and sizes.
 * Extends every native HTMLButtonElement attribute.
 *
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>Confirmar</Button>
 */

const ICON_VARIANTS = ['icon-default', 'icon-secondary', 'icon-warning', 'icon-danger'] as (
  | 'icon-default'
  | 'icon-secondary'
  | 'icon-warning'
  | 'icon-danger'
)[];

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-full font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary hover:bg-primary/90 focus:ring-primary text-white shadow-lg hover:opacity-90',
        secondary:
          'bg-secondary hover:bg-secondary/90 focus:ring-secondary text-white shadow-lg hover:opacity-90',
        danger: 'bg-danger hover:bg-danger/90 focus:ring-danger text-white shadow-sm',
        warning: 'bg-warning hover:bg-warning/90 focus:ring-warning text-white shadow-sm',
        outline:
          'text-primary border-primary hover:bg-primary/10 focus:ring-primary border-2 bg-transparent',
        ghost: 'text-primary hover:bg-primary/10 focus:ring-primary bg-transparent',
        'icon-default':
          'bg-transparent text-gray hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-gray-400 disabled:cursor-default disabled:opacity-30',
        'icon-secondary':
          'bg-transparent text-gray hover:bg-secondary/10 hover:text-secondary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-secondary disabled:cursor-default disabled:opacity-30',
        'icon-warning':
          'bg-transparent text-gray hover:bg-warning/10 hover:text-warning focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-warning disabled:cursor-default disabled:opacity-30',
        'icon-danger':
          'bg-transparent text-gray hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-danger disabled:cursor-default disabled:opacity-30',
      },
      size: {
        xs: 'py-0.5 px-2 text-[11px] sm:py-1 sm:px-2.5 md:py-1 md:px-3 lg:py-1.5 lg:px-3 xl:py-1.5 xl:px-3.5',
        sm: 'py-1 px-2.5 text-xs sm:py-1.5 sm:px-3 md:py-2 md:px-3.5 lg:py-2 lg:px-4 xl:py-2.5 xl:px-4',
        md: 'py-1.5 px-3.5 text-xs sm:py-2 sm:px-4 sm:text-sm md:py-2.5 md:px-5 lg:py-2.5  lg:px-5 xl:py-3 xl:px-6',
        lg: 'py-2.5 px-3 text-xs sm:text-sm sm:py-2.5 sm:px-5 md:py-3 md:px-6 md:text-base lg:py-3 lg:px-7 xl:py-3.5 xl:px-8',
      },
    },
    compoundVariants: [{ variant: ICON_VARIANTS, class: 'h-auto p-1.5' }],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, Readonly<ButtonProps>>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export default Button;
