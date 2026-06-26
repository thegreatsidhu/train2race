import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
  // Ignore errors from Sentry's own scripts and other non-app noise
  denyUrls: [
    /\/sentry\//i,
    /sentry\.io/i,
  ],
  ignoreErrors: [
    "has no method 'updateFrom'",
    /Object \[object Object\] has no method/,
  ],
});
