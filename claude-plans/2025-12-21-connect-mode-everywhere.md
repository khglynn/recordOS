# Connect Mode Everywhere + UX Polish

**Created:** 2025-12-21
**Status:** Core refactor complete - pushed to production
**Last updated:** 2025-12-21

---

## Completed This Session

| Task | Status |
|------|--------|
| Remove Web Playback SDK, use Connect everywhere | Done |
| Reduce polling to 1 second | Done |
| Fix threshold slider not updating grid | Done |
| Fix likedTrackIds cache (liked songs highlight) | Done |
| Remove album end overlay/sound | Done |
| Code review + cleanup dangling playerRef | Done |

### Changes Made

**SDK Removal (~300 lines removed):**
- Removed Spotify Web Playback SDK initialization
- Removed SDK script injection, player creation, event handlers
- Removed `mobileMode` branching - all browsers use Connect now
- Simplified `playTrack` and `playAlbum` to single path
- Updated volume control to use Spotify API instead of SDK
- Renamed `mobileDeviceName` to `activeDeviceName`
- Cleaned up dangling `playerRef.current.disconnect()` in logout handler

**Bug Fixes:**
- Threshold slider now actually filters albums (was filling to 48)
- `likedTrackIds` now cached properly (liked songs highlight after refresh)
- Removed incorrect "RECORD COMPLETE" overlay

**Performance:**
- Polling interval reduced from 1.5s to 1s (safe for 2 users)
- Bundle size reduced by ~6kb

---

## Remaining Tasks (Next Session)

| # | Task | Effort |
|---|------|--------|
| 1 | Access request overlay flow on login | 20 min |
| 2 | Fix grid loading before scan complete | 10 min |
| 3 | Games links in decade loading modal | 5 min |
| 4 | PNG export with processing flair | 10 min |

### Access Request Overlay Flow

When user clicks "Connect Spotify":
1. If not approved → show overlay with email form
2. If pending → show "AWAITING AUTHORIZATION" + game links
3. If approved → show "ACCESS GRANTED" + confirm button
4. User clicks confirm → proceeds to Spotify OAuth

**Overlay style:** Semi-transparent green (like removed album end overlay)

**Copy for "while you wait":**
- "// IDLE PROCESSES AVAILABLE"
- "RECREATIONAL SUBROUTINES:"

### PNG Export Flair

Terminal-style stages:
```
INITIALIZING CAPTURE SEQUENCE...
RENDERING PIXEL MATRIX...
COMPRESSING DATA STREAM...
EXPORT COMPLETE // INITIATING DOWNLOAD
```

---

## Notes

- Connect mode controls external Spotify app (phone, desktop) instead of playing in browser
- Works on all browsers including Safari
- Requires Spotify Premium (same as before)
- Email approval still needed for dev mode app (25 user limit)
