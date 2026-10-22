import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from '@/lib/utils/sentryScrub';

const makeEvent = (overrides: Partial<ErrorEvent>): ErrorEvent => ({ type: undefined, ...overrides });

describe('scrubSentryEvent', () => {
  it('removes cookies, headers and body from the request', () => {
    const event = makeEvent({
      request: { url: 'https://app.test/x', cookies: { a: 'b' }, headers: { h: 'v' }, data: 'd' },
    });
    const result = scrubSentryEvent(event);
    expect(result.request).toEqual({ url: 'https://app.test/x' });
  });

  it('keeps only the user id', () => {
    const event = makeEvent({
      user: { id: 'did:1', email: 'a@b.c', username: 'u', ip_address: '{{auto}}' },
    });
    expect(scrubSentryEvent(event).user).toEqual({ id: 'did:1' });
  });

  it('drops the user when it has no id', () => {
    expect(scrubSentryEvent(makeEvent({ user: { email: 'a@b.c' } })).user).toBeUndefined();
  });

  it('leaves events without request or user untouched', () => {
    expect(scrubSentryEvent(makeEvent({}))).toEqual({ type: undefined });
  });
});
