# Record OS - Loading Grid Alignment Fix

## Summary

**Current issue:** Loading albums don't fit in grid squares during library scan.

**Previous fixes (completed):**
- ✅ Safari grid CSS (removed scrollbar-gutter)
- ✅ Safari cache debug logging added
- ✅ Sentry set up

---

## ISSUE: Loading Albums Don't Align to Grid

### What We Want
During library scanning:
1. Green grid lines visible in background
2. Album covers appear **inside** the grid squares (aligned to lines)
3. Albums are correctly sized (matching what final tiles will be)
4. Albums fade in/out cyclically, giving a "scanning" vibe
5. Clean transition when loading completes

### Current Behavior (Screenshot)
- Grid lines visible ✓
- Albums floating at WRONG positions ✗
- Albums wrong SIZE (don't fill squares) ✗
- Albums overlap grid lines instead of fitting inside ✗

### Root Cause Found

**Two different sizing systems:**

1. **Background grid** (`LoadingContainer` line 460):
   ```css
   background-size: 229px 229px;  /* FIXED: 225 + 4 */
   ```

2. **Album positions** (`loadingPositions` line 628):
   ```javascript
   tileWidth = (viewportWidth - totalGaps) / numColumns;  /* STRETCHED: e.g., 280px */
   ```

**The mismatch:** Background uses fixed 229px cells, but albums use stretched width (could be 280px+ depending on screen). They're completely out of sync.

---

## FIX PLAN

### Solution: Sync background grid with album positions

Pass the calculated tile size from JS to CSS, so both use the same dimensions.

### Implementation Steps

**Step 1: Calculate grid geometry once and share it**

Move the calculation to a separate useMemo that returns all needed values:
```javascript
const gridGeometry = useMemo(() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - 48;
  const minTileSize = GRID_ALBUM_MIN_SIZE;
  const gap = GRID_GAP;

  const numColumns = Math.max(1, Math.floor((viewportWidth + gap) / (minTileSize + gap)));
  const totalGaps = (numColumns - 1) * gap;
  const tileWidth = (viewportWidth - totalGaps) / numColumns;

  return { tileWidth, gap, numColumns, viewportHeight };
}, []);
```

**Step 2: Pass tile size to LoadingContainer via CSS variable**

```jsx
<LoadingContainer
  style={{
    '--cell-size': `${gridGeometry.tileWidth + gridGeometry.gap}px`
  }}
>
```

**Step 3: Update LoadingContainer to use CSS variable**

```css
background-size: var(--cell-size, 229px) var(--cell-size, 229px);
```

**Step 4: Ensure album positions use same calculation**

Already done - `loadingPositions` uses same math. Just need to share the values.

### Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/Desktop.jsx` | ~613-667 | Extract grid geometry to shared useMemo |
| `src/components/Desktop.jsx` | ~449-461 | Update LoadingContainer to use CSS variable |
| `src/components/Desktop.jsx` | ~707 | Pass --cell-size to LoadingContainer |

### Visual Result

After fix:
- Background grid lines will be spaced at STRETCHED tile width (e.g., 280px)
- Album covers will be sized at STRETCHED tile width (280px)
- Albums will fit exactly inside the grid squares
- Everything aligned ✓

---

## PREVIOUS FIXES (Completed)

- ✅ Safari grid stacking - removed `scrollbar-gutter: stable`
- ✅ Cache debug logging added - `[Cache Debug]` in console
- ✅ Sentry error tracking set up
- ⏳ Safari cache persistence - needs user to test after scan completes
