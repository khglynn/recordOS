# recordOS: Spotify Connect UX Overhaul

**Created:** 2025-12-22
**Status:** Ready for implementation

## Overview

Fix Spotify Connect pain points with better onboarding, simplified player states, and cleaner album display.

---

## 1. SPOTIFY CONNECT FLOW IMPROVEMENTS

### Problem
Users don't understand when/how to establish Spotify Connect. Opening Spotify alone doesn't sync - they need to play a track first.

### A. Post-Auth Connection Overlay

**When:** After OAuth completes, poll for playback state. If no device/track detected, show overlay.

**Where:** Reuse LoginModal with new content (same green CRT style)

**Content (Kevin to pick tone):**

**Option A - Clinical/System:**
```
// SPOTIFY HANDSHAKE REQUIRED //

External client must be active before data transfer

1. OPEN SPOTIFY
2. PLAY ANY TRACK
3. RETURN HERE

// SYSTEM WILL DETECT CONNECTION //

[OPEN SPOTIFY]  [VERIFY CONNECTION]
```

**Option B - Deadpan Corporate:**
```
// CONNECTION PENDING //

Spotify requires manual initialization
This is by design. We checked.

1. OPEN SPOTIFY
2. PLAY ANY TRACK
3. RETURN HERE

[OPEN SPOTIFY]  [VERIFY CONNECTION]
```

**Option C - Ominous/Portal-ish:**
```
// AWAITING EXTERNAL SIGNAL //

The daemon sleeps until awakened

1. OPEN SPOTIFY
2. PLAY ANY TRACK
3. RETURN HERE

// DO NOT CLOSE THIS WINDOW //

[OPEN SPOTIFY]  [VERIFY CONNECTION]
```

**Option D - Frustrated Corporate:**
```
// SPOTIFY WON'T TALK TO US //

Their API requires an active session
on your end. Yes, really.

1. OPEN SPOTIFY
2. PLAY ANY TRACK
3. RETURN HERE

[OPEN SPOTIFY]  [VERIFY CONNECTION]
```

**Behavior:**
1. After OAuth → `GET /me/player/devices` to check for existing devices
2. **If device found:** Auto-activate via `PUT /me/player` with `{ device_ids: [id], play: true }` - skip instructions!
3. **If no device:** Show 3-step overlay, poll every 3 seconds for device
4. Auto-dismiss when device appears OR user clicks "I'VE DONE THIS" and device exists
5. "I'VE DONE THIS" button → force re-check, show spinner, dismiss if connected

**API Research Result:** ✅ Transfer Playback endpoint can auto-start playback on a device. Requires:
- `user-modify-playback-state` scope (already have)
- At least one Spotify device to be open (user must have app running)
- We cannot CREATE a device (removed Web Playback SDK), but we can ACTIVATE one

### B. Enhanced "Open Spotify" Commands

**Current:** `spotify://` URI opens app but doesn't play

**Improved:**
- When user clicks album → play fails → "Open Spotify" button:
  - Use `spotify:album:{albumId}` URI to open that specific album
  - On return, retry play automatically
- Generic "Open Spotify" button in player:
  - Use `spotify:` to just open app
  - Or if `currentTrack` exists: `spotify:track:{trackId}`

### C. Simplified Error Handling

**Remove:**
- "INITIATE OFFLINE MODE" button (demo mode fallback)
- Multiple error states cluttering player

**New error trigger:**
- Track rapid clicks: if play button clicked 3x within 2 seconds
- Show inline message (not modal): "Spotify connection lost. Open Spotify, play a song, return here."
- Single "OPEN SPOTIFY" button
- Auto-clear error when playback resumes

**Keep:**
- Auth errors (401/403) → logout flow
- Premium required error → clear message

### D. Player Auto-Open on Mobile

**Current:** Player only auto-opens on desktop after auth
**Change:** Open MediaPlayer window on mobile too after auth completes

---

## 2. ONBOARDING FLOW REFINEMENT

**Goal:** Make authorization feel contiguous, all in login modal style.

| Step | Current | New |
|------|---------|-----|
| 1 | "Connect to Spotify" button | "REQUEST SPOTIFY CONNECTION" button |
| 2 | Access overlay (email form) | Same - keep |
| 3 | Pending state | "Kevin has to approve you. Give him a minute. This is a manual process. We hate Spotify." |
| 4 | OAuth redirect | Same |
| 5 | Auto-start scan immediately | Show 3-step connection overlay FIRST (if no device) |
| 6 | LibraryScanner opens | THEN show LibraryScanner with counting |

**Key change:** Step 5 inserts a checkpoint before scan starts. User must establish Spotify Connect before we load their library.

---

## 3. ALBUM DISPLAY & SORTING

### Remove Threshold Setting
- Delete threshold slider from settings
- Delete `MIN_SAVED_TRACKS`, `THRESHOLD_OPTIONS` from constants
- Delete threshold localStorage key
- Delete threshold-related UI in SettingsModal

### New Logic: Top 50 Per Decade
```javascript
// Per decade view: top 50 albums sorted by liked tracks
// "All Time" view: top 50 overall (not 250 combined)

const getDisplayAlbums = (albums, decade) => {
  const filtered = decade === 'all'
    ? albums  // all decades
    : albums.filter(a => getDecade(a.releaseDate) === decade);

  // Sort by liked tracks descending
  const sorted = filtered.sort((a, b) => b.likedTracks - a.likedTracks);

  // Round to full row
  const perRow = getColumnsForViewport(); // 2-6 typically
  const targetCount = Math.ceil(50 / perRow) * perRow; // 50, 51, 52, 54...

  return sorted.slice(0, targetCount);
};
```

### Duplicate Album Handling
**New:** Deduplicate by album name + artist (not just Spotify ID)
- Spotify sometimes has multiple IDs for same album (remasters, regional variants)
- Keep the one with more liked tracks

```javascript
const dedupeByName = (albums) => {
  const seen = new Map(); // key: `${name.toLowerCase()}|${artist.toLowerCase()}`
  return albums.filter(album => {
    const key = `${album.name.toLowerCase()}|${album.artist.toLowerCase()}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (album.likedTracks > existing.likedTracks) {
        // Replace with better version
        seen.set(key, album);
        return true; // Will filter out old one on second pass
      }
      return false;
    }
    seen.set(key, album);
    return true;
  });
};
```

### Grid Row Rounding
Ensure bottom row is always full for clean exports:

| Columns | Albums Shown |
|---------|--------------|
| 2 | 50 |
| 3 | 51 |
| 4 | 52 |
| 5 | 50 |
| 6 | 54 |

### Copy Updates
- Loading modal: "Click decade to view top 50 albums, sorted by songs you've saved"
- Change "all" → "all time" everywhere (buttons, labels)

---

## 4. SETTINGS → DOWNLOAD REDESIGN

### Rename
"Settings" → "Download Grid"

### Keep
- CRT Scanlines toggle
- Library section (Rescan, Show scan results)

### Remove
- Threshold slider
- Album count displays per decade

### UX Pattern: In-Button Progress (proven Safari-safe)

Keep the existing staged button feedback pattern - no modal overlays:
```
EXPORT → INIT... → RENDER... → COMPRESS... → COMPLETE
```

This pattern works because:
- Immediate visual feedback
- No overlay that can feel "stuck"
- Safari/mobile detection already handles timeout issues
- User stays in control (can close window anytime)

### New Layout

```
┌─────────────────────────────────────┐
│ DOWNLOAD GRID                    ─×│
├─────────────────────────────────────┤
│ ┌─ DISPLAY ─────────────────────┐   │
│ │ CRT Scanlines        [ON/OFF] │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ DECADE ──────────────────────┐   │
│ │ [▼ 2020s (current)          ] │   │
│ │    Options: current decade,   │   │
│ │    each decade, "All Time"    │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ EXPORT ──────────────────────┐   │
│ │ Grid image        [EXPORT]    │   │  ← staged: INIT→RENDER→COMPRESS
│ │ Album list (.txt) [EXPORT]    │   │  ← instant download
│ │ Album list (.csv) [EXPORT]    │   │  ← instant download
│ └───────────────────────────────┘   │
│                                     │
│ ┌─ LIBRARY ─────────────────────┐   │
│ │ Refresh from Spotify [RESCAN] │   │
│ │ Scan results window  [SHOW]   │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Export Formats

**TXT:**
```
RECORD OS // TOP 50 ALBUMS // 2020s
Generated: 2025-12-22

1. Album Name - Artist (2023) // 12 saved tracks
2. Album Name - Artist (2021) // 10 saved tracks
...

// END TRANSMISSION //
```

**CSV:** Same as current, add "Decade" column if "All Time" selected

**"Download All" (when "All Time" selected):**
- TXT: Single file with decade headers
- CSV: Single file with Decade column
- Images: Zip via JSZip - staged button: `INIT... → 2020s... → 2010s... → ZIP... → COMPLETE`
  - Generate one PNG per decade sequentially (avoids Safari memory issues)
  - Bundle into zip at end
  - Show which decade is rendering in button label

---

## 5. FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/hooks/useSpotify.js` | Remove threshold logic, add name-based dedupe, top 50 per decade, add `transferPlayback()` function |
| `src/utils/constants.js` | Remove `MIN_SAVED_TRACKS`, `THRESHOLD_OPTIONS`, change `TARGET_ALBUM_COUNT` to 50 |
| `src/components/Desktop.jsx` | Add row rounding logic, pass column count to filter |
| `src/components/SettingsModal.jsx` → `DownloadModal.jsx` | Rename file, remove threshold slider, add decade selector, add TXT export, add JSZip for image zip |
| `src/components/MediaPlayer.jsx` | Remove demo mode button/handler, simplify error to single state, add rapid-click detection |
| `src/components/LoginModal.jsx` | Add connection overlay state after OAuth, auto-transfer logic |
| `src/components/LibraryScanner.jsx` | Update "all" → "all time" copy |
| `src/App.jsx` | Rename SettingsModal import, add connection check post-auth, auto-open player on mobile, remove demo mode handler |

**New dependency:** `npm install jszip` for image zip export

---

## 6. IMPLEMENTATION ORDER

### Phase 1: Album Logic (low risk, high impact)
- [ ] `constants.js` - Remove threshold constants, set TARGET = 50
- [ ] `useSpotify.js` - Remove threshold filtering, add name-based dedupe
- [ ] `Desktop.jsx` - Add row rounding (50 → nearest full row)
- [ ] `LibraryScanner.jsx` - "all" → "all time" copy

### Phase 2: Download Modal (isolated)
- [ ] Rename `SettingsModal.jsx` → `DownloadModal.jsx`
- [ ] Remove threshold slider and decade counts
- [ ] Add decade dropdown selector
- [ ] Add TXT export function
- [ ] Install JSZip, add zip export for "All Time" images
- [ ] Update `App.jsx` imports

### Phase 3: Player Simplification (medium risk)
- [ ] `MediaPlayer.jsx` - Remove demo mode button
- [ ] `MediaPlayer.jsx` - Add rapid-click counter (3x in 2s → error)
- [ ] `MediaPlayer.jsx` - Simplify error display to single inline message
- [ ] `App.jsx` - Remove `handleEnableDemoMode`, `demoModeForced` state
- [ ] `useLocalAudio.js` - Can keep for visualizer fallback, just disconnect from player

### Phase 4: Spotify Connect Flow (higher complexity)
- [ ] `useSpotify.js` - Add `getDevices()` and `transferPlayback()` functions
- [ ] `LoginModal.jsx` - Add `connectionOverlay` state (post-OAuth)
- [ ] `LoginModal.jsx` - Poll for devices, auto-transfer if found
- [ ] `LoginModal.jsx` - Show 3-step instructions if no device
- [ ] `App.jsx` - Auto-open player on mobile after auth
- [ ] `MediaPlayer.jsx` - Use `spotify:album:{id}` URI in Open Spotify button

### Phase 5: Copy Polish
- [ ] `LoginModal.jsx` - "REQUEST SPOTIFY CONNECTION" button text
- [ ] `LoginModal.jsx` - "Kevin has to approve you..." pending message
- [ ] Connection overlay copy: Option D (Frustrated Corporate)
- [ ] `LibraryScanner.jsx` - Update loading modal explanation

---

## DECISIONS MADE

| Decision | Choice |
|----------|--------|
| Connection overlay copy | Option D: Frustrated Corporate - "SPOTIFY WON'T TALK TO US // Their API requires an active session on your end. Yes, really." |
| Download All images | Include zip (JSZip, sequential decade rendering) |
| Auto-transfer playback | Yes - use `PUT /me/player` if device exists, skip 3-step when possible |
