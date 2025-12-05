# Record OS - Next Steps for Kevin

## Current Status

Record OS v3 is built with:
- Windows 95 UI with grungy Matrix aesthetic
- Spotify OAuth (PKCE flow - no server needed)
- Album grid showing your most-loved albums
- Media Player with visualizations (ready for Butterchurn)
- Games via iframes
- Keyboard shortcuts (Space, arrows, M, Esc)
- Error boundaries with Win95 BSOD fallback
- Sentry error tracking (needs your DSN)

---

## Setup Sentry Error Tracking (10 min)

This will notify you when users hit errors in production.

### Steps:

1. **Create Sentry Account**
   - Go to https://sentry.io/signup/
   - Sign up (free tier: 5,000 errors/month)

2. **Create a Project**
   - Click "Create Project"
   - Select **React** as platform
   - Name it "record-os" or similar
   - Click "Create Project"

3. **Get Your DSN**
   - After creating, you'll see a DSN like:
     ```
     https://abc123@o456.ingest.sentry.io/789
     ```
   - Copy this DSN

4. **Add to Vercel Environment Variables**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add new variable:
     - Name: `VITE_SENTRY_DSN`
     - Value: (paste your DSN)
     - Environments: Production, Preview

5. **Redeploy**
   - Push any commit or trigger a redeploy
   - Sentry will now capture all production errors

### What You'll See in Sentry:
- Error stack traces
- User context (Spotify username, not email)
- Breadcrumbs showing what user did before error
- Email/Slack notifications for new issues

---

## Optional: Add PostHog for Session Recordings

If you want to see what users actually do (like Hotjar):

1. Go to https://posthog.com (free tier generous)
2. Create account and project
3. Install: `npm install posthog-js`
4. Initialize in main.jsx with your API key
5. Get session recordings, heatmaps, and analytics

This is lower priority than Sentry - add later if needed.

---

## Vercel Deployment Checklist

Before deploying:

- [ ] Update Spotify Dashboard redirect URIs:
  - Add: `https://your-domain.vercel.app/callback`

- [ ] Set Vercel environment variables:
  - `VITE_SENTRY_DSN` (from Sentry)

- [ ] Test login flow on production URL

---

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Left Arrow | Previous track |
| Right Arrow | Next track |
| Up Arrow | Volume up |
| Down Arrow | Volume down |
| M | Mute/unmute |
| Escape | Close window / Close start menu |

---

## Known Issues / Future Work

1. **Visualizer** - Butterchurn is installed but not integrated yet
2. **Mobile** - Not optimized for mobile (desktop-first)
3. **Accessibility** - Basic support, could be improved
4. **Offline** - No offline support (requires Spotify connection)

---

## File Structure Quick Reference

```
src/
├── components/
│   ├── Desktop.jsx       # Album grid background
│   ├── Taskbar.jsx       # Bottom taskbar
│   ├── StartMenu.jsx     # Start menu dropdown
│   ├── LoginModal.jsx    # Two-step auth flow
│   ├── MediaPlayer.jsx   # WMP-style player
│   ├── TrackListModal.jsx # Album tracks
│   ├── GameWindow.jsx    # Iframe games
│   ├── InfoModal.jsx     # About window
│   └── ErrorBoundary.jsx # BSOD error fallback
├── hooks/
│   ├── useSpotify.js     # All Spotify logic
│   ├── useLocalAudio.js  # Pre-login demo
│   └── useKeyboardShortcuts.js
├── utils/
│   ├── spotify.js        # Spotify API helpers
│   ├── sentry.js         # Error tracking
│   └── constants.js      # App config
└── styles/
    ├── theme.js          # React95 theme
    └── GlobalStyles.js   # Base CSS
```

---

## Questions?

Ping Claude Code to help debug, add features, or deploy!
