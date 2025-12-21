# recordOS: Performance + Monitoring + Album Count Fix

**Created:** 2025-12-11
**Status:** Ready for implementation

---

## Summary

This plan covers three areas:
1. **CPU Performance Bug** - Investigate and fix high CPU usage when app is left open
2. **Album Count Setting** - Verify slider works without rescan (or fix if broken)
3. **Monitoring Setup** - Add Sentry → Slack, PostHog session recording, performance tracking

---

## Issues to Address

### 1. High CPU Usage (300%+ kernel_task)

**Symptoms:** App causes extreme CPU usage when left open for extended periods, even without the visualizer.

**Investigation approach:**
1. Profile the app in Chrome DevTools Performance tab
2. Check for memory leaks (heap snapshots over time)
3. Identify runaway animations or intervals

**Likely culprits (to verify):**

| Suspect | Location | Why |
|---------|----------|-----|
| Fast CSS animation | `Desktop.jsx:346` | `glitchOverlay` at 0.1s infinite during loading |
| Loading animation stuck | `Desktop.jsx:647` | setInterval runs while `isLoading=true` |
| Spotify SDK | `useSpotify.js` | SDK maintains audio context + WebSocket |
| Event listeners | Various | Could accumulate if not cleaned up |
| React re-renders | App.jsx | Excessive state updates causing renders |

### 2. Album Count Setting

**Current behavior:** Slider in Settings controls `displayAlbumCount` state, which slices the albums array at `App.jsx:856`:
```javascript
albums={spotify.albums.slice(0, displayAlbumCount)}
```

**Expected:** Should work immediately without rescanning.

**To verify:** Test if the slider actually updates the grid in real-time.

---

## Investigation Plan

### Step 1: Reproduce and Profile

1. Open the app in Chrome
2. Open DevTools → Performance tab
3. Let it run for 5-10 minutes
4. Check:
   - Memory tab for heap growth
   - Performance tab for long-running tasks
   - Console for repeated errors/warnings

### Step 2: Check for Stuck Loading State

The `isLoading` state controls several expensive animations. If it gets stuck `true`:

```javascript
// Desktop.jsx - these run while loading:
- 4s setInterval (slot rotation)
- glitchOverlay animation (0.1s infinite)
- loadingPulse animation (2s infinite)
- scanLine animation (3s infinite)
```

**Quick fix to try:** Add timeout to force `isLoading=false` after reasonable time.

### Step 3: Add Cleanup Verification

Check these cleanup patterns are working:

| Effect | File:Line | Has Cleanup? |
|--------|-----------|--------------|
| Loading interval | `Desktop.jsx:662` | ✅ `clearInterval` |
| Position polling | `useSpotify.js:716` | ✅ `clearInterval` |
| Local audio intervals | `useLocalAudio.js:94,217,253` | Need to verify |

---

## Fixes to Implement

### Fix 1: Verify Album Count Wiring

**Test first:** Change slider → does grid update?

If not, trace the data flow:
1. `SettingsModal.jsx:222` - slider onChange
2. `App.jsx:967` - `onAlbumCountChange={setDisplayAlbumCount}`
3. `App.jsx:856` - `.slice(0, displayAlbumCount)`

### Fix 2: Add Loading Timeout Safety

**File:** `src/hooks/useSpotify.js`

Add a maximum loading time (e.g., 5 minutes) after which we force complete:

```javascript
// In fetchLibrary:
const loadingTimeout = setTimeout(() => {
  if (isLoading) {
    console.warn('[Safety] Force-completing stuck loading state');
    setIsLoading(false);
  }
}, 300000); // 5 minutes

// Clear on success
return () => clearTimeout(loadingTimeout);
```

### Fix 3: Reduce Animation Intensity

**File:** `src/components/Desktop.jsx`

Change glitchOverlay from 0.1s to something less aggressive:

```css
/* Before */
animation: glitchOverlay 0.1s infinite;

/* After - still glitchy but less CPU-intensive */
animation: glitchOverlay 0.5s steps(4) infinite;
```

### Fix 4: Add Performance Logging

**File:** `src/App.jsx` (temporary debugging)

Add console logs to track re-render frequency:

```javascript
// At top of App component:
const renderCountRef = useRef(0);
renderCountRef.current++;
if (renderCountRef.current % 100 === 0) {
  console.log(`[Perf] App rendered ${renderCountRef.current} times`);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Desktop.jsx` | Reduce animation speed |
| `src/hooks/useSpotify.js` | Add loading timeout, PostHog user identify |
| `src/App.jsx` | Add perf logging (temporary) |
| `src/utils/posthog.js` | **NEW** - PostHog init |
| `src/utils/sentry.js` | Add long task + memory monitoring |
| `src/main.jsx` | Add PostHog init |
| `.env` / Vercel | Add PostHog env vars |

---

## Testing

1. **Before fixes:** Profile current behavior, note metrics
2. **After each fix:** Re-profile, compare metrics
3. **Album count:** Confirm slider updates grid immediately

---

---

## Sentry → Slack Integration

### Connect recordOS errors to #ros-errors

**Using Playwright:**
1. Navigate to https://sentry.io
2. Go to recordOS project → Settings → Integrations → Slack
3. Add alert rule: Send to #ros-errors channel for all error events
4. (If not already connected, invite Sentry app to channel first)

### Disable email notifications

Settings → Alerts → Disable email notifications for recordOS project.

---

## PostHog Setup

### 1. Create PostHog project for recordOS

**Using Playwright:**
1. Navigate to https://us.posthog.com
2. Create new project: "recordOS"
3. Get project API key

### 2. Install and configure

```bash
npm install posthog-js
```

**Env vars (add to `.env` and Vercel):**
```
VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

**Create `src/utils/posthog.js`:**
```javascript
import posthog from 'posthog-js';

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || !import.meta.env.PROD) {
    console.log('PostHog disabled (no key or not production)');
    return;
  }

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
  });
}

export { posthog };
```

**Update `src/main.jsx`:**
```javascript
import { initSentry } from './utils/sentry';
import { initPostHog } from './utils/posthog';

initSentry();
initPostHog();
```

### 3. Identify Spotify user

**In `useSpotify.js` where user is fetched:**
```javascript
import { posthog } from '../utils/posthog';

// After successful user fetch:
if (userData && posthog) {
  posthog.identify(userData.id, {
    spotify_display_name: userData.display_name,
    spotify_product: userData.product, // "premium" or "free"
  });
}
```

### 4. Track key events

```javascript
posthog.capture('album_played', { album_id: album.id, album_name: album.name });
posthog.capture('library_scan_complete', { album_count: albums.length });
posthog.capture('playback_error', { error_code: err.code });
```

---

## Performance Monitoring (Sentry Integration)

Since we can't track actual CPU % from the browser, we track proxies for it:

### Add Long Task Observer

**File:** `src/utils/sentry.js` or `src/main.jsx`

```javascript
// Track main thread blocking (correlates with high CPU)
if ('PerformanceObserver' in window) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 100) { // 100ms+ = janky
        addBreadcrumb('Long task', 'performance', 'warning', {
          duration: `${entry.duration.toFixed(0)}ms`,
        });

        // Report exceptionally long tasks to Sentry
        if (entry.duration > 500) {
          captureMessage('Main thread blocked', {
            level: 'warning',
            extra: { duration: entry.duration },
          });
        }
      }
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}
```

### Add Memory Monitoring (Chrome only)

```javascript
// Check memory every minute, alert if high
if (performance.memory) {
  setInterval(() => {
    const heapMB = performance.memory.usedJSHeapSize / 1048576;
    const limitMB = performance.memory.jsHeapSizeLimit / 1048576;

    if (heapMB > 150) { // 150MB threshold
      captureMessage('High memory usage', {
        level: heapMB > 300 ? 'error' : 'warning',
        extra: { heapMB: heapMB.toFixed(1), limitMB: limitMB.toFixed(1) },
      });
    }
  }, 60000);
}
```

### Add Operation Spans

Track time spent in expensive operations:

```javascript
// In useSpotify.js - fetchLibrary
const transaction = Sentry.startTransaction({ name: 'library-scan' });
const span = transaction.startChild({ op: 'fetch', description: 'Fetch saved tracks' });
// ... do work ...
span.finish();
transaction.finish();
```

---

## Success Criteria

### Performance
- [ ] CPU stays under 100% when idle (after loading complete)
- [ ] No memory growth over 30+ minute sessions
- [ ] Loading state never gets stuck indefinitely

### Settings
- [ ] Album count slider works without rescan

### Monitoring
- [ ] Sentry errors → Slack #ros-errors
- [ ] Sentry email notifications disabled
- [ ] PostHog installed and tracking sessions
- [ ] Long task + memory monitoring active

---

## Implementation Order

1. **Quick fix:** Reduce animation intensity (Desktop.jsx)
2. **Test:** Verify album count slider works
3. **Setup Sentry → Slack** (via Playwright)
4. **Install PostHog** (npm + code)
5. **Add performance monitoring** (long tasks, memory)
6. **Profile and verify** CPU usage improvement
