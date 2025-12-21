# Connect Mode Everywhere + UX Polish

**Created:** 2025-12-21
**Status:** Complete
**Last updated:** 2025-12-21
**Deployed:** 2025-12-21 (main branch)

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
| Access request overlay flow with game links | Done |
| Games links in decade loading modal | Done |
| Lower visualizer resolution for performance | Done |
| Increase max albums to 120 + add cap note | Done |
| Fix threshold export filename bug | Done |
| Salty Weyland-Yutani copy for AccessRequestWindow | Done |
| Remove infinite gridPulse animation | Done |

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
- Fixed export filename to use actual threshold value (was hardcoded MIN_SAVED_TRACKS)

**Performance:**
- Polling interval reduced from 1.5s to 1s (safe for 2 users)
- Bundle size reduced by ~6kb
- Visualizer resolution lowered to 400x300 (was 800x600) for retro CRT aesthetic + CPU savings

**UX Improvements:**
- AccessRequestWindow: Added game links in pending state ("//IDLE PROCESSES AVAILABLE")
- LibraryScanner: Added game links during scan (minimizes scanner when game opens)
- SettingsModal: Added cap note "//GRID CAPPED AT 120 ALBUMS" when total >= 120
- Album grid now shows up to 120 albums (was 48)
- AccessRequestWindow: Salty Weyland-Yutani copy about Spotify's 25-user dev limit
- Desktop: Removed infinite gridPulse animation (static 0.5 opacity now)

---

## Remaining Tasks

All tasks complete!

### Verified: Grid Loading

Investigated the grid loading concern - it's working correctly:
- `displayAlbums` returns `[]` during scan (unless browsing a ready decade)
- Desktop shows loading animation when `isLoading && albums.length === 0`
- Grid only populates after scan completes with `setAlbums(albumsArray)`
- Progressive decade loading still works (user can browse ready decades early)

---

## Notes

- Connect mode controls external Spotify app (phone, desktop) instead of playing in browser
- Works on all browsers including Safari
- Requires Spotify Premium (same as before)
- Email approval still needed for dev mode app (25 user limit)
- MIN_SAVED_TRACKS (8) is now just the default value - actual filtering uses threshold slider state
