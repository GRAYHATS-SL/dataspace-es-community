import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

interface MeterProps {
  used: number;
  total: number;
  label: string;
  unit?: string;
  className?: string;
}

/**
 * Meter - Accessible usage bar (used / total) exposed as a `progressbar`.
 */
export default function Meter({ used, total, label, unit, className }: Readonly<MeterProps>) {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const isExhausted = total > 0 && used >= total;
  const unitSuffix = unit ? ` ${unit}` : '';
  const ariaLabel = `${label}: ${used} de ${total}${unitSuffix}`;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="small" color="gray">
          {label}
        </Typography>
        <Typography variant="small" color={isExhausted ? 'danger' : 'gray'}>
          {used.toLocaleString('es-ES')} / {total.toLocaleString('es-ES')}
          {unitSuffix}
        </Typography>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isExhausted ? 'bg-red-500' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
