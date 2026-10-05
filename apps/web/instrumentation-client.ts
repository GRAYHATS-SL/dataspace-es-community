// This file is used to initialize Sentry for client-side error tracking and performance monitoring in a Next.js application.
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';
const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
const isEnabled = !isDev && (sentryEnabled !== undefined ? sentryEnabled === 'true' : isProd);

if (isEnabled) {
  Sentry.init({
    // DNS (Data Source Name) is a unique identifier for your Sentry project, used to send data to the correct project in Sentry.
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    // Determines the percentage of user sessions that are recorded for replay. 
    // In production, it's set to 0.1 (10%), while in development, it's set to 0 to avoid unnecessary overhead.
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    // Determines the percentage of sessions that are recorded for replay when an error occurs. 
    // In production, it's set to 1.0 (100%) to capture all error sessions, while in development, it's set to 0 to avoid unnecessary overhead.
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,

    // Includes personally identifiable information (PII) such as user IP addresses and request headers in the data sent to Sentry.
    sendDefaultPii: true,
    // Enables logging of Sentry events to the console, which can be helpful for debugging during development.
    // In production, this is typically set to false to avoid cluttering the console with logs.
    enableLogs: !isProd,

    // Here you define your business logic (e.g. beforeSend filtering, PII scrubbing, custom tags).

    // Integrations allow you to customize how Sentry captures and processes data. 
    // The replayIntegration is used to capture user sessions for replay, and the blockAllMedia option prevents media content from being recorded in the replays, which can help reduce the size of the recorded sessions and protect user privacy.
    integrations: [
      Sentry.replayIntegration({
        // This option prevents all media content (like images and videos) from being recorded in the session replays, which can help reduce the size of the recorded sessions and protect user privacy.
        blockAllMedia: true,
      }),
    ],
  });
}
