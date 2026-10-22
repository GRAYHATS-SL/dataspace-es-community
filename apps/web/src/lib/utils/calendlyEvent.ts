/**
 * @summary Derives the allowed `postMessage` origin of the widget from its embed URL.
 *
 * @param  {string} embedUrl - Configured embed URL.
 * @returns {string | null} Exact origin, or `null` if the URL is missing or invalid.
 */
export function getCalendlyOrigin(embedUrl: string): string | null {
  try {
    const url = new URL(embedUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
}

const EVENT_SCHEDULED = 'calendly.event_scheduled';
const DEFAULT_EVENT_URI = 'scheduled';

interface CalendlyMessage {
  event?: unknown;
  payload?: { event?: { uri?: unknown } };
}

/**
 * @summary Extracts the scheduled event URI from a Calendly `postMessage` message.
 *
 * @param  {Pick<MessageEvent, 'origin' | 'data'>}  message - Message received on `window`.
 * @param  {string | null}  allowedOrigin - Allowed origin; `null` discards all messages.
 * @returns {string | null} Scheduled event URI, or `null` if not a confirmed booking.
 */
export function getCalendlyScheduledEventUri(
  message: Pick<MessageEvent, 'origin' | 'data'>,
  allowedOrigin: string | null,
): string | null {
  if (allowedOrigin === null || message.origin !== allowedOrigin) return null;

  const data = message.data as CalendlyMessage | null | undefined;
  if (data?.event !== EVENT_SCHEDULED) return null;

  const uri = data.payload?.event?.uri;
  return typeof uri === 'string' ? uri : DEFAULT_EVENT_URI;
}
