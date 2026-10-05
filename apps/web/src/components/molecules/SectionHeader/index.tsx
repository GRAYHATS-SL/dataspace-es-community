import React from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  additionalContent?: React.ReactNode;
  className?: string;
}

/**
 * SectionHeader - Reusable section heading with optional subtitle and extra content.
 */
const SectionHeader: React.FC<Readonly<SectionHeaderProps>> = ({
  title,
  subtitle,
  additionalContent,
  className,
}) => {
  return (
    <Container className={className}>
      <Typography as="h1" variant="title" color="primary" className="mb-3 tracking-tight">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="subtitle" color="gray" className="max-w-2xl font-normal">
          {subtitle}
        </Typography>
      )}
      {additionalContent && <div className="mt-4">{additionalContent}</div>}
    </Container>
  );
};

export default SectionHeader;
