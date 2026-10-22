import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/**
 * MetadataItem - Single metadata entry with icon, label and value
 *
 * @example
 * <MetadataItem
 *   icon="Calendar"
 *   label="Fecha de creación"
 *   value="2024-01-15"
 * />
 */

export interface MetadataItemProps {
  icon?: string;
  label: string;
  value: string;
  className?: string;
}

export default function MetadataItem({
  icon,
  label,
  value,
  className,
}: Readonly<MetadataItemProps>) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={16} className="text-gray-light" />}
        <Typography variant="metadata-label" color="gray-light">
          {label}
        </Typography>
      </div>
      <Typography variant="metadata-value" color="black">
        {value}
      </Typography>
    </div>
  );
}
