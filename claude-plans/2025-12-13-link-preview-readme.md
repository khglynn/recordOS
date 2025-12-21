# Link Preview & README Refresh

**Created:** 2025-12-13
**Status:** Nearly complete - README rewrite remaining

## Progress
- ✅ OG image created (`public/og-image.png`)
- ✅ Meta tags added to `index.html`
- ✅ Screenshots captured: `readme-desktop.png`, `readme-mobile.png`, `readme-features.png`
- ✅ ROADMAP.md and COMPLETED.md created
- ⏳ README.md rewrite - NEXT

---

## Summary

Create a proper link sharing preview (OG/Twitter Card meta tags + custom image) and rewrite the GitHub README to match recordOS's deadpan corporate system voice.

---

## Part 1: Link Preview Setup

### 1.1 Create Preview Image (Screenshot Approach)

**Goal:** Logo on dark album grid background

**Method:** Create styled HTML page → screenshot with Playwright at 1200x630

**Steps:**
1. Create `og-preview.html` with:
   - Dark background (`#0a0a0a`)
   - Faded album grid pattern (CSS grid with placeholder squares)
   - Centered logo (`public/logo.png`)
   - "RECORD OS" text in Matrix green below logo
   - Viewport set to 1200x630
2. Open in Playwright, take screenshot
3. Save as `public/og-image.png`
4. Delete temporary HTML file

**Output:** `public/og-image.png` (1200x630px)

### 1.2 Add Meta Tags to index.html

**File:** `index.html`

Add after existing meta tags:

```html
<!-- Primary Meta Tags -->
<meta name="description" content="//AUDIO VISUALIZATION TERMINAL //ALBUM CATALOGING SYSTEM //REQUIRES SPOTIFY PREMIUM">

<!-- Open Graph / Facebook / Discord / Slack -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://record-os.kevinhg.com/">
<meta property="og:title" content="RECORD OS">
<meta property="og:description" content="//AUDIO VISUALIZATION TERMINAL //ALBUM CATALOGING SYSTEM //REQUIRES SPOTIFY PREMIUM">
<meta property="og:image" content="https://record-os.kevinhg.com/og-image.png">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="https://record-os.kevinhg.com/">
<meta name="twitter:title" content="RECORD OS">
<meta name="twitter:description" content="//AUDIO VISUALIZATION TERMINAL //ALBUM CATALOGING SYSTEM //REQUIRES SPOTIFY PREMIUM">
<meta name="twitter:image" content="https://record-os.kevinhg.com/og-image.png">

<!-- Theme color for browser chrome -->
<meta name="theme-color" content="#00ff41">
```

---

## Part 2: App Screenshots for README

### 2.1 Screenshots to Capture

Using `playwright-recordos` to capture the live app at dev.record-os.kevinhg.com:

| Screenshot | What to Capture | Size |
|------------|-----------------|------|
| `readme-desktop.png` | Desktop view with album grid loaded | Full viewport (~1200px wide) |
| `readme-player.png` | Media player open with album playing | Focus on player window |
| `readme-mobile.png` | Mobile view of album grid | 375px wide viewport |

**Process:**
1. Open dev.record-os.kevinhg.com in Playwright
2. Wait for albums to load
3. Capture desktop screenshot
4. Click album to open player, capture player screenshot
5. Resize to mobile (375px), capture mobile screenshot
6. Save to `public/readme/` folder

### 2.2 Screenshot Styling

Consider adding subtle border/shadow in README markdown:
```markdown
<img src="public/readme/readme-desktop.png" alt="recordOS desktop view" width="800">
```

Or use GitHub's native image sizing.

---

## Part 3: README Rewrite

**File:** `README.md`

**Structure:** Hybrid approach - in-character intro, practical setup sections

### Proposed Structure

```
# RECORD OS

[OG preview image or hero screenshot]

//AUDIO VISUALIZATION TERMINAL
//SYSTEM BUILD 3.0.48 //STABLE

[In-character 2-3 line description of what it does]

---

## VISUAL INTERFACE
[Screenshots section - desktop, player, mobile]

## SYSTEM CAPABILITIES
[Feature list in system-speak]

## OPERATIONAL REQUIREMENTS
[Prerequisites - Spotify Premium, Node 18+, etc.]

## INITIALIZATION PROTOCOL
[Standard setup steps but with flavor]

## SYSTEM ARCHITECTURE
[Project structure - can be more standard]

## DEPLOYMENT SEQUENCE
[Build & deploy commands]

## SYSTEM ADMINISTRATOR
[Credits/author - Kevin's info]

## LICENSING
[MIT]

---

// WEYLAND-YUTANI CORP // BUILDING BETTER WORLDS //
```

### Copy Style Reference

From InfoModal.jsx:
- No periods at end of statements
- `//` prefix for descriptive lines
- UPPERCASE headers
- Terms: "SYSTEM ADMINISTRATOR" not "Author", "INITIALIZATION" not "Setup"
- Self-aware system voice
- Matrix green (`#00ff41`) in any badges

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add OG/Twitter meta tags |
| `public/og-image.png` | **NEW** - Preview image for link sharing (1200x630) |
| `public/readme/readme-desktop.png` | **NEW** - Desktop screenshot |
| `public/readme/readme-player.png` | **NEW** - Player screenshot |
| `public/readme/readme-mobile.png` | **NEW** - Mobile screenshot |
| `README.md` | Full rewrite with hybrid tone + screenshots |

---

## Order of Operations

1. Create styled HTML for OG image
2. Screenshot at 1200x630 → save as `public/og-image.png`
3. Add meta tags to `index.html`
4. Capture app screenshots with Playwright:
   - Navigate to dev.record-os.kevinhg.com
   - Capture desktop view (albums loaded)
   - Click album, capture player view
   - Resize to mobile, capture mobile view
   - Save to `public/readme/`
5. Rewrite `README.md` with:
   - Hybrid tone (in-character intro + practical sections)
   - Screenshots embedded
   - VISUAL INTERFACE section with all 3 screenshots
6. Build to verify
7. Push to dev
8. Test link preview at https://www.opengraph.xyz/
