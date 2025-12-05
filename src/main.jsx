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

// Initialize Sentry error tracking (only if DSN is configured)
initSentry();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
