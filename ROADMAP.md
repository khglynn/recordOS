# Roadmap

What's next, in order. When done, move to `COMPLETED.md`.

---

## 1. PostHog Session Recording

Set up session replay to watch user interactions for UX debugging.

**What:**
- Enable session recording in PostHog
- Configure privacy settings (mask sensitive data)
- Link to Sentry errors for context

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

## 4. Storybook Component Library

Document and test UI components in isolation.

**What:**
- Set up Storybook
- Document core components (Window, Button, Taskbar, AlbumTile)
- Visual regression testing
- Component variants and states
