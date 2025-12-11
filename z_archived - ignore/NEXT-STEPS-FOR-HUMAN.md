# Record OS - Next Steps for Human

Last updated: Dec 5, 2025

## Quick Summary

Record OS is functional with Spotify auth, album grid, games, and media player. The major remaining work is:
1. Grid sizing refinement
2. Butterchurn visualizer integration
3. Stripe donation setup
4. Final polish items

---

## Immediate Tasks (Current Session)

### 1. Album Grid Sizing
**Goal**: Min 225px, max 50vw, edge-to-edge fill

**Current State**: Using `minmax(175px, 1fr)` - tiles stretch to fill but sizing may not be ideal.

**Options**:
- A) Keep stretching behavior, just adjust min to 225px
- B) Use `clamp(225px, 25vw, 50vw)` for more controlled sizing
- C) Fixed columns based on viewport (2 on mobile, 4 on tablet, etc.)

**Action**: Decide which approach, then update `src/utils/constants.js` and `src/components/Desktop.jsx`

### 2. Saved Track Count on Hover
**Where**: `src/components/Desktop.jsx` - `AlbumInfo` styled component
**What**: Add `{album.likedTracks} / {album.totalTracks} saved` to the hover overlay

### 3. Scanline Toggle
**Where**: `src/components/StartMenu.jsx`
**What**: Add menu item "Scanlines: On/Off" that toggles a CSS class on the root element
**State**: Add `scanlinesEnabled` to App.jsx or localStorage

### 4. Login Modal Outline Drag
**Where**: `src/components/LoginModal.jsx`
**What**: Replace direct position state updates with the outline drag pattern used in `App.jsx`
**Why**: Consistent UX and potentially better performance

### 5. Start Button Distinctiveness
**Where**: `src/components/Taskbar.jsx` - `StartButton` styled component
**What**: Make it visually pop more - larger logo, different border treatment, maybe a glow effect

### 6. Menu Item Padding/Truncation
**Where**: `src/components/StartMenu.jsx` - `StyledMenuItem`
**What**: Reduce padding, add `text-overflow: ellipsis` and `white-space: nowrap`

---

## Butterchurn Visualizer

### The Challenge
Spotify doesn't provide raw audio waveform/FFT data for streaming tracks. The Web Playback SDK gives us playback control but not audio analysis in real-time.

### Approach Options

**Option 1: Use Spotify Audio Analysis API** (Recommended)
- Spotify provides pre-computed audio analysis: beats, bars, sections, loudness
- Fetch via `GET /audio-analysis/{id}` when a track starts
- Drive Butterchurn preset changes based on section boundaries
- Pulse/intensity based on loudness values
- NOT real-time FFT, but creates dynamic visuals synced to music

**Option 2: Synthetic Audio**
- Run Butterchurn with generated sine waves or noise
- Change presets periodically
- Looks trippy but completely disconnected from actual music

**Option 3: Microphone (User rejected)**
- Would capture device audio output
- Requires permission, not ideal UX

### Implementation Plan (Option 1)
1. Install Butterchurn: `npm install butterchurn butterchurn-presets`
2. Create `src/hooks/useButterchurn.js`:
   - Initialize WebGL canvas
   - Load preset list
   - Accept beat/section data from Spotify
   - Trigger visual "kicks" on beat boundaries
3. Update `MediaPlayer.jsx`:
   - Replace `FallbackVisualizer` with Butterchurn canvas
   - Pass `audioAnalysis` from Spotify hook
4. In `useSpotify.js`:
   - Fetch audio analysis when track changes
   - Provide `spotify.audioAnalysis` to components

### Files to Create/Modify
- `src/hooks/useButterchurn.js` (new)
- `src/components/MediaPlayer.jsx` (modify visualization area)
- `src/hooks/useSpotify.js` (add audio analysis fetch)

---

## Stripe Donation Integration

### Steps
1. **Create Stripe Account** (if not already)
2. **Create a Payment Link**:
   - Go to Stripe Dashboard > Payment Links
   - Create a donation link (one-time, any amount)
   - Get the URL (e.g., `https://donate.stripe.com/your-link`)
3. **Update InfoModal.jsx**:
   - Replace placeholder URL in `DonateButton` href
   - Currently at line ~388: `href="https://donate.stripe.com/placeholder"`

That's it - no server code needed for simple donations.

---

## Other Polish Items

### Visual
- [ ] Replace remaining emoji icons with PixelIcons (Media Player header: _/× buttons)
- [ ] Add album grid "no albums" empty state
- [ ] Mobile responsive testing

### Functional
- [ ] Pre-login demo audio (local tracks) - partially working
- [ ] Music stops when closing Media Player - implemented
- [ ] Games available before login - implemented

### Performance
- [ ] Audit re-renders with React DevTools
- [ ] Consider virtualization for large album grids (react-window)
- [ ] Lazy load game iframes

---

## Dev Commands

```bash
cd /Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/recordOS
export PATH="/usr/local/opt/node@20/bin:$PATH"
npm run dev   # http://127.0.0.1:5173
npm run build
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app, window management, state |
| `src/hooks/useSpotify.js` | Spotify auth, library, playback |
| `src/components/Desktop.jsx` | Album grid, loading state |
| `src/components/MediaPlayer.jsx` | Music player, visualizer |
| `src/components/TrackListModal.jsx` | Album track list |
| `src/components/Taskbar.jsx` | Bottom bar, Start button |
| `src/components/StartMenu.jsx` | Start menu options |
| `src/utils/constants.js` | Grid sizes, decade options |

---

## Questions to Resolve

1. **Grid sizing**: Which approach - stretch, clamp, or fixed columns?
2. **Butterchurn priority**: Must-have for v1 or can ship with CSS fallback?
3. **Stripe link**: Do you have one already or need to create?
