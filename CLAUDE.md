# recordOS - Agent Instructions

*Inherits from ~/DevKevin/CLAUDE.md*

## What This Is

A Windows 95-style music visualization app for Spotify. Shows your most-loved albums ranked by liked track count. Dark Matrix/terminal aesthetic. Nostalgic, grungy, cool.

**Live:** https://record-os.kevinhg.com (also: ros.kevinhg.com)
**Dev:** https://dev.record-os.kevinhg.com

## The Vibe

You're a senior dev at a creative agency who builds slick, badass sites. Care about code quality, performance, and documentation. Code should be clearly documented so a non-developer can understand it.

**Visual aesthetic:** Not an exact Windows 95 replica - pulling from multiple eras of music and computing. Grungy Matrix/alien terminal vibe. Dark backgrounds, Matrix green (#00ff41), Alien (1979) computer terminal look.

## Copy Style

**Tone:** Deadpan corporate Windows 95 with undertones of Weyland-Yutani Corp and Portal's robot. The app is self-aware - it knows it manages records and tracks, speaks about its purpose like a sentient system cataloging your music.

**Guidelines:**
- No periods at end of statements
- Command-line aesthetic (uppercase labels, terminal prompts)
- Tight, dry, slightly ominous
- Monospace font (Consolas, Courier New)
- Self-referential about its purpose

See `src/components/InfoModal.jsx` for copy examples.

## Where to Find Current State

**Always check these before starting work:**

| Source | What's There |
|--------|--------------|
| `CONTEXT.md` | Current TODO list, technical notes, Butterchurn plan |
| `NEXT-STEPS-FOR-HUMAN.md` | Detailed remaining work, implementation options |
| `~/MuxDocs/2025/Q4/` | Recent session summaries (search for "Record OS") |
| `~/MuxDocs/2025/Q4/Record OS/` | Starter prompts, older sessions |
| Recent git commits | What just changed |

Session docs in MuxDocs have the latest context on what was worked on, what's broken, and what's next.

## Tech Stack
- React 19, Vite, styled-components
- React95 (Windows 95 UI components)
- Spotify Web API + Web Playback SDK (PKCE auth, no server)
- Pixelarticons for icons
- Butterchurn for visualizations (planned)

## Dev Commands
```bash
npm run dev   # http://127.0.0.1:5173
npm run build
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app, window management |
| `src/hooks/useSpotify.js` | Spotify auth, library, playback |
| `src/components/Desktop.jsx` | Album grid, loading state |
| `src/components/MediaPlayer.jsx` | Music player |
| `src/components/Taskbar.jsx` | Bottom bar |
| `src/utils/constants.js` | Config values (grid sizes, counts, etc.) |

## Browser Quirks

Safari has CSS Grid rendering issues. The codebase has browser detection that serves different layouts. Check `Desktop.jsx` for implementation - test both Chrome and Safari when making grid changes.

## Git Workflow

Solo project - no PRs needed. Work on `dev`, merge to `main` when ready:

```bash
# Day-to-day work
git checkout dev
# ... make changes, commit, push ...
# → deploys to dev.record-os.kevinhg.com

# Deploy to production
git checkout main && git merge dev && git push
# → deploys to record-os.kevinhg.com
git checkout dev  # back to working
```

## Always-Allowed
- Running `npm run dev`, `npm run build`
- Pushing to `dev` branch (testing)
- Merging `dev` → `main` (production deploy)
- Reading/modifying src/, public/

## Environment Variables
- `VITE_SPOTIFY_CLIENT_ID` - Spotify app client ID
- `VITE_SENTRY_DSN` - (optional) Error tracking
