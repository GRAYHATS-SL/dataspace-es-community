import Icon from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  loading?: boolean;
  trend?: { label: string; positive: boolean };
  estimated?: boolean;
  className?: string;
}

/**
 * MetricCard - Metric card with icon, value, label and optional trend
 *
 * @param {string} icon - Lucide icon name.
 * @param {string} label - Metric label.
 * @param {string|number} value - Main value.
 * @param {boolean} [loading=false] - Shows a skeleton.
 * @param {{label: string, positive: boolean}} [trend] - Trend indicator.
 * @param {boolean} [estimated=false] - Adds an "est." label.
 * @param {string} [className] - Additional CSS classes.
 */
export default function MetricCard({
  icon,
  label,
  value,
  loading = false,
  trend,
  estimated = false,
  className,
}: Readonly<MetricCardProps>) {
  if (loading) {
    return (
      <div
        className={cn(
          'flex flex-col gap-4 rounded-2xl border border-gray-lightest bg-white p-5',
          className,
        )}
        aria-busy="true"
        aria-label="Cargando métrica"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-8 animate-pulse rounded bg-muted" />
        </div>
        <div>
          <div className="mb-2 h-7 w-12 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-gray-lightest bg-white p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Icon name={icon} size={16} className="text-gray-light" />
        {trend && (
          <span
            className={cn('text-xs font-medium', trend.positive ? 'text-success' : 'text-danger')}
          >
            {trend.label}
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight text-primary">
          {value}
          {estimated && <span className="ml-1.5 text-xs font-normal text-gray-light">est.</span>}
        </p>
        <p className="mt-1 text-sm text-gray">{label}</p>
      </div>
    </div>
  );
}
