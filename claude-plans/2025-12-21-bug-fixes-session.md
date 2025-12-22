# Bug Fixes Session - 2025-12-21

## Session Summary

**Completed:**
1. ✅ Visualizer mobile layout - now fills available space above taskbar
2. ✅ Spotify Connect error messaging - clearer user guidance for NO_DEVICE and DEVICE_RESTRICTED
3. ✅ Export grid mobile - added scale=1 for mobile devices to avoid memory issues

**Pending:**
- ⏳ Solitaire dealing fix - code ready, GitHub MCP auth failing for push

## Issues Identified

### 1. Error Modal UI (Red Box) - MediaPlayer.jsx
**Location:** `src/components/MediaPlayer.jsx` lines 300-348
**Problem:** ErrorBanner has harsh red border that looks out of place
**Current styling:**
```css
border: 1px solid rgba(255, 65, 65, 0.3);
border-left: 3px solid #ff4141;
```
**Fix:** Make it more subtle or use amber/Matrix green warning style instead

### 2. Visualizer Mobile - TrippyGraphics.jsx
**Location:** `src/components/TrippyGraphics.jsx`
**Problem:** iframe not filling window on mobile - lots of empty space below controls
**Current mobile styles only set max-width/max-height constraints, not fill behavior**
**Fix:** Need to ensure the window and iframe fill available space properly on mobile

### 3. Solitaire Dealing (External Repo)
**Repo:** github.com/khglynn/wy-solo (deployed at retro-solitare-4recordos.vercel.app)
**Location:** `js/ui.js` renderWaste() function + `css/game.css`

**CSS expects nth-last-child positioning:**
```css
.pile.waste .card:nth-last-child(3) { left: 0; }
.pile.waste .card:nth-last-child(2) { left: var(--pile-gap); }
.pile.waste .card:nth-last-child(1) { left: calc(var(--pile-gap) * 2); }
```

**JS sets position: absolute but NO left offset** - relies on CSS nth-last-child
**Problem:** When only 1 card in waste, nth-last-child(1) should put it at `left: calc(var(--pile-gap) * 2)` but screenshot shows it stacked at 0

**Root cause:** CSS nth-last-child selectors are unreliable. Fix is to set explicit left positions in JS.

**Fix ready (GitHub auth failing):**
```javascript
// In renderWaste():
const pileGap = parseFloat(getComputedStyle(document.documentElement)
  .getPropertyValue('--pile-gap')) || 12;

// Calculate left positions for visible cards
const visibleCards = wasteCards.slice(startIndex);
for (let i = 0; i < visibleCards.length; i++) {
  const leftOffset = i * pileGap;
  const cardEl = this.createCardElement(card, {
    zIndex: i,
    left: leftOffset,  // NEW: explicit positioning
  });
  // ...
}

// Also add to createCardElement:
if (options.left !== undefined) {
  el.style.left = `${options.left}px`;
}
```

### 4. Spotify Connect Limitations (Researched)
**Key Finding:** Spotify API CANNOT launch/open the Spotify app - it can only control devices where Spotify is already running.

**API endpoints:**
- `GET /me/player/devices` - returns devices where Spotify is running
- `PUT /me/player` (transferPlayback) - transfers to device, `play: true` starts playback

**Device types returned:** "computer", "smartphone", "speaker"
**`is_restricted: true`** means no Web API commands accepted

**Mobile playback reality:**
- If Spotify app on phone is NOT actively running, it won't appear in getDevices()
- Our app cannot "wake up" or launch Spotify - user must open it first
- Even with app open, iOS background restrictions may prevent detection

**Recommendation:** Improve error messaging to tell users "Open Spotify app first, then try again"

### 5. Export Grid Mobile
**Location:** `src/components/SettingsModal.jsx` line 239 `handleExportGrid`
**Uses html2canvas - should work on mobile but may have performance issues**
**Decision needed:** Keep enabled or disable on mobile?

## Sentry Errors Found

**RECORD-OS-8: "Device not found"**
- Device: iPhone, Chrome Mobile iOS
- URL: dev.ros.kevinhg.com
- This is when getDevices() returns nothing - Spotify app not running

**RECORD-OS-D: "Player command failed: Restriction violated"**
- Device: Mac, Safari
- Context: playTrack, deviceId exists
- This means device has `is_restricted: true` - another app controlling or Premium issue

**Root cause:** Can't launch Spotify, can only control already-running instances

## Sentry Info
- Organization: `khg-y1`
- Region URL: `https://us.sentry.io`
- Project: `record-os`

## Files to Modify

1. **MediaPlayer.jsx** - ErrorBanner styling (softer colors)
2. **TrippyGraphics.jsx** - Mobile sizing to fill window
3. **wy-solo repo** - Fix waste pile card positioning
4. **useSpotify.js** - Better error messaging for Connect failures
