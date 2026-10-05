import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

/** Props of `MetadataItem`. */
export interface MetadataItemProps {
  icon?: string;
  label: string;
  value: string;
  className?: string;
}

/** MetadataItem - Metadata entry with optional icon, label and value. */
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
