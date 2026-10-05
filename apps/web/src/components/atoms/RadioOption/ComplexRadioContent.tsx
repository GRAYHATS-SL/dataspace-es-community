import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { RadioOptionProps } from '@/types/radioselector';

export interface ComplexRadioContentProps {
  uniqueId: string;
  checked: boolean;
  disabled: boolean;
  title?: string;
  description?: string;
  icon?: RadioOptionProps['icon'];
  children?: React.ReactNode;
}

/**
 * ComplexRadioContent - Card content (icon, title, description) for a complex `RadioOption`.
 */
function ComplexRadioContent({
  uniqueId,
  checked,
  disabled,
  title,
  description,
  icon,
  children,
}: Readonly<ComplexRadioContentProps>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border-2 p-6 transition-all duration-200',
        'border-muted hover:border-primary',
        'peer-checked:border-primary peer-checked:bg-primary/5',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="flex items-center gap-6">
        {icon && (
          <Icon
            name={icon}
            className={cn(
              'text-gray text-4xl transition-colors',
              'group-hover:text-primary',
              checked && 'text-primary',
              disabled && 'text-gray-400',
            )}
          />
        )}
        <div>
          {title && (
            <Typography
              as="h3"
              variant="subtitle"
              className={cn('tracking-wide', disabled && 'text-gray-400')}
            >
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="small" color="gray" id={`${uniqueId}-desc`}>
              {description}
            </Typography>
          )}
          {children}
        </div>
      </div>
      <Icon
        name="CheckCircle"
        className={cn(
          'text-3xl transition-opacity',
          checked ? 'text-primary opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}

export default ComplexRadioContent;
