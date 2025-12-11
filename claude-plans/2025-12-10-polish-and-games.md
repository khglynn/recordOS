# recordOS Polish Plan

**Created:** 2025-12-10
**Status:** Complete ✅
**Archived:** 2025-12-11

---

## Summary

Post-consolidation polish: Fix bugs from modal consolidation, UI improvements, and simplify Minesweeper.

---

## Completed

### 1. LoginModal not closing after auth (BUG) ✅

**Fix:** Changed from ID-based to type-based window filtering in `src/App.jsx`:
```javascript
setWindows(prev => prev.filter(w => w.type !== 'login'));
```

### 6. Simplify LoginModal intro text ✅

Applied `//` comment syntax throughout. Tighter, clinical copy.

### 8. Simplify Minesweeper ✅

- Removed timer, levels, best times tracking
- Added mobile flagging (long-press + FLAG toggle button)
- Default: 9x9 grid, 10 mines

### 9. Snake mobile controls ✅

- Added D-pad with pause button in CENTER (3x3 grid)
- Terminal-style start screen (`// SNAKE //`)
- Terminal-style game over (`// TERMINATED //`)
- Reduced window height: 560px → 420px

### 10. Solitaire ✅

- Now self-hosted at `https://retro-solitare-4recordos.vercel.app`
- Iframe detection for minimal chrome
- Mobile horizontal tableau layout

### 11. Game state preservation ✅

Audio state preserved across auth (was already working). Games reset is acceptable.

### Auth flow fixes ✅

- Playback resume delay: 2s → 4s after OAuth
- Game windows now center based on actual dimensions

### 14. Double header in Solitaire ✅

No longer an issue - self-hosted version has iframe mode that hides title bar.

---

## Also Completed (2025-12-11)

### 2. Track/album counts live-updating ✅

Now shows live track counts during scan.

### 3. Decade button layout → 3x3x1 grid ✅

Short labels (20s, 10s, OLD) in grid layout with ALL spanning full width.

### 5. Decade buttons disabled until ready ✅

Buttons respect ready state.

### 7. InfoModal polish ✅

- Updated buymeacoffee URL
- Tightened copy to `//` syntax

### 12. Solitaire icon → card-stack ✅

Changed from `gamepad` to `cards` icon in Taskbar.

### 13. Loading state indicator in taskbar ✅

Shows scanning progress in taskbar during library scan.

---

## Key Commits

- `fba2194` - Polish games + fix auth flow bugs
- `d515367` - Fix decade browsing during scan + album end detection
- `97ca6e9` - Apply // TEXT // style to standalone footer text
