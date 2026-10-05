import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';
const sentryEnabled = process.env.SENTRY_ENABLED;
const isEnabled = !isDev && (sentryEnabled !== undefined ? sentryEnabled === 'true' : process.env.NODE_ENV === 'production');

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// No-op in dev: prevents Next.js from sending server errors to Sentry
// even though the SDK is imported
export const onRequestError = isEnabled ? Sentry.captureRequestError : () => { };
