import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

export interface ConsumoPanelStateProps {
  isLoading: boolean;
  isError: boolean;
  /** Error message to show. */
  errorMessage?: string;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry: () => void;
  skeletonCount?: number;
}

/**
 * ConsumoPanelState - Loading, error and empty states of a usage panel
 *
 * @param {boolean} isLoading - Shows skeletons.
 * @param {boolean} isError - Shows the error with a retry button.
 * @param {string} [errorMessage] - Error message.
 * @param {boolean} isEmpty - Shows the empty state.
 * @param {string} emptyMessage - Empty state text.
 * @param {() => void} onRetry - Retry action.
 * @param {number} [skeletonCount=2] - Number of skeletons while loading.
 */
export default function ConsumoPanelState({
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyMessage,
  onRetry,
  skeletonCount = 2,
}: Readonly<ConsumoPanelStateProps>) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Consultando consumo"
        className="flex flex-col gap-4"
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-gray-100 bg-muted/40"
          />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <Icon name="Inbox" size={40} className="text-gray-200" />
        <Typography variant="small" color="gray">
          {errorMessage ?? 'No se pudo consultar el consumo. Inténtalo de nuevo en unos instantes.'}
        </Typography>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Icon name="Inbox" size={40} className="text-gray-200" />
        <Typography variant="small" color="gray">
          {emptyMessage}
        </Typography>
      </div>
    );
  }
  return null;
}
