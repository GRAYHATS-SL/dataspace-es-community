import Meter from '@/components/atoms/Meter';
import Typography from '@/components/atoms/Typography';
import type { QuotaMetric } from '@/lib/utils/quota';

export interface QuotaMetricRowProps {
  label: string;
  metric: QuotaMetric;
  format: (n: number) => string;
}

/**
 * QuotaMetricRow - Row of a quota metric (bytes or requests)
 *
 * @param {string} label - Metric name.
 * @param {QuotaMetric} metric - Computed metric.
 * @param {(n: number) => string} format - Value formatter.
 */
export default function QuotaMetricRow({ label, metric, format }: Readonly<QuotaMetricRowProps>) {
  if (!metric.limited) {
    return (
      <Typography variant="small" color="gray">
        {label}: sin límite (consumido {format(metric.consumed)})
      </Typography>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <Meter used={metric.consumed} total={metric.cap} label={label} />
      <Typography variant="small" color="gray">
        {format(metric.consumed)} de {format(metric.cap)}
        {metric.exceeded && ' (la última respuesta superó el límite)'}
      </Typography>
    </div>
  );
}
