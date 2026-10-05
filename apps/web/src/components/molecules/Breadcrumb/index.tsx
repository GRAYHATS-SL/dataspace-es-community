import React from 'react';

import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb - Hierarchical navigation. The last item is the current page.
 */
const Breadcrumb: React.FC<Readonly<BreadcrumbProps>> = ({ items, className }) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('mb-8', className)}>
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {isLast || !item.href ? (
                <span
                  className={cn('font-medium', isLast ? 'text-primary' : 'text-gray-light')}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  variant="ghost"
                  underline="hover"
                  className="text-gray-light"
                >
                  {item.label}
                </Link>
              )}

              {!isLast && (
                <Icon
                  name="ChevronRight"
                  size={16}
                  aria-hidden="true"
                  className="text-gray-light shrink-0"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
