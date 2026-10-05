import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { ProductStatus } from '@/types/api';

interface StatusConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const STATUS_CONFIG: Record<ProductStatus, StatusConfig> = {
  active: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Activo' },
  created: { dotColor: 'bg-neutral-400', textColor: 'text-neutral-700', label: 'Creado' },
  pendingActive: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Activando' },
  suspended: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Suspendido' },
  pendingTerminate: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Terminando' },
  terminated: { dotColor: 'bg-gray-400', textColor: 'text-gray-600', label: 'Terminado' },
  cancelled: { dotColor: 'bg-red-400', textColor: 'text-red-700', label: 'Cancelado' },
  aborted: { dotColor: 'bg-red-600', textColor: 'text-red-800', label: 'Abortado' },
};

const DEFAULT: StatusConfig = {
  dotColor: 'bg-gray-300',
  textColor: 'text-gray-500',
  label: '—',
};

interface ProductStatusBadgeProps {
  status?: ProductStatus;
}

/**
 * ProductStatusBadge - Visual indicator for a product `status`.
 * Falls back to a neutral state when the status is unknown.
 */
export default function ProductStatusBadge({ status }: Readonly<ProductStatusBadgeProps>) {
  const config = (status ? STATUS_CONFIG[status] : undefined) ?? DEFAULT;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn('size-2 rounded-full', config.dotColor)} aria-hidden="true" />
      <Typography variant="small" className={cn('font-mono font-medium', config.textColor)}>
        {config.label}
      </Typography>
    </div>
  );
}
