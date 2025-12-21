# PostHog Integration for recordOS + eachie

**Created:** 2025-12-13
**Status:** Ready for implementation

## Scope

| Item | Status |
|------|--------|
| recordOS PostHog integration | To implement |
| eachie project rename + config | To configure |
| Slack notifications (both projects) | To configure |
| Tracking skill | To create |

## Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Session recording | Enabled | Debug UX issues |
| Autocapture | Enabled | Comprehensive click tracking |
| User ID | Spotify ID (direct) | Easy user lookup |
| **Cookieless mode** | **Enabled** | No consent banner needed |
| Consent banner | Not needed | Cookieless + login-required app |

---

## Step 0: PostHog Project Setup (Manual - Kevin via Playwright)

### Create recordOS project:
1. Go to https://us.posthog.com → Project switcher (top left)
2. Click "New project"
3. Name it **"recordOS"**
4. Copy the API key (starts with `phc_`)

### Rename existing project:
1. Switch to "Default project"
2. Settings → Project → Rename to **"eachie"**

### Set up Slack integration (for both projects):
1. Data Pipeline → Destinations → + New destination
2. Search "Slack" → Create
3. Connect Slack workspace
4. Configure two destinations per project:

**Destination 1: Error Alerts (real-time)**
- Source: Events
- Filter: `playback_error` OR `scan_failed` (recordOS) / relevant errors (eachie)
- Channel: #dev-alerts or similar
- Template: Include session replay link

**Destination 2: Daily Digest**
- Use PostHog's scheduled reports feature
- Or: Data Pipeline with daily aggregation webhook

---

## Implementation Steps

### Step 1: Install dependency
```bash
npm install posthog-js
```

### Step 2: Create `src/utils/posthog.js`
New file with:
- `initPostHog()` - initialization with session recording config
- `identifyUser(spotifyUser)` - set user identity
- `resetUser()` - clear on logout
- Event wrapper functions for each trackable event

Key config:
```javascript
posthog.init(apiKey, {
  api_host: 'https://us.i.posthog.com',

  // COOKIELESS MODE - no consent banner needed
  persistence: 'memory',  // Don't persist to cookies/localStorage

  // Autocapture
  autocapture: true,

  // Session recording (prod only)
  disable_session_recording: import.meta.env.DEV,
  session_recording: {
    maskAllInputs: true,  // Safety default
    maskTextSelector: null,  // Music data is public
  },

  // SPA - manual pageviews
  capture_pageview: false,
});
```

### Step 3: Update `src/main.jsx`
Import and call `initPostHog()` after Sentry init.

### Step 4: Update `src/hooks/useSpotify.js`
- User identification after login (~line 184)
- Library scan events (~lines 248-470)
- Playback events (~lines 856-1050)
- Logout reset (~line 1088)

### Step 5: Update `src/App.jsx`
- Window/game tracking in `openWindow()` (~line 405)
- Album click tracking in `handleAlbumClick()` (~line 679)
- Login started tracking

### Step 6: Update `src/components/SettingsModal.jsx`
- Setting change events

### Step 7: Environment Variables
Add to `.env` and Vercel:
```
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

### Step 8: Add Tracking Note to InfoModal
`src/components/InfoModal.jsx` - Add glib disclosure alongside existing privacy notes

Example copy (Weyland-Yutani tone):
```
TELEMETRY ACTIVE
This terminal logs operational data via Sentry and PostHog
Your interactions are recorded for system optimization
```

### Step 9: Create Kevin's Guide
`docs/POSTHOG-GUIDE.md` - How to use dashboard + MCP

### Step 10: Create Tracking Skill
`~/.mux/src/HG-Skills-Private/hg-skills/workflow/analytics-monitoring.md`

Skill covers:
- PostHog setup pattern (init, identify, events)
- Sentry setup pattern (errors, breadcrumbs)
- Slack integration setup
- Privacy considerations (cookieless vs consent)
- MCP tools available for both

### Step 11: Configure Slack Notifications (via Playwright)
Walk Kevin through PostHog dashboard:
1. Create Slack app connection
2. Set up error alerts destination
3. Set up daily digest (if available as built-in feature)

---

## Events to Track

| Event | Trigger | Key Properties |
|-------|---------|----------------|
| `login_started` | Click Connect button | - |
| `login_completed` | OAuth success | `spotify_product`, `spotify_country` |
| `login_failed` | OAuth error | `error_message` |
| `scan_started` | Library fetch begins | - |
| `decade_completed` | Decade finishes | `decade`, `album_count` |
| `scan_completed` | All loading done | `total_albums`, `total_tracks`, `duration_ms` |
| `scan_failed` | Error during scan | `error_message` |
| `playback_started` | Play track/album | `track_id`, `album_id`, `album_name` |
| `playback_paused` | Pause clicked | - |
| `playback_error` | SDK/playback error | `error_code`, `error_message` |
| `album_finished` | Last track ends | `album_id` |
| `game_launched` | Open game | `game` (minesweeper/snake/solitaire) |
| `window_opened` | Open window | `window_type` |
| `album_clicked` | Click album tile | `album_id`, `album_name`, `liked_tracks` |
| `setting_changed` | Change setting | `setting_name`, `setting_value` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `posthog-js` |
| `src/utils/posthog.js` | **NEW** - config + event helpers |
| `src/main.jsx` | Import + init |
| `src/hooks/useSpotify.js` | User ID + scan/playback events |
| `src/App.jsx` | Window + game + album events |
| `src/components/SettingsModal.jsx` | Setting events |
| `src/components/InfoModal.jsx` | Add tracking disclosure note |
| `.env` | PostHog keys |
| `docs/POSTHOG-GUIDE.md` | **NEW** - Kevin's guide |
| `~/.mux/src/HG-Skills-Private/hg-skills/workflow/analytics-monitoring.md` | **NEW** - Tracking skill |

## PostHog Dashboard Configuration (no code)

| Task | Where |
|------|-------|
| Create "recordOS" project | Project switcher → New |
| Rename "Default project" → "eachie" | Settings → Project |
| Connect Slack workspace | Data Pipeline → Destinations → Slack |
| Error alerts destination | Filter on error events → #channel |
| Daily digest | Subscriptions or scheduled report |

---

## Kevin's PostHog Guide (to include in docs/)

### Dashboard Usage

**Where to find things:**

| Want to see... | Go to... |
|----------------|----------|
| Live user activity | Activity → Live events |
| Session replays | Recordings → Recent |
| Event counts over time | Insights → New insight → Trends |
| User journey | Insights → New insight → Funnel |
| Individual user history | Persons → Search by Spotify ID |

**Key dashboards to create:**

1. **Core Funnel**: login_started → login_completed → scan_completed → playback_started
2. **Daily Engagement**: playback_started, album_clicked, game_launched by day
3. **Errors**: playback_error, scan_failed counts

### MCP Commands

**Query events:**
```
"Show me playback_started events from the last 7 days"
→ Uses query-run tool with TrendsQuery
```

**Check user journey:**
```
"Create a funnel from login to first playback"
→ Uses query-run with FunnelsQuery
```

**List insights:**
```
"What insights do we have for recordOS?"
→ Uses insights-get-all
```

**Create dashboard:**
```
"Create a dashboard called 'recordOS Daily'"
→ Uses dashboard-create
```

**Get specific data:**
```
"How many users played games this week?"
→ Uses query-run with filter on game_launched
```

### What You Can Ask Me (via MCP)

| Task | MCP Tool |
|------|----------|
| Run ad-hoc queries | `query-run` |
| List/create/update dashboards | `dashboard-*` |
| List/create/update insights | `insight-*` |
| Check feature flags | `feature-flag-*` |
| View errors | `list-errors`, `error-details` |
| Search docs | `docs-search` |
| List events/properties | `event-definitions-list`, `properties-list` |

### Example Queries to Try

**Daily active users:**
"How many unique users had playback_started events each day this week?"

**Conversion rate:**
"What % of users who complete a scan start playback?"

**Game popularity:**
"Which game is most played - minesweeper, snake, or solitaire?"

**Error rate:**
"How many playback_error events happened this week?"
