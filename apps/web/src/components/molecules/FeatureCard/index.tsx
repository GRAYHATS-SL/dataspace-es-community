import React from 'react';

import { Card, CardContent, CardHeader } from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/** FeatureCard - Card highlighting a feature with icon, title and description. */

/** Props of `FeatureCard`. */
export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard: React.FC<Readonly<FeatureCardProps>> = ({
  icon,
  title,
  description,
  className,
}) => {
  return (
    <Card variant="feature" size="lg" radius="2xl" className={cn('', className)}>
      <CardHeader>
        <div className="bg-primary/10 text-primary flex size-10 md:size-12 items-center justify-center rounded-xl">
          <Icon name={icon} className="size-5 md:size-6" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Typography as="h3" variant="subtitle" color="primary">
          {title}
        </Typography>
        <Typography variant="small" color="gray-light">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
