import Badge from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

interface StatusStyle {
  dot: string;
  text: string;
  label: string;
}

const STATUS_MAP = new Map<string, StatusStyle>([
  ['in study', { dot: 'bg-gray', text: 'text-gray', label: 'En estudio' }],
  ['in design', { dot: 'bg-gray', text: 'text-gray', label: 'En diseño' }],
  ['in test', { dot: 'bg-warning', text: 'text-warning', label: 'En prueba' }],
  ['active', { dot: 'bg-success', text: 'text-success', label: 'Activo' }],
  ['launched', { dot: 'bg-secondary', text: 'text-secondary', label: 'Publicado' }],
  ['retired', { dot: 'bg-warning', text: 'text-warning', label: 'Retirado' }],
  ['obsolete', { dot: 'bg-danger', text: 'text-danger', label: 'Obsoleto' }],
  ['rejected', { dot: 'bg-danger', text: 'text-danger', label: 'Rechazado' }],
]);

interface StatusBadgeProps {
  status?: string;
}

/**
 * StatusBadge - TM Forum lifecycle status indicator (colored dot + label).
 *
 * @example
 * <StatusBadge status="Launched" />
 */
export default function StatusBadge({ status }: Readonly<StatusBadgeProps>) {
  const config = STATUS_MAP.get((status ?? '').toLowerCase()) ?? {
    dot: 'bg-gray',
    text: 'text-gray',
    label: status ?? '-',
  };
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
