import React from 'react';

import Icon from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

export interface SocialLinksProps {
  className?: string;
}

/**
 * SocialLinks - Social network links.
 */
const SocialLinks: React.FC<Readonly<SocialLinksProps>> = ({ className }) => {
  const socialLinks = [
    {
      name: 'LinkedIn',
      icon: 'Linkedin' as const,
      href: 'https://www.linkedin.com/company/your-company',
    },
  ];

  return (
    <div className={cn('flex gap-6', className)}>
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.href}
          className="hover:text-primary text-gray-light transition-colors"
          aria-label={social.name}
        >
          <Icon name={social.icon} size={18} />
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;
