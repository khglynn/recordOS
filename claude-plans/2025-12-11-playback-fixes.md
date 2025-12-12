# recordOS: Playback Bug Investigation + Tracking Setup

**Created:** 2025-12-11
**Status:** Ready for implementation

---

## Summary

Fix intermittent Spotify playback failures caused by a race condition, and improve error tracking with Sentry breadcrumbs, Slack integration, and PostHog session recording.

---

## Part 1: Playback Bug Fixes

### Root Cause

In `useSpotify.js:601`, `transferPlayback()` is called but **not awaited**:

```javascript
spotifyPlayer.addListener('ready', ({ device_id }) => {
  setDeviceId(device_id);           // React state updated immediately
  transferPlayback(device_id, false); // NOT AWAITED - fire and forget!
});
```

This creates a race condition where:
1. SDK fires `ready` → deviceId is set immediately
2. User clicks play BEFORE device is actually registered with Spotify backend
3. Result: "Device not found" / "Failed to play" errors

Community confirms this is a known Spotify SDK issue.

### Fixes

#### 1.1 Await `transferPlayback()` and add ready state

**File:** `src/hooks/useSpotify.js`

- Add new state: `deviceReady` (separate from `deviceId`)
- Change SDK ready handler to await transfer completion:
  ```javascript
  spotifyPlayer.addListener('ready', async ({ device_id }) => {
    setDeviceId(device_id);
    try {
      await transferPlayback(device_id, false);
      setDeviceReady(true);  // Only now is it safe to play
    } catch (err) {
      console.error('[SDK] Transfer failed:', err);
      // Could retry or show error
    }
  });
  ```
- Update `playTrack()` and `playAlbum()` to check `deviceReady` instead of just `deviceId`

#### 1.2 Add Sentry breadcrumbs for playback flow

**File:** `src/hooks/useSpotify.js`

Add breadcrumbs at key points to trace errors:
- SDK ready event
- Transfer playback started/completed
- Play/pause/skip actions
- Error states

```javascript
import { addBreadcrumb, captureException } from '../utils/sentry';

// In SDK ready handler:
addBreadcrumb('SDK ready', 'spotify', 'info');

// Before transferPlayback:
addBreadcrumb('Transferring playback', 'spotify', 'info');
```

#### 1.3 Disable resync during active sync

**File:** `src/hooks/useSpotify.js` + wherever resync button is

Currently you can trigger a resync while one is already running, causing chaos. Fix:

- The `isLoading` state already tracks active scans
- Disable the resync button when `isLoading === true`
- Optionally: Add visual feedback showing sync in progress

In the LibraryScanner or wherever the resync button lives:
```javascript
<Button
  onClick={() => refreshLibrary(true)}
  disabled={isLoading}
>
  {isLoading ? 'SYNCING...' : 'RESYNC LIBRARY'}
</Button>
```

Also add guard in `fetchLibrary()`:
```javascript
const fetchLibrary = useCallback(async (forceRefresh = false) => {
  if (isLoading) {
    console.log('[fetchLibrary] Already syncing, ignoring request');
    return;
  }
  // ... rest of function
}, [loggedIn, isLoading]);  // Add isLoading to deps
```

#### 1.4 Send playback errors to Sentry (not just UI)

**File:** `src/hooks/useSpotify.js`

Currently errors are only shown in UI. Add Sentry capture:

```javascript
// In catch blocks for playTrack/playAlbum:
captureException(err, {
  context: 'playback',
  albumId: album.id,
  deviceId,
  deviceReady,
});
```

Also capture SDK listener errors:
```javascript
spotifyPlayer.addListener('playback_error', ({ message }) => {
  captureException(new Error(message), { context: 'sdk_playback_error' });
  // ... existing UI error handling
});
```

---

## Part 2: Sentry → Slack Integration

### 2.1 Connect recordOS errors to #ros-errors

**Using Playwright:**
1. Navigate to https://sentry.io
2. Go to recordOS project → Settings → Integrations → Slack
3. Add alert rule: Send to #ros-errors channel for all error events
4. (If not already connected, invite Sentry app to channel first)

### 2.2 Connect eachie errors to #eachie-errors

Same process for eachie project.

### 2.3 Disable Sentry email notifications

Settings → Alerts → Disable email notifications for both projects.

---

## Part 3: PostHog Session Recording

### 3.1 Create PostHog project for recordOS

**Using Playwright:**
1. Navigate to https://us.posthog.com
2. Create new project: "recordOS"
3. Get project API key

### 3.2 Install and configure PostHog

**Package:**
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
    // Session recording
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

### 3.3 Identify Spotify user

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

### 3.4 Track playback events

Add events for key actions:
```javascript
posthog.capture('album_played', { album_id: album.id, album_name: album.name });
posthog.capture('playback_error', { error_code: err.code, device_ready: deviceReady });
```

---

## Part 4: Info Modal Updates

### 4.1 Restructure Content Order

Current order:
1. Logo + Version
2. System Message
3. SYSTEM ADMINISTRATOR (contact)
4. LIBRARIES & CREDITS
5. SYSTEM MAINTENANCE (fund operations)
6. Footer

**New order:**
1. Logo + Version
2. System Message
3. SYSTEM ADMINISTRATOR (contact)
4. **SYSTEM MAINTENANCE (moved up)**
5. LIBRARIES & CREDITS
6. **DATA RETENTION PROTOCOL (new)**
7. Footer

### 4.2 Add Internal Scroll Container

Match TrackListModal's scrollable content approach:
- Wrap content (after Logo) in a `ScrollableContent` styled-component
- **Desktop:** `max-height: 280px` with internal scroll
- **Mobile:** `max-height: none` (full height, modal handles constraints)
- Pass `$isMobile` prop for conditional styling

```javascript
const ScrollableContent = styled.div`
  flex: 1;
  overflow: auto;
  padding-right: 8px; /* Space for scrollbar */
  max-height: ${props => props.$isMobile ? 'none' : '280px'};

  /* Custom scrollbar to match TrackListModal */
  &::-webkit-scrollbar {
    width: 14px;
  }
  &::-webkit-scrollbar-track {
    background: #0d0d0d;
  }
  &::-webkit-scrollbar-thumb {
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
  }
`;
```

Usage:
```jsx
<ScrollableContent $isMobile={isMobile}>
  {/* All fieldsets go here */}
</ScrollableContent>
```

### 4.3 Add Stylized Privacy Notice

New fieldset matching the existing style:

```jsx
<StyledFieldset label="DATA RETENTION PROTOCOL">
  <Description style={{ margin: 0, fontSize: '9px', color: 'rgba(0, 255, 65, 0.6)' }}>
    //SESSION ACTIVITY AND SYSTEM ERRORS MONITORED
    <br />
    //TELEMETRY ROUTED THROUGH EXTERNAL SUBSTRATES
    <br />
    //NO PERSONAL AUDIO DATA TRANSMITTED
    <br />
    //MUSICAL PREFERENCES REMAIN CLASSIFIED
    <br />
    <br />
    //OVERSIGHT: POSTHOG, SENTRY
    <br />
    //INQUIRIES: kevin@kevinhg.com
  </Description>
</StyledFieldset>
```

Keep it deadpan corporate, slightly ominous, self-aware about being a "system."

---

## Part 5: Update KEVIN-TIPS.md

Two tasks:
1. Consolidate duplicate console shortcut tables
2. Add JavaScript concepts section

### 5.1 Consolidate Console Shortcuts

Currently there are two overlapping shortcut tables:
- **Lines 59-64:** "Clearing Long Prompts" section with Ctrl+U, Ctrl+K, Ctrl+W
- **Lines 122-130:** "Line Editing" section with the same shortcuts plus Ctrl+A/E and Option+arrows

**Fix:** Remove the duplicate table from "Clearing Long Prompts" section. Keep the reference to Vim mode for clearing, but point to the "Line Editing" section for standard shortcuts:

```markdown
### Clearing Long Prompts

No single "clear all" shortcut exists. Best options:

**Fastest (Vim mode):** Run `/vim` once, then `Esc` → `ggdG` clears everything.

**Standard shortcuts:** See [Line Editing](#line-editing-warp-terminal-etc) below.
```

### 5.2 Add JavaScript Concepts Section

**Add to `~/DevKev/tools/helper/KEVIN-TIPS.md`:**

```markdown
## JavaScript Concepts

### Async/Await

When you call a function that talks to the internet (API calls, database, etc.), it takes time. JavaScript handles this with "async" functions that return "promises."

- **Without await:** Function starts but code continues immediately (fire-and-forget)
- **With await:** Code pauses until function finishes, then continues

```javascript
// BAD - might cause race condition
setDeviceId(id);
transferPlayback(id);   // Starts but doesn't wait
playMusic();            // Might run before transfer completes!

// GOOD - proper sequencing
setDeviceId(id);
await transferPlayback(id);  // Wait for this to finish
playMusic();                 // Now safe to play
```

### Race Conditions

When two operations run at the same time and the outcome depends on which finishes first.

**Example:** Device registration vs. user clicking play
- If registration finishes first → works
- If user clicks first → "device not found" error
- Which wins? Random based on network speed, timing, etc.

**Fix:** Make sure operations complete in the right order using `await`.
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useSpotify.js` | Await transfer, deviceReady state, resync guard, breadcrumbs, Sentry capture, PostHog events |
| `src/components/LibraryScanner.jsx` | Disable resync button during active sync |
| `src/components/InfoModal.jsx` | Add stylized privacy notice section |
| `src/utils/sentry.js` | (no changes - already has captureException) |
| `src/utils/posthog.js` | **NEW** - PostHog init |
| `src/main.jsx` | Add PostHog init |
| `.env` / Vercel | Add PostHog env vars |
| `~/DevKev/tools/helper/KEVIN-TIPS.md` | Consolidate shortcut tables, add JavaScript concepts |

---

## Testing Plan

1. **Manual Testing:**
   - Open dev tools console
   - Login and wait for "SDK ready" message
   - Confirm "Transfer complete" message appears BEFORE clicking play
   - Click album → should play without errors
   - Check Sentry for breadcrumb trail

2. **Force Error:**
   - In console, manually set deviceReady to false
   - Try to play → should show clear error, not cryptic failure

3. **Verify Tracking:**
   - Trigger a real error (e.g., play unavailable album)
   - Check Sentry for error with breadcrumbs
   - Check Slack #ros-errors for notification
   - Check PostHog for session recording with event

---

## Order of Operations

1. Fix the race condition (most impactful)
2. Add Sentry breadcrumbs and error capture
3. Set up Sentry → Slack via Playwright
4. Install PostHog and configure
5. Add PostHog user identification and events
6. Test everything end-to-end
