# recordOS - Agent Instructions

*Inherits from ~/DevKev/CLAUDE.md*

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

## Current Status

**Last updated:** 2025-12-10

Modal consolidation complete. Games polished (Minesweeper, Snake, Solitaire). Auth flow bugs fixed.

**Recent work:** `claude-plans/2025-12-10-polish-and-games.md`

**Remaining polish:**
- Live track counts during scan
- Decade button 3x3 grid layout
- InfoModal copy + buymeacoffee URL
- Solitaire card icon in taskbar
- Loading indicator in taskbar

## Where to Find Context

| Source | What's There |
|--------|--------------|
| `claude-plans/` | Archived plans - history of what was attempted |
| `~/.claude/plans/` | Active Claude Code plans (sort by date: `ls -lt ~/.claude/plans/*.md`) |
| `~/MuxDocs/2025/Q4/Record OS/` | Session summaries, starter prompts |
| Recent git commits | What just changed |

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
| `src/components/GameWindow.jsx` | Game iframe container (dimensions, centering) |
| `src/utils/constants.js` | Config values (grid sizes, counts, etc.) |

## Games

Self-hosted in `public/games/`:
- **Minesweeper** - `public/games/minesweeper/` (simplified, mobile flagging)
- **Snake** - `public/games/snake/` (terminal UI, D-pad controls)

External (separate repo for cleaner codebase):
- **Solitaire** - `https://github.com/khglynn/wy-solo` → deployed at `retro-solitare-4recordos.vercel.app` (can modify if needed)

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

## Future: Analytics Integration

In a future session, add PostHog alongside Sentry and link both to Slack notifications.
See skill: `~/.mux/src/HG-Skills-Private/hg-skills/workflow/` for setup pattern.
