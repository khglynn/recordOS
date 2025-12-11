# Album Grid Enhancement Plan

## Overview

Transform album grid into a **Windows Media Player clone** with real audio playback:
1. **Phase 1 (WMP UI)**: XP-era WMP skin, tabs for navigation, visualizer
2. **Phase 2 (Multi-User)**: Spotify OAuth so anyone can sign in

**Key Decision:** Use Spotify Web Playback SDK (requires Premium, Kevin has it) for:
- Full song playback (not just 30-sec previews)
- Access to audio stream for real visualizers
- Custom UI (no iframe)

---

## Phase 1: Windows Media Player UI

### UI Layout (WMP 9/XP Style - No Menu Bar)

```
┌─────────────────────────────────────────────────────────┐
│ [WMP Icon] My Top Albums                    [_][□][X]   │  ← Title bar only
├─────────────────────────────────────────────────────────┤
│ [Now Playing ▼] [Library ▼]                       [⚙️]  │  ← Tabs + Settings gear
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ ▸ Now      │      MAIN CONTENT AREA                     │
│   Playing  │      (Album grid or Visualizer)            │
│            │                                            │
│ ▾ Library  │                                            │
│   By Saved │                                            │
│   By Recent│                                            │
│   By Artist│                                            │
│   By Name  │                                            │
│            │                                            │
│ ▸ Settings │                                            │
│   Threshold│                                            │
│   About    │                                            │
├────────────┴────────────────────────────────────────────┤
│ [◀◀][▶][▶▶] ══●══════════  Now: Song Name    02:15/03:51│  ← Transport
└─────────────────────────────────────────────────────────┘
```

### Sidebar Navigation (Hybrid)

```
▸ Now Playing        → Visualizer + current track info
▾ Library            → Album grid (expandable)
   By Saved Songs    → Sort option
   By Recent         → Sort option
   By Artist         → Sort option
   By Album Name     → Sort option
▸ Settings           → (expandable)
   Threshold         → Min songs slider
   Visualizer        → Pick bars/waves/ambient
   About             → Stats modal
```

### Views

1. **Library View** (default)
   - Album grid fills main area
   - Click album → shows tracks in right panel (or modal)
   - Double-click track → starts playback, switches to Now Playing

2. **Now Playing View**
   - Large visualizer in main area
   - Album art + track info overlay
   - Track list in collapsible right panel

### Tech Stack

- **Custom CSS** - WMP XP blue theme (no XP.css needed, simpler)
- **Spotify Web Playback SDK** - Real audio playback
- **Web Audio API + Canvas** - Visualizer with real audio data
- **React** - Keep existing component structure

### Visualizers to Implement

1. **Bars (spectrum)** - Classic equalizer, easy, iconic
2. **Ambient glow** - Pulsing colors/blob, WMP 9 style

### Colors (WMP XP Theme)

```css
--wmp-bg: #243B55;
--wmp-sidebar: #1E3250;
--wmp-blue-gradient: linear-gradient(180deg, #3A6EA5 0%, #1B3F8B 100%);
--wmp-tab-active: #4A90D9;
--wmp-text: #FFFFFF;
--wmp-text-dim: #8BA4C4;
--wmp-transport-bg: linear-gradient(180deg, #0D1B2A 0%, #1B2838 100%);
--wmp-highlight: #5B9BD5;
```

### Implementation Steps (SDK from Start)

1. **Set up Spotify SDK auth**
   - Create `/api/auth/` endpoints (login, callback, session)
   - Get access token with required scopes
   - Initialize Web Playback SDK

2. **Build WMP chrome**
   - Title bar with icon + window controls
   - Tab bar (Now Playing, Library) + Settings gear
   - Sidebar with collapsible sections

3. **Build transport bar**
   - Play/pause/prev/next buttons
   - Progress slider (seek)
   - Volume control
   - Current track info + time

4. **Build Library view**
   - Album grid (reuse existing tiles)
   - Connect to API for real saved tracks data

5. **Build Now Playing view**
   - Canvas for visualizer
   - Album art + track info overlay

6. **Build visualizer**
   - Connect Web Audio API to SDK audio
   - Bars visualizer (AnalyserNode + frequencyData)
   - Ambient glow option

7. **Build Settings**
   - Threshold slider (filter albums by min saved songs)
   - Visualizer picker
   - About modal with stats

---

## Phase 2: Multi-User Auth (Do Second)

### Architecture

```
Frontend (index.html)
    ↓ fetch /api/auth/session
Backend (Vercel Serverless)
    ↓ check Vercel KV
Token Storage (Vercel KV)
    ↓ if valid, fetch albums
Spotify API
```

### New Files to Create

```
api/
├── auth/
│   ├── login.js      # Redirect to Spotify OAuth
│   ├── callback.js   # Handle OAuth callback, store tokens in KV
│   ├── logout.js     # Clear session
│   └── session.js    # Return current user or 401
└── albums.js         # Fetch user's top albums by saved track count
```

### OAuth Flow

1. User clicks "Sign in with Spotify"
2. Frontend redirects to `/api/auth/login`
3. Backend redirects to Spotify auth URL
4. User authorizes on Spotify
5. Spotify redirects to `/api/auth/callback`
6. Backend exchanges code for tokens
7. Backend stores tokens in Vercel KV with session ID
8. Backend sets session cookie
9. Backend redirects to frontend
10. Frontend calls `/api/auth/session` to get user info
11. Frontend calls `/api/albums` to get personalized data

### Album Selection Logic (in `api/albums.js`)

```javascript
// 1. Fetch all user's saved tracks (paginated)
// 2. Group by album ID
// 3. Count saved songs per album
// 4. Sort by count descending
// 5. Return top N with full album details
```

### Frontend Changes

1. Add `LoginWindow` component (Win95 styled)
2. Add auth state to `App` (`user`, `authLoading`)
3. Check session on mount
4. If not authenticated, show `LoginWindow`
5. If authenticated, fetch from `/api/albums` instead of static JSON
6. Add user name + logout to taskbar/menu

### Environment Variables (Vercel Dashboard)

```
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
SPOTIFY_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx
SESSION_SECRET=xxx
```

### Dependencies to Add

```json
{
  "@vercel/kv": "^1.0.0",
  "spotify-web-api-node": "^5.0.2"
}
```

### Spotify Dashboard Config

Add redirect URIs:
- `http://127.0.0.1:3000/api/auth/callback` (local dev)
- `https://your-app.vercel.app/api/auth/callback` (production)

---

## Effort Estimates

| Phase | Task | Time |
|-------|------|------|
| **1** | Background + taskbar CSS | 30 min |
| **1** | New React components | 1-2 hours |
| **1** | Code cleanup | 30 min |
| **2** | Auth endpoints | 2-3 hours |
| **2** | Albums endpoint | 1-2 hours |
| **2** | Frontend auth flow | 1-2 hours |
| **2** | Testing | 2-3 hours |

**Total: Phase 1 ~2-3 hours, Phase 2 ~6-10 hours**

---

## Critical Files

### Phase 1 (WMP UI + Spotify SDK)
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/album-grid/index.html` - Complete rewrite with WMP theme
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/api/auth/login.js` (new) - Spotify OAuth redirect
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/api/auth/callback.js` (new) - OAuth callback handler
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/api/auth/session.js` (new) - Check current session
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/api/albums.js` (new) - Fetch user's top albums
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/package.json` - Add spotify-web-api-node, @vercel/kv

### Phase 2 (Multi-User Polish)
- Same files, plus:
- `/Users/KevinHG/Desktop/KevinIsDev/claude-code-cli/festival-navigator/api/auth/logout.js` (new)
- Vercel environment variables for production

---

## Effort Estimate

| Task | Time |
|------|------|
| Spotify OAuth endpoints | 1-2 hours |
| WMP chrome (title bar, sidebar, tabs) | 1-2 hours |
| Transport bar + SDK integration | 2-3 hours |
| Visualizer (bars + ambient) | 2-3 hours |
| Library view (album grid) | 1 hour |
| Now Playing view | 1 hour |
| Settings + polish | 1 hour |
| **Total Phase 1** | **~10-12 hours** |

---

## Note: Visualizer + Spotify SDK

The Web Playback SDK creates an audio element we can connect to Web Audio API:
```javascript
// After SDK is ready
const audioContext = new AudioContext();
const source = audioContext.createMediaElementSource(audioElement);
const analyser = audioContext.createAnalyser();
source.connect(analyser);
analyser.connect(audioContext.destination);
// Now analyser.getByteFrequencyData() gives us visualizer data
```

This enables real-time visualizers synced to the actual music.
