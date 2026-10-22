import Badge from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

/**
 * StatusBadge - Visual indicator of a TMForum lifecycle status
 *
 * @example
 * <StatusBadge status="Launched" />
 */

const STATUS_MAP = new Map([
  ['active', { dot: 'bg-success', text: 'text-success', label: 'Activo' }],
  ['launched', { dot: 'bg-secondary', text: 'text-secondary', label: 'Publicado' }],
  ['in design', { dot: 'bg-gray', text: 'text-gray', label: 'En diseño' }],
  ['in test', { dot: 'bg-warning', text: 'text-warning', label: 'En prueba' }],
  ['retired', { dot: 'bg-warning', text: 'text-warning', label: 'Retirado' }],
  ['obsolete', { dot: 'bg-danger', text: 'text-danger', label: 'Obsoleto' }],
]);

const DEFAULT = { dot: 'bg-gray', text: 'text-gray' };

interface StatusBadgeProps {
  status?: string;
}

export default function StatusBadge({ status }: Readonly<StatusBadgeProps>) {
  const key = (status ?? '').toLowerCase();
  const config = STATUS_MAP.get(key) ?? { ...DEFAULT, label: status ?? '-' };
  return (
    <Badge
      variant="alt"
      size="sm"
      className={cn('gap-1.5 normal-case tracking-normal font-medium', config.text)}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', config.dot)} aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
