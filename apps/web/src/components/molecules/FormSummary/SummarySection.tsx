import Button from '@/components/atoms/Button';
import { Card, CardContent, CardHeader } from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { SummarySectionProps } from '@/types/summary';

/** Summary card with a title, an icon and an edit button. */
export function SummarySection({
  title,
  icon,
  onEdit,
  children,
  className,
  editButtonText = 'Editar',
  editButtonIcon = 'Edit',
}: Readonly<SummarySectionProps>) {
  return (
    <Card variant="default" size="md" radius="lg" className={cn('flex flex-col gap-4', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name={icon} size={20} className="text-primary" />
          <Typography variant="caption" color="gray" className="font-bold">
            {title}
          </Typography>
        </div>
        <Button type="button" variant="primary" onClick={onEdit} size="sm">
          <Icon name={editButtonIcon} size={14} className="mr-2" />
          <Typography variant="small" className="font-semibold" color="white">
            {editButtonText}
          </Typography>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
