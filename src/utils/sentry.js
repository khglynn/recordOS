/**
 * ============================================================================
 * SENTRY ERROR TRACKING
 * ============================================================================
 *
 * Captures JavaScript errors and sends them to Sentry for monitoring.
 *
 * SETUP REQUIRED:
 * 1. Create free account at https://sentry.io
 * 2. Create a new React project
 * 3. Copy your DSN and add to .env:
 *    VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
 *
 * The DSN is safe to expose in client-side code.
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * Only runs in production or if DSN is provided
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  // Skip if no DSN configured
  if (!dsn) {
    console.log('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,

    // Only send errors in production
    enabled: import.meta.env.PROD,

    // Environment tag
    environment: import.meta.env.MODE,

    // Performance monitoring: page loads, Web Vitals (LCP, FID, CLS)
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Sample rate for performance monitoring (0-1)
    // Set to 0.1 = 10% of transactions for free tier (10K/month)
    tracesSampleRate: 0.1,

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      /Extension context invalidated/i,
      // Network errors (user's connection)
      /Failed to fetch/i,
      /NetworkError/i,
      /Load failed/i,
      // User cancelled
      /AbortError/i,
      // Spotify SDK errors that are expected
      /The access token expired/i,
    ],

    // Scrub sensitive data
    beforeSend(event) {
      // Remove any tokens from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/access_token=[^&]+/g, 'access_token=REDACTED');
      }
      return event;
    },
  });

  console.log('Sentry initialized');
}

/**
 * Capture an exception manually
 */
export function captureException(error, context = {}) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for error reports
 */
export function setUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.display_name,
      // Don't include email for privacy
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message, category = 'app', level = 'info') {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
  });
}

// Re-export ErrorBoundary for convenience
export { ErrorBoundary } from '@sentry/react';
