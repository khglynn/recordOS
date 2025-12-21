# Roadmap

What's next, in order. When done, move to `COMPLETED.md`.

---

## 1. PostHog Integration

Full PostHog setup with session recording, autocapture, Slack alerts.

**Plan:** `claude-plans/2025-12-13-posthog-integration.md`

**What:**
- Install posthog-js, create utils/posthog.js
- Cookieless mode (no consent banner needed)
- Session recording + autocapture
- Track: login, scan, playback, games, windows, settings
- Slack notifications (errors + daily digest)
- Tracking disclosure in InfoModal
- Create analytics-monitoring skill

---

## 2. URL State Persistence

Add query parameter support so views can be bookmarked/shared.

**What:**
- `?era=2020s` - Load specific decade
- `?album=xyz` - Deep link to album (future)
- Update URL when era changes
- Read params on load to restore state

---

## 3. Performance Pass

Profile and optimize rendering performance. Address any jank in album grid scrolling, window dragging, and visualizer.

**What:**
- React DevTools profiler analysis
- Identify unnecessary re-renders
- Optimize album grid virtualization if needed
- Test on lower-end devices

---

## 4. Window Component Refactoring

Migrate all window components to use WindowFrame for consistency.

**Context:** 5 of 10 window components duplicate ~100 lines of styled-components each instead of using WindowFrame. See `TECHNICAL-DEBT.md` for details.

**What:**
- Extend WindowFrame to support all variants (game fullscreen, player dock, etc.)
- Migrate MediaPlayer.jsx, GameWindow.jsx, TrippyGraphics.jsx, LibraryScanner.jsx, LoginModal.jsx
- Test each on mobile + desktop
- Estimated: 3-4 hours, removes ~600 lines of duplicate code

---

## 5. Minesweeper Win UI

Custom victory celebration for minesweeper wins.

**What:**
- Custom "you win!" modal matching recordOS aesthetic
- Win animation/effects
- Time and stats display
- Share result option (maybe)

---

## 6. Storybook Component Library

Document and test UI components in isolation.

**What:**
- Set up Storybook
- Document core components (Window, Button, Taskbar, AlbumTile)
- Visual regression testing
- Component variants and states
