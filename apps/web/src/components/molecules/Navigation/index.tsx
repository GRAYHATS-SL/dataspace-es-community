import React from 'react';

import Icon from '@/components/atoms/Icon';
import Link, { isExternalHref } from '@/components/atoms/Link';
import { cn } from '@/lib/utils';

/**
 * Navigation - Reusable list of navigation links (`header` or `footer` variant).
 */

export interface NavItem {
  href: string;
  label: string;
  ariaLabel?: string;
  isActive?: boolean;
}

export interface NavigationProps {
  links: NavItem[];
  variant?: 'footer' | 'header';
  hasHero?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  itemClassName?: string;
  'aria-label'?: string;
}

const Navigation: React.FC<Readonly<NavigationProps>> = ({
  links,
  variant = 'footer',
  hasHero = false,
  orientation = 'vertical',
  className,
  itemClassName,
  'aria-label': ariaLabel,
}) => {
  const getLinkClasses = (link: NavItem) => {
    if (variant === 'footer') {
      return cn(
        'hover:text-primary text-gray-light inline-flex items-center gap-1.5 text-sm transition-colors justify-center lg:justify-start',
        itemClassName,
      );
    }

    const focusClasses = hasHero
      ? 'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:rounded-sm focus-visible:outline-none'
      : 'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:rounded-sm focus-visible:outline-none';

    let stateClass: string;
    if (hasHero) {
      stateClass = link.isActive
        ? 'font-semibold text-white underline decoration-2 underline-offset-8'
        : 'custom_underline text-white hover:text-white';
    } else {
      stateClass = link.isActive
        ? 'font-semibold text-primary underline decoration-2 underline-offset-8'
        : 'custom_underline text-primary hover:text-primary';
    }

    return cn('text-base transition-colors duration-200', focusClasses, stateClass, itemClassName);
  };

  return (
    <nav aria-label={ariaLabel}>
      <ul
        className={cn(
          'flex list-none',
          orientation === 'horizontal'
            ? 'flex-row items-center gap-8'
            : 'flex-col gap-4 md:gap-6 items-center md:items-start',
          className,
        )}
      >
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-label={link.ariaLabel}
              className={getLinkClasses(link)}
              target={isExternalHref(link.href) ? '_blank' : undefined}
              rel={isExternalHref(link.href) ? 'noopener noreferrer' : undefined}
            >
              {link.label}
              {variant === 'footer' && isExternalHref(link.href) && (
                <>
                  <Icon name="ExternalLink" size={13} />
                  <span className="sr-only">(abre en nueva ventana)</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
