import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { QuotaStatus } from '@/lib/utils/quota';

export interface QuotaStatusBadgeProps {
  status: QuotaStatus;
  /** All offering orders are cancelled; takes precedence over the quota status. */
  cancelledOnly?: boolean;
}

interface StatusConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const STATUS_CONFIG: Readonly<Record<QuotaStatus | 'cancelled', StatusConfig>> = {
  active: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Activa' },
  unlimited: { dotColor: 'bg-blue-500', textColor: 'text-blue-700', label: 'Sin límite' },
  exhausted: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Agotada' },
  'not-activated': { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Sin activar' },
  cancelled: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Pedido cancelado' },
};

/**
 * QuotaStatusBadge - Quota status with a colored dot and text
 *
 * @param {QuotaStatus} status - Computed quota status.
 * @param {boolean} [cancelledOnly=false] - Shows "cancelled order" instead of the status.
 */
export default function QuotaStatusBadge({
  status,
  cancelledOnly = false,
}: Readonly<QuotaStatusBadgeProps>) {
  const config = STATUS_CONFIG[cancelledOnly ? 'cancelled' : status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', config.dotColor)} aria-hidden="true" />
      <Typography as="span" variant="small" className={cn('font-medium', config.textColor)}>
        {config.label}
      </Typography>
    </span>
  );
}
