# recordOS Pending Fixes

**Created:** 2025-12-11
**Status:** Pending (for next session)

---

## Completed This Session (Dec 11)

1. **Snake D-pad Controls** - Fixed click handler, muted colors, grid-aligned, edge controls
2. **Minesweeper Flag Mode** - "MARK MINES" label, mouse flag toggle working
3. **Album End Detection** - Track original album URI, detect autoplay switch
4. **Spotify Auth** - Verified working on dev (false alarm)

---

## Local Changes (Ready to Deploy)

```
public/games/minesweeper/js/MineSweeper.js  - Flag mode fixes
public/games/snake/index.html               - D-pad styling
public/games/snake/js/view.js               - D-pad click fix
src/components/InfoModal.jsx                - Mobile centering (partial)
src/hooks/useSpotify.js                     - Album end detection
```

---

## Pending for Next Session

### HIGH PRIORITY
1. **Spotify Playback Error** - "Failed to play" now happens with ALL songs (was intermittent)

### UI/UX
2. **Minesweeper Extra Padding** - Remove extra padding in window
3. **Mobile Modal Centering** - Modals cut off at bottom, space on top (apply to SettingsModal, TrackListModal)
4. **Mobile Tab Bar** - Taskbar shows no tabs on mobile
5. **Solitaire Menu Icon** - Update icon next to Solitaire in Start menu
6. **Decade Button Disabled State** - Visual disabled state when decade has no albums
