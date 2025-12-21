# Technical Debt Audit

**Created:** 2025-12-21
**Status:** Ready for review

This document catalogs architectural issues, dead code, and inconsistencies across the recordOS codebase. Use this to prioritize cleanup work vs. patching symptoms.

---

## Executive Summary

| Category | Items | Impact |
|----------|-------|--------|
| Window Pattern Violations | 5 components | ~600 lines duplicated code |
| Dead Code | 3 items | Confusion + bundle size |
| Debug Console.logs | 78 statements | Console noise in prod |
| Design Flaws | 2 items | 403 spam, silent failures |

---

## 1. Window Component Inconsistencies

**The Problem:** recordOS has a `WindowFrame` component that standardizes window styling (header, buttons, dragging, mobile positioning). But only 5 of 10 window components use it. The other 5 duplicate ~120 lines of styled-components each.

### Uses WindowFrame (Good)

| Component | Notes |
|-----------|-------|
| `TrackListModal.jsx` | Clean example |
| `SettingsModal.jsx` | Clean example |
| `InfoModal.jsx` | Cleanest example - copy this pattern |
| `ErrorModal.jsx` | New (2025-12-21) |
| `AccessRequestWindow.jsx` | Recently refactored |

### Duplicates Window Styles (Bad)

| Component | Duplicated Lines | Notes |
|-----------|------------------|-------|
| `MediaPlayer.jsx` | ~100 lines | StyledWindow, StyledWindowHeader, StyledWindowContent, HeaderButton, HeaderButtons |
| `GameWindow.jsx` | ~100 lines | Same + mobile variants |
| `TrippyGraphics.jsx` | ~100 lines | Same |
| `LibraryScanner.jsx` | ~100 lines | Same |
| `LoginModal.jsx` | ~80 lines | Same |

### Why This Matters

1. **Inconsistent behavior** - Mobile positioning differs between components
2. **Bug multiplication** - Fix one, forget the other 4
3. **Maintenance burden** - 600 lines that could be 0
4. **Onboarding friction** - Which pattern is "right"?

### Fix Strategy

**Option A: Full Refactor (~2-3 hours)**
- Extend WindowFrame to support all variants (game fullscreen, player dock, etc.)
- Migrate each component one at a time
- Test each on mobile + desktop

**Option B: Document + Freeze (~30 min)**
- Mark legacy components as "do not copy"
- All new windows use WindowFrame
- Accept the debt but stop it from growing

---

## 2. Dead Code

### Unused Constants (`src/utils/constants.js`)

| Constant | Lines | Reason Dead |
|----------|-------|-------------|
| `GAME_URLS` | 139-143 | Actual URLs in `GameWindow.jsx` GAME_CONFIG |
| `VISUALIZER_PRESETS` | 150-156 | Never imported anywhere |

**Fix:** Delete these blocks (~15 lines total)

### Unused Package Dependency

| Package | In package.json | Imported? |
|---------|-----------------|-----------|
| `@neondatabase/serverless` | Line 14 | Never |

**Fix:** `npm uninstall @neondatabase/serverless`

---

## 3. Debug Console.log Statements

**Total:** 78 statements across 9 files

### By File

| File | Count | Notes |
|------|-------|-------|
| `useSpotify.js` | 61 | Majority are `[Safari Debug]` or `[Library]` prefixed |
| `spotify.js` | 6 | API logging (some useful) |
| `useLocalAudio.js` | 4 | |
| `sentry.js` | 2 | Init messages |
| `useButterchurn.js` | 1 | Error |
| `PixelIcon.jsx` | 1 | Warn on missing icon |
| `LoginModal.jsx` | 1 | Error |
| `ErrorBoundary.jsx` | 1 | Error (keep) |
| `AccessRequestWindow.jsx` | 1 | Error |

### Fix Strategy

**Phase 1: Remove Debug Tags (~30 min)**
- Remove all `[Safari Debug]` prefixed logs (these were for specific debugging)
- Keep `[Library]` and `[SDK]` logs but behind a debug flag

**Phase 2: Add Debug Mode**
```javascript
const DEBUG = import.meta.env.DEV || localStorage.getItem('debug') === 'true';
const log = (...args) => DEBUG && console.log(...args);
```

---

## 4. Design Flaws

### 4.1 Audio Analysis API (403 Spam)

**Location:** `useSpotify.js:739`

```javascript
getAudioAnalysis(track.id).then(setAudioAnalysis).catch(() => {});
```

**The Problem:**
- Spotify's `/audio-analysis/{track_id}` endpoint returns 403 for most tracks
- This code calls it on EVERY track change
- Empty catch silences the error but console still shows 403
- `audioAnalysis` state is set but never used (dead code path)

**Impact:** Console spam, unnecessary API calls, wasted rate limit budget

**Fix Options:**
1. **Remove entirely** - The visualizer uses microphone, not Spotify API
2. **Feature flag** - Only call if premium + audioAnalysis feature enabled
3. **Fail-once** - Track failed track IDs, don't retry

### 4.2 Sentry Over-Broad Ignores

**Location:** `src/utils/sentry.js:49`

```javascript
ignoreErrors: [
  /Failed to fetch/i,  // TOO BROAD - masks real API failures
  ...
]
```

**The Problem:**
- "Failed to fetch" could be user's network OR our API bug
- Real API failures might never reach Sentry

**Fix:** Be more specific:
```javascript
ignoreErrors: [
  /Failed to fetch chrome-extension/i,
  /Failed to fetch moz-extension/i,
  // Keep user network errors, filter extensions only
]
```

---

## 5. Prioritized Action Plan

### Quick Wins (< 1 hour total)

| Task | Time | Impact |
|------|------|--------|
| Delete GAME_URLS, VISUALIZER_PRESETS | 5 min | Clean code |
| Uninstall @neondatabase/serverless | 2 min | Smaller bundle |
| Remove [Safari Debug] logs | 20 min | Clean console |
| Fix/remove audio analysis call | 15 min | No more 403 spam |
| Fix Sentry ignoreErrors | 5 min | Better error visibility |

### Medium Effort (1-3 hours)

| Task | Time | Impact |
|------|------|--------|
| Create DEBUG mode for remaining logs | 1 hr | Dev vs prod clarity |
| Document window component rules | 30 min | Prevent more drift |

### Structural (3+ hours)

| Task | Time | Impact |
|------|------|--------|
| Migrate all windows to WindowFrame | 3-4 hr | ~600 lines removed, consistent UX |

---

## 6. Window Component Migration Guide

For each legacy component, the migration looks like:

### Before (MediaPlayer.jsx pattern)
```jsx
import { Window, WindowHeader, WindowContent, Button } from 'react95';

const StyledWindow = styled(Window)`/* 30 lines */`;
const StyledWindowHeader = styled(WindowHeader)`/* 40 lines */`;
const StyledWindowContent = styled(WindowContent)`/* 15 lines */`;
const HeaderButton = styled(Button)`/* 15 lines */`;
// ... etc
```

### After (InfoModal.jsx pattern)
```jsx
import WindowFrame from './WindowFrame';

<WindowFrame
  title="Media Player"
  icon="music"
  isActive={isActive}
  zIndex={zIndex}
  position={position}
  width={320}
  isMobile={isMobile}
  showMinimize={true}
  onClose={onClose}
  onMinimize={onMinimize}
  onFocus={onFocus}
  onDragStart={onDragStart}
>
  {/* Just the content */}
</WindowFrame>
```

**Considerations for WindowFrame extension:**
- MediaPlayer: Mobile docking to bottom (not centered)
- GameWindow: Full-screen mode for Solitaire
- TrippyGraphics: Resizable (future)

---

## 7. Files to Touch

| Priority | File | Changes |
|----------|------|---------|
| P0 | `constants.js` | Delete GAME_URLS, VISUALIZER_PRESETS |
| P0 | `package.json` | Remove @neondatabase/serverless |
| P0 | `useSpotify.js` | Remove/fix audio analysis call, remove debug logs |
| P1 | `sentry.js` | Refine ignoreErrors |
| P2 | Multiple | Add DEBUG mode |
| P3 | 5 components | Migrate to WindowFrame |

---

## Next Steps

1. Review this document with Kevin
2. Decide: Quick Wins now, or Full Cleanup sprint?
3. If doing cleanup: Create branch `cleanup/technical-debt`
4. Execute in order (P0 → P1 → P2 → P3)
