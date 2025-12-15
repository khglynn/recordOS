# Access Request Window Refactor

**Created:** 2025-12-15
**Status:** Ready for tomorrow

---

## The Problem

Spotify's "Development Mode" requires every user to be manually whitelisted before they can authenticate. No workaround exists unless you're a registered business with 250k+ monthly active users.

**Translation:** Spotify's API gatekeeping means we have to build a whole access request system just so friends can use the app. Classic.

---

## What We Built (Part 1 - Complete)

✅ Neon database table for access requests
✅ API routes: `/api/request-access`, `/api/check-status`, `/api/approve`
✅ Slack webhook notifications to Kevin
✅ `AccessRequestForm.jsx` component
✅ Integration with App.jsx and LoginModal

**The backend works.** The problem is the frontend.

---

## What's Wrong

`AccessRequestForm.jsx` is a **full-screen takeover** that:
- Uses `position: fixed; z-index: 10000` to block everything
- Has its own container, terminal styling, scanline animations
- Doesn't use `WindowFrame` like every other modal
- Completely ignores that this is supposed to be an OS
- User can't see the desktop, can't interact with anything

This breaks the core metaphor. recordOS is a Windows 95-style operating system. Everything should be a window.

---

## The Fix

Refactor `AccessRequestForm` → `AccessRequestWindow`:
- Use `WindowFrame` component (like InfoModal, TrackListModal)
- Integrate with window management system (draggable, z-index, focus)
- User can see desktop behind it, interact with OS while waiting
- Fits the aesthetic and behavior of everything else

---

## Corrected User Flow

```
Unapproved user lands
  → Desktop loads (albums visible behind)
  → AccessRequestWindow opens automatically
  → User can drag window, see OS, maybe minimize and explore
  → Submits email → window shows pending state
  → Approval detected → transitions to LoginModal (or shows "proceed" button)
  → Normal Spotify OAuth flow

Approved user lands
  → Desktop loads
  → LoginModal opens (no access request needed)

Authenticated user lands
  → Full app experience
```

---

## Copy Updates

Add some flavor about Spotify's restrictions. Deadpan corporate tone.

**Window title:** `//ACCESS AUTHORIZATION`

**Status block (idle):**
```
//EXTERNAL AUTHENTICATION RESTRICTED
//SPOTIFY DEVELOPMENT MODE ACTIVE
//MANUAL CLEARANCE REQUIRED
```

**Footer note:**
```
//SPOTIFY API GATEKEEPING IN EFFECT
//CORPORATE POLICY BEYOND OUR CONTROL
//ESTIMATED WAIT: <5 MINUTES
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AccessRequestForm.jsx` | Gut and rebuild using WindowFrame. Rename to `AccessRequestWindow.jsx` |
| `src/App.jsx` | Update window management to include AccessRequestWindow. Show it first for unapproved users instead of LoginModal |

---

## Implementation Steps

### 1. Rename & Refactor Component
- Rename `AccessRequestForm.jsx` → `AccessRequestWindow.jsx`
- Replace full-screen Container with WindowFrame
- Keep the form logic (states, polling, localStorage)
- Remove custom styled Container, Terminal wrapper, scanline animation
- Use WindowFrame props: title, icon, position, zIndex, onClose, onFocus, onDragStart, isMobile

### 2. Update App.jsx Window Management
- Add `accessRequestWindow` to window state (like loginModal, infoModal)
- For unapproved users: open AccessRequestWindow instead of LoginModal
- When approved: close AccessRequestWindow, open LoginModal (or trigger auth directly)
- Handle minimize/focus like other windows

### 3. Update Copy
- Reference Spotify's limitations in the status messages
- Keep the Weyland-Yutani deadpan corporate tone
- Make it clear this isn't our fault, it's API policy

### 4. Test Flow
- New user → sees AccessRequestWindow over desktop
- Can drag window, see albums loading behind
- Submit → pending state in same window
- Approve via Slack → auto-proceeds to Spotify login
- Window behaves like all other windows in the OS

---

## Reference: WindowFrame Usage

From `InfoModal.jsx` as example:
```jsx
<WindowFrame
  title="About Record OS"
  icon="info"
  isActive={isActive}
  zIndex={zIndex}
  position={position}
  width={340}
  maxHeight="75vh"
  isMobile={isMobile}
  showMinimize={false}
  overflow="auto"
  onClose={onClose}
  onFocus={onFocus}
  onDragStart={onDragStart}
>
  {/* content */}
</WindowFrame>
```

---

## Part 2: Prevent Future Rough Implementations

### Add Component Rules to CLAUDE.md

Add section to `CLAUDE.md`:
```markdown
## Component Patterns

**Windows/Modals:** All window UI must use `WindowFrame` component. No full-screen takeovers - this is an OS, everything is a draggable window.

| Pattern | Use | Example |
|---------|-----|---------|
| WindowFrame | Any modal/window/dialog | InfoModal.jsx, SettingsModal.jsx |

**Exception:** `GameWindow.jsx` has its own styled components (does NOT use WindowFrame) because games need iframe embedding, mobile scaling, and solitaire's full-viewport mode. Don't copy this pattern for non-game windows.

**Template:** When creating a new window, copy from `InfoModal.jsx` - it's the cleanest example.
```

### Create `src/components/README.md`

Quick component inventory:
```markdown
# Components

## Window Components (use WindowFrame)
- **InfoModal** - About/credits window (cleanest template)
- **SettingsModal** - User preferences
- **TrackListModal** - Album track list
- **LoginModal** - Spotify OAuth prompt
- **AccessRequestWindow** - Access request form

## Core UI
- **Desktop** - Album grid
- **Taskbar** - Bottom bar + start menu
- **MediaPlayer** - Playback controls
- **GameWindow** - Game iframe container (⚠️ own styling, NOT WindowFrame - games are special case)

## Utilities
- **WindowFrame** - Base window wrapper (USE THIS)
- **PixelIcon** - Icon component
- **Tooltip** - Hover tooltips
- **ErrorBoundary** - Error catching

## Creating a New Window

1. Copy `InfoModal.jsx` structure
2. Use `WindowFrame` with standard props
3. Add to `App.jsx` window management
4. Test drag, minimize, focus, mobile
```

---

*"The Company requires all personnel to be registered in the central database before accessing shipboard systems. This is for your safety."*
