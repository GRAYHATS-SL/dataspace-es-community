import * as Sentry from '@sentry/nextjs';

import type { UserProfile } from '@/lib/session';

type EventCategory = 'auth' | 'catalog' | 'form' | 'navigation';

/**
 * Associates the current user with Sentry events.
 * Call with null on logout to clear the context.
 */
export function identifySentryUser(profile: UserProfile | null | undefined) {
  if (!profile) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: profile.sub,
  });

  // Here you define your business logic (which user attributes and tags are sent to Sentry).
}

/**
 * Records a UI interaction as a breadcrumb.
 * Breadcrumbs appear in the history preceding any error in Sentry,
 * giving context about what the user did before the failure.
 *
 * @example
 * trackEvent('catalog', 'delete_category', { categoryId })
 */
export function trackEvent(
  category: EventCategory,
  action: string,
  data?: Record<string, unknown>,
) {
  Sentry.addBreadcrumb({
    category,
    message: action,
    data,
    level: 'info',
  });
}

/**
 * Explicitly captures an error with additional context.
 * Use it for known failures you want to record even when they are not
 * unhandled exceptions.
 *
 * @example
 * trackError(err, { categoryId })
 */
export function trackError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
