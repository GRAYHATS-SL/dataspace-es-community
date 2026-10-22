import { describe, expect, it } from 'vitest';

import { getCalendlyOrigin, getCalendlyScheduledEventUri } from '@/lib/utils/calendlyEvent';

const ORIGIN = 'https://calendly.com';

const scheduled = (uri?: unknown) => ({
  event: 'calendly.event_scheduled',
  payload: { event: { uri } },
});

describe('getCalendlyOrigin', () => {
  it('returns the exact origin of the configured embed URL', () => {
    expect(getCalendlyOrigin('https://calendly.com/acme/intro?hide_gdpr_banner=1')).toBe(ORIGIN);
  });

  it('returns null for empty, malformed or non-http(s) URLs', () => {
    expect(getCalendlyOrigin('')).toBeNull();
    expect(getCalendlyOrigin('not a url')).toBeNull();
    expect(getCalendlyOrigin('javascript:alert(1)')).toBeNull();
  });
});

describe('getCalendlyScheduledEventUri', () => {
  it('returns the event URI for a scheduled event from the allowed origin', () => {
    const uri = 'https://api.calendly.com/scheduled_events/ABC';
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: scheduled(uri) }, ORIGIN)).toBe(
      uri,
    );
  });

  it('falls back to "scheduled" when the URI is missing or not a string', () => {
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: scheduled() }, ORIGIN)).toBe(
      'scheduled',
    );
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: scheduled(42) }, ORIGIN)).toBe(
      'scheduled',
    );
    expect(
      getCalendlyScheduledEventUri(
        { origin: ORIGIN, data: { event: 'calendly.event_scheduled' } },
        ORIGIN,
      ),
    ).toBe('scheduled');
  });

  it('ignores messages from any other origin, including prefix lookalikes', () => {
    for (const origin of ['https://evil.example', 'https://calendly.com.evil.example', '']) {
      expect(getCalendlyScheduledEventUri({ origin, data: scheduled('x') }, ORIGIN)).toBeNull();
    }
  });

  it('ignores every message when no origin is configured', () => {
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: scheduled('x') }, null)).toBeNull();
  });

  it('ignores other Calendly events and malformed data', () => {
    expect(
      getCalendlyScheduledEventUri(
        { origin: ORIGIN, data: { event: 'calendly.page_height' } },
        ORIGIN,
      ),
    ).toBeNull();
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: null }, ORIGIN)).toBeNull();
    expect(getCalendlyScheduledEventUri({ origin: ORIGIN, data: 'texto' }, ORIGIN)).toBeNull();
  });
});
