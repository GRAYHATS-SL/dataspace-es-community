import NextLink from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Link - Wrapper around Next.js Link with consistent styles.
 * Prefetch is disabled by default.
 */

export interface LinkProps extends Omit<React.ComponentProps<typeof NextLink>, 'prefetch'> {
  variant?: 'primary' | 'secondary' | 'muted' | 'ghost' | 'unstyled';
  size?: 'sm' | 'md' | 'lg';
  underline?: 'none' | 'hover' | 'always';
  prefetch?: boolean; // Override Next.js default
  external?: boolean; // For external links
  className?: string;
}

export function isExternalHref(href: React.ComponentProps<typeof NextLink>['href']): boolean {
  return (
    typeof href === 'string' &&
    (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:'))
  );
}

const Link = React.forwardRef<HTMLAnchorElement, Readonly<LinkProps>>(
  (
    {
      className,
      variant = 'unstyled',
      size = 'md',
      underline = 'none',
      prefetch = false, // Default to false for better control
      external = false,
      children,
      href,
      ...props
    },
    ref,
  ) => {
    const computedClassName = cn(
      'transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:rounded-sm',
      {
        'text-primary focus-visible:ring-primary': variant === 'primary',
        'text-secondary hover:text-secondary/80 focus-visible:ring-secondary':
          variant === 'secondary',
        'text-gray-600 hover:text-gray-800 focus-visible:ring-gray-500': variant === 'muted',
        'hover:text-primary focus-visible:ring-primary text-gray-500': variant === 'ghost',
        'focus-visible:ring-primary': variant === 'unstyled',
      },
      {
        'text-xs': size === 'sm',
        'text-sm': size === 'md',
        'text-base': size === 'lg',
      },
      {
        'no-underline': underline === 'none',
        custom_underline: underline === 'hover',
        underline: underline === 'always',
      },
      className,
    );

    if (external || isExternalHref(href)) {
      return (
        <a
          href={href as string}
          className={computedClassName}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          ref={ref}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }

    return (
      <NextLink href={href} prefetch={prefetch} className={computedClassName} ref={ref} {...props}>
        {children}
      </NextLink>
    );
  },
);

Link.displayName = 'Link';

export default Link;
