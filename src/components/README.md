# Components

**Last updated:** 2025-12-15

## Window Components (use WindowFrame)

| Component | Purpose |
|-----------|---------|
| `InfoModal` | About/credits window - **cleanest template for new windows** |
| `SettingsModal` | User preferences |
| `TrackListModal` | Album track list |
| `LoginModal` | Spotify OAuth prompt |
| `AccessRequestWindow` | Access request form (Spotify whitelist flow) |
| `LibraryScanner` | Library scan progress window |

## Core UI

| Component | Purpose |
|-----------|---------|
| `Desktop` | Album grid, loading state |
| `Taskbar` | Bottom bar + start menu |
| `MediaPlayer` | Playback controls |
| `GameWindow` | Game iframe container (⚠️ own styling, NOT WindowFrame - games are special case) |

## Utilities

| Component | Purpose |
|-----------|---------|
| `WindowFrame` | Base window wrapper - **USE THIS FOR NEW WINDOWS** |
| `PixelIcon` | Icon component (pixelarticons) |
| `Tooltip` | Hover tooltips |
| `ErrorBoundary` | Error catching |

## Creating a New Window

1. Copy `InfoModal.jsx` structure
2. Use `WindowFrame` with standard props:
   - `title`, `icon`, `isActive`, `zIndex`, `position`
   - `width`, `maxHeight`, `isMobile`
   - `showMinimize`, `overflow`
   - `onClose`, `onFocus`, `onDragStart`
3. Add to `App.jsx` window management
4. Test: drag, minimize, focus, mobile

## Why GameWindow is Different

Games need:
- iframe embedding for external games (solitaire)
- Mobile scaling calculations
- Full-viewport mode for solitaire
- Custom resize handling

Don't use GameWindow patterns for non-game windows.
