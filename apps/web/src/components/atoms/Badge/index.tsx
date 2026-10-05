import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Badge - Static label for tags, categories or metadata.
 *
 * @example
 * <Badge variant="outline" size="sm">CSV</Badge>
 */

const badgeVariants = cva(
  'inline-flex items-center font-bold tracking-widest uppercase rounded-full transition-colors',
  {
    variants: {
      variant: {
        filled: 'bg-primary text-white',
        outline: 'bg-transparent text-primary border border-primary',
        inverted: 'bg-white text-primary',
        glass: [
          'bg-gradient-to-r from-white/20 via-white/10 to-white/10 text-white',
          'backdrop-blur-lg border border-white/20',
        ].join(' '),
        alt: 'bg-muted border border-muted text-gray justify-center',
        count: 'bg-muted text-gray font-medium normal-case tracking-normal',
      },
      size: {
        sm: 'text-2xs px-1.5 md:px-2 py-0.5 md:py-1',
        default: 'text-xs px-2 md:px-3 py-0.5 md:py-1.5',
        lg: 'text-sm px-2 md:px-4 py-1 md:py-2',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, Readonly<BadgeProps>>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span className={cn(badgeVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);

Badge.displayName = 'Badge';

export default Badge;
