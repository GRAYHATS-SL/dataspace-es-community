// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';
const sentryEnabled = process.env.SENTRY_ENABLED;
const isEnabled = !isDev && (sentryEnabled !== undefined ? sentryEnabled === 'true' : isProd);

if (isEnabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    enableLogs: !isProd,
    sendDefaultPii: true,
    // Here you define your business logic (e.g. beforeSend filtering, PII scrubbing, custom tags).
  });
}
