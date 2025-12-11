# Post-Auth Modal Consolidation Plan

## Summary

Consolidate 3 separate post-auth windows into ONE unified "Library Scanner" modal with two states: **Scanning** and **Scan Complete**.

**Current:** LoginModal (config) → LoadingWindow → LoadedModal (3 windows!)
**Target:** LoginModal (pre-auth only) → LibraryScanner (scanning ↔ complete)

---

## Target UI

### Scanning State
```
┌─────────────────────────────────────────┐
│ 📊 SCANNING LIBRARY            _ □ ×   │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐      │
│  │   1,234     │  │     47      │      │
│  │   tracks    │  │   albums    │      │
│  └─────────────┘  └─────────────┘      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │████████████░░░░░░░░░░░  45%    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  > Select a decade to view top albums  │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 60s  │ │ 70s  │ │ 80s  │ ← enable  │
│  └──────┘ └──────┘ └──────┘   as done │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 90s  │ │ 00s  │ │ 10s  │           │
│  └──────┘ └──────┘ └──────┘           │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ 20s  │ │ 50s  │ │ OLD  │           │
│  └──────┘ └──────┘ └──────┘           │
│           ┌──────────────┐             │
│           │     ALL      │             │
│           └──────────────┘             │
└─────────────────────────────────────────┘
```

### Scan Complete State
- Title: "✓ SCAN COMPLETE"
- Progress bar replaced by: "DOMINANT ERA: 90s"
- ALL button highlighted green
- All decade buttons enabled

---

## Behavior

| Action | Result |
|--------|--------|
| Click decade button | Filter + minimize ALL windows (scanner, player, games) |
| Minimize scanner | All windows minimize, scan continues |
| Circa bar | ALWAYS shows scan progress (not just when minimized) |
| Scan completes (minimized) | Auto-expand scanner modal |
| Scan completes (closed) | Do nothing (user exploring) |
| Snake game minimized | Pause game, show "Resume" button when restored |
| Close MediaPlayer (X button) | Stop music playback |

**No "Minimize All and Explore" button** - instead, instruction text above decade grid:
> "Select a decade to view your top albums"

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/LibraryScanner.jsx` | **CREATE** - New unified modal |
| `src/components/LoadingWindow.jsx` | **DELETE** |
| `src/components/LoadedModal.jsx` | **DELETE** |
| `src/components/LoginModal.jsx` | Remove isPostAuth state (pre-auth only) |
| `src/App.jsx` | Wire up LibraryScanner, remove old modal logic, fix source switching |
| `src/components/Taskbar.jsx` | ALWAYS show scan progress in circa section |
| `src/hooks/useSpotify.js` | Add fadeIn for Spotify player after auth |
| `src/components/MediaPlayer.jsx` | Close button stops music, fix offline→Spotify display |
| `src/components/Tooltip.jsx` | Add delay (400ms), position prop (above/below) |
| `public/games/snake/js/view.js` | Add pause on minimize, resume button |
| `public/games/solitaire/` | Fix mobile layout (cards cut off) |

---

## Implementation Steps

### Step 1: Create LibraryScanner.jsx
New component combining LoadingWindow + LoadedModal:
- Props: `scanState`, `loadingProgress`, `decadeStatus`, `albumsByDecade`, `topDecade`
- Two render modes based on scanState
- Decade button grid with progressive enabling
- Instruction text: "Select a decade to view your top albums"
- NO "Minimize All and Explore" button

### Step 2: Update App.jsx
- Remove LoadingWindow/LoadedModal window management
- Add LibraryScanner to windows array after OAuth
- Track `scannerMinimized` state for auto-expand
- `onSelectDecade` minimizes ALL windows (scanner, player, games)
- Pass `scanProgress` to Taskbar ALWAYS (not just when minimized)

### Step 3: Simplify LoginModal.jsx
- Remove entire isPostAuth branch (lines 369-457)
- Keep only pre-auth "Connect to Spotify" state

### Step 4: Update Taskbar.jsx
- ALWAYS show scan progress in circa section (scanning or complete)
- Format: "SCANNING... 45%" or "52 ALBUMS READY"

### Step 5: Add Spotify fadeIn (useSpotify.js)
- After first Spotify track loads, fade volume from 0 to target
- Mirror the fadeOut pattern from useLocalAudio
- Creates smooth "your music becomes their music" transition

### Step 6: MediaPlayer close = stop music
- When user clicks X (close, not minimize), stop playback
- Both local audio and Spotify

### Step 7: Snake pause on minimize
- When game window minimizes, pause game loop
- Add "RESUME" button to splash screen
- Restore game state when window restored

### Step 8: Fix Player "Offline Mode" Stuck Bug
**Repro:** Song error → "Activate Offline Mode" → Play Spotify song → Player still shows offline track
**Fix:** When Spotify starts playing, clear local audio display state
- File: `src/App.jsx` or `src/components/MediaPlayer.jsx`
- Ensure `currentSource` switches properly and clears stale track info

### Step 9: Fix Tooltip Delay + Positioning
**Bug found:** Delay isn't working because `$delay` prop is on TooltipTrigger but CSS interpolation looks at TooltipContent's props.

**Fix in Tooltip.jsx:**
- Pass delay to TooltipContent via CSS variable or restructure styled-components
- Option: Use `&:hover + ${TooltipContent}` with hardcoded 400ms, or pass via wrapper

**Also needed:**
- Add `position="below"` to bottom-row tooltips in MediaPlayer:
  - Previous, Play/Pause, Next, Visualizer, Mute (lines 554-580)
- Visualizer naming:
  - Window title + heading: "WMP[ish] VISUALIZER" (has room)
  - Menu: "Visualizer" (keep short)
- Files: `src/components/Tooltip.jsx`, `src/components/MediaPlayer.jsx`

### Step 9b: Fix Solitaire Mobile Layout
- Window too wide, cards cut off on right side
- Add max-width or responsive scaling for mobile
- File: `public/games/solitaire/` (CSS or container)

### Step 9c: Fix Modal Close Buttons on Mobile
- Close/minimize buttons getting cut off on small screens
- Ensure window header buttons always visible
- Files: Modal styled components (LoginModal, MediaPlayer, etc.)

### Step 9d: Fix Snake Mobile Arrow Buttons
- Arrow buttons exist in HTML (lines 104-115) but not visible
- CSS uses `@media (pointer: coarse)` - might not be triggering
- Likely positioned below visible area due to game height
- Fix: Adjust container height to include controls, or change display logic
- File: `public/games/snake/index.html` (CSS section)

### Step 10: Add DEBUG Flag for Console Logs
- Add `const DEBUG = import.meta.env.DEV` or similar
- Wrap all `console.log()` calls with `if (DEBUG)` or create helper
- Keeps debugging capability, cleans up production console
- Files: Multiple (useSpotify.js, Desktop.jsx, App.jsx, etc.)

### Step 11: Add Image Error Handlers
- Add `onError` fallback to album art images
- Show placeholder when album art fails to load
- File: `src/components/Desktop.jsx`

### Step 12: Delete Old Files
- Delete LoadingWindow.jsx
- Delete LoadedModal.jsx

---

## State Flow

```
User clicks "Connect to Spotify"
    ↓
OAuth redirect → callback
    ↓
App.jsx: Open LibraryScanner (scanState: 'scanning')
    ↓
useSpotify fetches library, updates:
  - loadingProgress {loaded, total}
  - decadeStatus {60s: 'ready', 70s: 'loading', ...}
  - albumsByDecade {60s: [...], ...}
    ↓
When all decades done:
  - scanState → 'complete'
  - If minimized → expand modal
```

---

## Props for LibraryScanner

```javascript
<LibraryScanner
  // Window management
  isActive={...}
  zIndex={...}
  position={...}
  onClose={...}
  onMinimize={...}
  onFocus={...}
  onDragStart={...}

  // Scan state
  scanState={'scanning' | 'complete'}
  loadingProgress={{ loaded: 1234, total: 2000 }}
  decadeStatus={{ '60s': 'ready', '70s': 'loading', ... }}
  albumsByDecade={{ '60s': [...], ... }}
  topDecade="90s"

  // Actions
  onSelectDecade={(decade) => ...}  // Minimizes all windows + sets filter
/>
```

---

## Test Flows

1. Fresh visit → Login → Scan → Complete (modal open)
2. During scan → click enabled decade → filter works, ALL windows minimize
3. Circa bar shows progress ALWAYS (not just minimized)
4. During scan → minimize → wait complete → modal auto-expands
5. During scan → close modal → scan continues → no modal appears
6. Pre-loaded music playing → Auth → Music fades out → Spotify fades IN
7. Close MediaPlayer (X) → Music stops (both local and Spotify)
8. Minimize Snake game → Game pauses → Restore → Shows "Resume" button
9. **Offline mode bug:** Error → Offline Mode → Spotify song → Player shows Spotify (not offline)
10. **Tooltips:** Hover player buttons → 400ms delay → Tooltip appears BELOW
11. **Solitaire mobile:** Open Solitaire on phone → All cards visible, no cutoff
12. **Modal buttons mobile:** Open any modal on phone → Close/minimize buttons visible
13. **Snake mobile:** Open Snake on phone → Arrow buttons visible and working

---

## Risk

| Change | Risk | Mitigation |
|--------|------|------------|
| New modal component | Medium | Reuse existing styled components |
| Window management | Medium | Test all 5 flows above |
| Taskbar update | Low | Small isolated change |

---

## What's NOT Changing

- Pre-auth LoginModal (Connect to Spotify screen)
- useSpotify.js internals (except adding fadeIn)
- Info modal, Settings modal
- Visual styling (reusing existing patterns)
- Desktop (except minimize behavior)

---

## Previous Audit Status

**Already completed in previous sessions:**
- ✅ Login modal race condition fix
- ✅ Memory leak fixes (position interval, event listeners)
- ✅ Memoization improvements
- ✅ Theme consolidation

**Adding to this plan (low risk):**
- 🔧 DEBUG flag for console logs (Step 10)
- 🔧 Image error handlers (Step 11)

**Skipping (medium risk, current approach works):**
- ⏸️ Token refresh mutex

**Hidden albums log:**
Already implemented! **Settings → HIDDEN ALBUMS → LOG button** downloads JSON with all filtered albums.
