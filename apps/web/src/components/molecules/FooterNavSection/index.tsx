import React from 'react';

import Typography from '@/components/atoms/Typography';
import Navigation, { type NavItem } from '@/components/molecules/Navigation';
import { cn } from '@/lib/utils';

/**
 * FooterNavSection - Titled navigation block for the footer.
 */

export type FooterNavLink = NavItem;

export interface FooterNavSectionProps {
  title: string;
  links: FooterNavLink[];
  className?: string;
}

const FooterNavSection: React.FC<Readonly<FooterNavSectionProps>> = ({
  title,
  links,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-4 md:gap-6 items-center md:items-start', className)}>
      <Typography as="p" variant="caption" color="primary">
        {title}
      </Typography>

      <Navigation links={links} variant="footer" orientation="vertical" aria-label={title} />
    </div>
  );
};

export default FooterNavSection;
