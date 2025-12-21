# Record OS Reference

Operational notes and explanations for things that aren't obvious.

---

## Access Request Flow

There are **two separate gates** for new users:

### 1. Our Database (UI State)
- Table: `access_requests` in Neon
- Controls what the user sees in the app overlay (pending vs approved)
- Updated when you click "Approve + Open Spotify" in Slack

### 2. Spotify Dashboard (Actual Access)
- URL: https://developer.spotify.com/dashboard/4b8e17e088014d58868966b640d26734/users
- Users MUST be added here for their Spotify account to work with recordOS
- Requires: Full Name + Email + click "Add user"
- Limit: 25 users in development mode

### The Flow
1. User enters email → saved to our DB as "pending"
2. Slack notification arrives with email
3. Click "Approve + Open Spotify" → our DB marks "approved", redirects to Spotify Dashboard
4. Copy email from Slack, paste into Spotify Dashboard, add user
5. User can now authenticate with Spotify

**Why both?** Our DB controls the UI feedback ("you're approved, try connecting"). Spotify's whitelist is the actual gate for API access.

---

## Grid Export Resolution

Export uses `html2canvas` to capture the album grid as PNG.

### Scale Logic
| Condition | Scale | Result |
|-----------|-------|--------|
| Safari browser | 1x | ~1200px wide |
| Large grid (>60 albums) | 1x | ~1200px wide |
| Chrome + small grid | 2x | ~2400px wide (retina) |

### Why?
- **Safari hangs** on large canvas operations at 2x scale
- **Large grids** (60+ albums) can timeout at 2x regardless of browser
- 30-second timeout prevents infinite hangs

### Export Process
1. `INIT` - Prepare capture
2. `RENDER` - Expand grid to show all albums, capture with html2canvas
3. `COMPRESS` - Convert to PNG
4. Download as `[username]_albums_[threshold]+likes_[decade].png`

### If Export Fails
- Try on Chrome instead of Safari
- Reduce album count with the threshold slider
- Check console for specific error
