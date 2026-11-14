# recordOS - Agent Instructions

*Inherits from ~/DevKev/AGENTS.md*

## What This Is

A Windows 95-style music visualization app for Spotify. Shows your most-loved albums ranked by liked track count. Dark Matrix/terminal aesthetic. Nostalgic, grungy, cool.

**Live:** https://record-os.kevinhg.com (also: ros.kevinhg.com)
**Dev:** https://dev.record-os.kevinhg.com still serves the old `dev` branch (last commit 2026-05-05, behind `main`); changes no longer ship through it (Git Workflow, below)

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

**// Comment Formatting:**
| Context | Format | Example |
|---------|--------|---------|
| Inline comments/notes | `// TEXT` (space after //) | `// IDLE // NO TRACK` |
| Centered headers | No `//` prefix | `SELECT DECADE TO VIEW ALBUMS` |
| Footers/system notes | `// TEXT //` bookends | `// WEYLAND-YUTANI CORP //` |

See `src/components/InfoModal.jsx` for copy examples.

## Current Status

**Last verified:** 2026-11-13. The last feature work was 2025-12-22 (the access overlay on the login window, the download grid, the decade selector; plans in `claude-plans/`). Since then: a security baseline (#7, 2026-10-04) and page views counted with Vercel Web Analytics (#10, 2026-10-28). `git log` is the record.

**Ideas banked on 2025-12-21, not checked since:**
- Sentry → Slack integration
- PostHog session recording (page views now go to Vercel Web Analytics; there is no PostHog in the code)
- Live track counts during scan
- Solitaire card icon in taskbar

## Where to Find Context

| Source | What's There |
|--------|--------------|
| `claude-plans/` | Archived plans - history of what was attempted |
| `~/.claude/plans/` | Active Claude Code plans (sort by date: `ls -lt ~/.claude/plans/*.md`) |
| `~/MuxDocs/2025/Q4/Record OS/` | Session summaries, starter prompts from the mux era (Nov-Dec 2025); not on every Mac (absent on the Work Mac, 2026-11-13) |
| Recent git commits | What just changed |

## Tech Stack
- React 19, Vite, styled-components
- React95 (Windows 95 UI components)
- Spotify Web API + Web Playback SDK (PKCE auth, so Spotify sign-in needs no server)
- Three Vercel functions in `api/` for the access-request flow (request, approve, check status), backed by Neon and a Slack approve link
- Pixelarticons for icons
- Butterchurn for visualizations: `public/visualizer/index.html`, embedded by `src/components/TrippyGraphics.jsx` (`src/hooks/useButterchurn.js` is an unused earlier version)

## Dev Commands
```bash
npm run dev   # http://127.0.0.1:5173
npm run build
```

## Playwright for Visual Testing

Use one of the Playwright MCP slots (`playwright-1`, `-2` or `-3`; each keeps its own browser profile and logins, `~/DevKev/helper/MCP-SERVERS.md`). The project-only `playwright-recordos` server and its `~/.playwright-recordos/` profile no longer exist.

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
| `src/utils/spotify.js` | Spotify PKCE sign-in; the app's client id (public by design) |
| `src/utils/analytics.js` | Vercel page views: production build on the live hosts only, query and hash stripped (Spotify's sign-in code rides the callback URL) |

## Component Patterns

**Windows/Modals:** All window UI must use `WindowFrame` component. No full-screen takeovers - this is an OS, everything is a draggable window.

| Pattern | Use | Template |
|---------|-----|----------|
| `WindowFrame` | Any modal/window/dialog | Copy from `InfoModal.jsx` |

**Exception:** `GameWindow.jsx` has its own styled components (does NOT use WindowFrame) because games need iframe embedding, mobile scaling, and solitaire's full-viewport mode. Don't copy this pattern for non-game windows.

**When creating a new window:**
1. Copy structure from `InfoModal.jsx` (cleanest example)
2. Use `WindowFrame` with standard props (isActive, zIndex, position, onClose, onFocus, onDragStart, isMobile)
3. Add to `App.jsx` window management
4. Test: drag, minimize, focus, mobile

See `src/components/README.md` for component inventory.

## Games

Self-hosted in `public/games/`:
- **Minesweeper** - `public/games/minesweeper/` (simplified, mobile flagging)
- **Snake** - `public/games/snake/` (terminal UI, D-pad controls)

External (separate repo for cleaner codebase):
- **Solitaire** - `https://github.com/khglynn/wy-solo` → deployed at `retro-solitare-4recordos.vercel.app` (can modify if needed)

## Browser Quirks

Safari has CSS Grid rendering issues. The codebase has browser detection that serves different layouts. Check `Desktop.jsx` for implementation - test both Chrome and Safari when making grid changes.

## Git Workflow

`main` deploys to production (https://record-os.kevinhg.com), and GitHub refuses a direct push to it: the `protect-main` ruleset requires a pull request. So work on a branch, open a pull request, and merge it yourself (squash) once an independent review is clean, then check the live site. Nothing runs CI on a pull request here yet, so run `npm run build` before you push.

## Always-Allowed
- Running `npm run dev`, `npm run build`
- Opening and merging your own pull requests, as above
- Reading/modifying src/, public/

## Environment Variables
- `VITE_SENTRY_DSN` - (optional) Error tracking
- `NEON_DATABASE_URL`, `SLACK_WEBHOOK_URL`, `APPROVE_SECRET` - the `api/` functions (Vercel project settings)
- The Spotify client id is not an env var: it is a constant in `src/utils/spotify.js`
