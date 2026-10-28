/**
 * ============================================================================
 * RECORD OS - ENTRY POINT
 * ============================================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initSentry } from './utils/sentry';
import { initAnalytics } from './utils/analytics';

// Initialize Sentry error tracking (only if DSN is configured)
initSentry();

// Count page views on the live site (idle, cookie-free, no query or hash)
initAnalytics();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
