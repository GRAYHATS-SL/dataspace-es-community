import * as Sentry from '@sentry/nextjs';

import type { UserProfile } from '@/lib/session';

type EventCategory = 'auth' | 'catalog' | 'form' | 'navigation';

/** Associates the current user with Sentry events. */
export function identifySentryUser(profile: UserProfile | null | undefined) {
  if (!profile) {
    Sentry.setUser(null);
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';

  Sentry.setUser({
    id: profile.sub,
    // Email only in dev to ease debugging without exposing PII in prod
    ...(isProd ? {} : { email: profile.email }),
  });

  Sentry.setTag('org.id', profile.organizationId ?? 'unknown');
  Sentry.setTag('org.name', profile.organization);
  Sentry.setTag('user.roles', profile.roles.join(','));
}

/**
 * Records a UI interaction as a breadcrumb.
 *
 * @example
 * trackEvent('catalog', 'delete_category', { categoryId, affectedOfferings: 3 })
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
 * Explicitly captures an error with extra context.
 *
 * @example
 * trackError(err, { categoryId, affectedOfferings })
 */
export function trackError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
