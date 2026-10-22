import Badge from '@/components/atoms/Badge';
import Card from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import QuotaStatusBadge from '@/components/atoms/QuotaStatusBadge';
import Typography from '@/components/atoms/Typography';
import QuotaMetricRow from '@/components/molecules/QuotaMetricRow';
import { formatBytes, type QuotaView } from '@/lib/utils/quota';
import { getQuotaNote } from '@/lib/utils/quotaNotes';

export interface QuotaEntryCardProps {
  title: string;
  /** Counterparty (provider or consumer). */
  party: string;
  /** Additional detail. */
  detail?: string;
  /** Computed quota; absent if the query failed. */
  view?: QuotaView;
  /** Error of this entry's query. */
  error?: string;
  /** All of the offering's orders are cancelled. */
  cancelledOnly?: boolean;
}

/**
 * QuotaEntryCard - Consumption card for a metered offering
 *
 * @param {string} title - Offering name.
 * @param {string} party - Counterparty name.
 * @param {string} [detail] - Secondary text.
 * @param {QuotaView} [view] - Computed quota.
 * @param {string} [error] - Entry error.
 * @param {boolean} [cancelledOnly=false] - All orders cancelled.
 */
export default function QuotaEntryCard({
  title,
  party,
  detail,
  view,
  error,
  cancelledOnly = false,
}: Readonly<QuotaEntryCardProps>) {
  const note = view ? getQuotaNote(view, cancelledOnly) : null;
  return (
    <Card radius="xl" className="flex flex-col gap-4 md:flex-row md:gap-8">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-muted md:size-16">
        <Icon name="Gauge" className="size-6 text-gray-400 md:size-8" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="alt">{party}</Badge>
          {view && <QuotaStatusBadge status={view.status} cancelledOnly={cancelledOnly} />}
        </div>
        <Typography as="h3" variant="card-title" color="primary" className="mb-1 line-clamp-2">
          {title}
        </Typography>
        {detail && (
          <Typography variant="small" color="gray">
            {detail}
          </Typography>
        )}
        {error && (
          <Typography variant="small" color="danger" className="mt-4" role="alert">
            {error}
          </Typography>
        )}
        {view && (
          <div className="mt-4 flex flex-col gap-4 border-t border-muted pt-4">
            <QuotaMetricRow label="Bytes" metric={view.bytes} format={formatBytes} />
            <QuotaMetricRow label="Peticiones" metric={view.requests} format={String} />
            {note && (
              <Typography variant="small" color="gray" role="status">
                {note}
              </Typography>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
