import React from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/** Props of `ProductHeader`. */
export interface ProductHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  categories: string[];
  onRequestAccess?: () => void;
  buttonText?: string;
  buttonIcon?: string;
  buttonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

/** ProductHeader - Product header with categories, title, description and an access button. */
const ProductHeader = React.forwardRef<HTMLDivElement, Readonly<ProductHeaderProps>>(
  (
    {
      className,
      title,
      description,
      categories,
      onRequestAccess,
      buttonText = 'Solicitar acceso',
      buttonIcon = 'LockOpen',
      buttonVariant = 'primary',
      ...props
    },
    ref,
  ) => (
    <Card
      variant="default"
      radius="xl"
      className={cn('overflow-hidden', className)}
      ref={ref}
      {...props}
    >
      <div className="flex flex-col items-start gap-8 md:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category} variant="alt" size="sm">
                {category}
              </Badge>
            ))}
          </div>
          <Typography as="h1" variant="title" color="primary">
            {title}
          </Typography>
          <Typography variant="body" color="gray">
            {description}
          </Typography>
        </div>
        {onRequestAccess && (
          <div className="shrink-0">
            <Button variant={buttonVariant} size="md" onClick={onRequestAccess}>
              <Icon name={buttonIcon} size={16} className="mr-2" />
              {buttonText}
            </Button>
          </div>
        )}
      </div>
    </Card>
  ),
);

ProductHeader.displayName = 'ProductHeader';

export default ProductHeader;
