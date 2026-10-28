/**
 * ============================================================================
 * VERCEL WEB ANALYTICS (PAGE VIEWS ONLY)
 * ============================================================================
 *
 * Counts visits with Vercel's cookie-free analytics. No cookies, and Vercel
 * keeps no IP address with a visit. No custom events: page views only.
 *
 * SETUP REQUIRED:
 * Turn on Web Analytics for the record-os project in the Vercel dashboard
 * (Project > Analytics > Enable), then deploy. Until then no visits are
 * counted.
 *
 * Three guards:
 * 1. Only on the live sites (kevinhg.com and its subdomains, *.vercel.app),
 *    so `npm run dev`, `vite preview` and screenshots never load it or hit a
 *    404 for /_vercel/insights/script.js.
 * 2. Only once the browser is idle, so it never competes with first paint.
 * 3. Every URL loses its query string and hash before it is sent. Spotify
 *    sign-in lands on /?code=...&state=..., and none of that leaves the browser.
 */

const LIVE_HOST = /(^|\.)kevinhg\.com$|\.vercel\.app$/;

/** Drop the query string and hash from an event URL */
function stripUrl(event) {
  return { ...event, url: event.url.split(/[?#]/)[0] };
}

/**
 * Load Vercel Web Analytics once the page is idle, on live hosts only
 */
export function initAnalytics() {
  if (!LIVE_HOST.test(window.location.hostname)) return;

  const load = () =>
    import('@vercel/analytics')
      .then(({ inject }) => inject({ beforeSend: stripUrl }))
      .catch(() => {
        // Analytics is optional; a failed load never affects the app
      });

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 5000 });
  } else {
    setTimeout(load, 2000);
  }
}
