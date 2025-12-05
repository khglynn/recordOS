# Record OS - Development Context

## Project Overview
Windows 95-style music visualization app displaying user's Spotify albums ranked by saved track count. Dark theme with green (#00ff41) Matrix/terminal aesthetic.

## Tech Stack
- React 19, Vite, styled-components, React95 UI library
- Spotify Web API + Web Playback SDK
- Pixelarticons for icons (installed, partially integrated)
- Butterchurn for visualizations (planned)

---

## Butterchurn Implementation Plan

### Approach
Butterchurn needs actual audio data to generate visualizations. Since we can't access Spotify's audio stream directly, we'll use microphone input as a workaround.

### User Flow
1. User clicks "Use trippy graphics" toggle in Media Player
2. Request microphone permission via `navigator.mediaDevices.getUserMedia({ audio: true })`
3. Create AudioContext, connect mic stream to AnalyserNode
4. Initialize Butterchurn with the AudioContext
5. Render to canvas in visualization area

### Performance Optimizations
- **Lazy load**: Only import Butterchurn when user opts in (it's a large library)
- **Lower resolution canvas**: Use 400x300 or similar, scale up with CSS for pixelated retro look
- **Reduced frame rate**: 30fps instead of 60fps is fine for the aesthetic
- **Preset curation**: Some presets are GPU-heavy; curate a "safe" list
- **Keep canvas outside React**: Use refs, don't trigger re-renders

### Code Structure
```javascript
// Pseudocode for Butterchurn integration
const initButterchurn = async () => {
  const butterchurn = await import('butterchurn');
  const presets = await import('butterchurn-presets');

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
    width: 400,
    height: 300,
  });

  visualizer.connectAudio(source);
  visualizer.loadPreset(presets.getPresets()['preset-name'], 0);

  // Render loop at 30fps
  const render = () => {
    visualizer.render();
    setTimeout(() => requestAnimationFrame(render), 1000/30);
  };
  render();
};
```

### Fallback
If mic permission denied, show message explaining why it's needed or fall back to basic visualizer bars.

---

## Performance Notes

### Window Dragging
Using Win95 "outline drag" pattern:
- Shows dashed green outline during drag (pure DOM, no React)
- Window position only updates on mouse release (single state update)
- Zero re-renders during drag = no crashes with many albums

### Album Grid
- Currently using CSS Grid with fixed 150px columns
- Need to make responsive: larger tiles on big screens, flex-wrap behavior
- Target: tiles grow up to max-size, then wrap to add more columns

### General
- Reduced scanline opacity (0.03-0.04) and removed animation
- Simplified album entrance animations
- RAF throttling where needed
- Icons loaded async and cached

---

## Current State (Dec 2025)

### Completed
- Dark green Matrix theme throughout
- Spotify OAuth + library fetching with caching
- Album grid with Top 48 algorithm (min 8 saved tracks)
- Decade filtering (2020s, 2010s, 2000s, 1990s, 1980s, Pre-1980)
- Window management with Win95 outline drag
- Games: Minesweeper (themed), Snake (needs fixes)
- Pixelarticons integrated in Taskbar and StartMenu
- Info modal with corporate/hacker tone
- Taskbar shows "circa: [decade]" or "circa: ∞"

### In Progress / TODO
- [ ] Snake game: doesn't fit window, two snakes bug, too fast
- [ ] Album grid responsiveness: larger tiles, flex-wrap to max-size
- [ ] Pre-login state: auto-open Minesweeper, Login, Media Player (muted demo)
- [ ] Stop music when Media Player closed
- [ ] Login modal should use outline drag
- [ ] Infinity icon in taskbar tray (replace ∞ symbol)
- [ ] Butterchurn visualizer with mic input
- [ ] Update remaining components with pixel icons

### Snake Game Issues
- Game doesn't fit in window (CSS positioning issues)
- Two snakes appearing (game logic bug in snake.js)
- Too fast (need to adjust game speed)
- Search terms for alternatives: "javascript snake game simple", "retro snake js", "classic snake html5"

### Files Modified This Session
- `src/App.jsx` - Added useRef, outline drag implementation
- `src/components/Taskbar.jsx` - Pixel icons, decade display
- `src/components/StartMenu.jsx` - Pixel icons, decade filter
- `src/components/InfoModal.jsx` - Corporate/hacker tone text
- `src/components/PixelIcon.jsx` - NEW: Icon component
- `src/utils/constants.js` - Decade options, 48 album count
- `src/hooks/useSpotify.js` - Decade filtering logic
- `public/games/snake/css/snake.css` - Positioning fixes (still broken)
- `public/games/minesweeper/index.html` - Dark theme applied

### Demo Music Location
`/public/music/` contains:
- Bit Bouncer.mp3
- Eurodance Music (143 BPM).mp3
- Upbeat Synthwave Movie.mp3

Used by `useLocalAudio` hook for pre-login playback.
