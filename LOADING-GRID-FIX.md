# Loading Grid Alignment Fix

## The Problem

During library scanning, loading album previews weren't fitting inside the grid squares. Albums appeared at wrong positions, wrong sizes, and overlapped the grid lines instead of fitting cleanly inside.

**Screenshot showed:**
- Grid lines visible (good)
- Albums floating at WRONG positions
- Albums wrong SIZE (didn't fill squares)
- Albums overlapped grid lines

## Root Cause

Two different sizing systems were fighting each other:

### 1. Background Grid (CSS)
```css
/* LoadingContainer in Desktop.jsx */
background-size: 229px 229px;  /* FIXED size: 225 + 4 */
```

### 2. Album Positions (JavaScript)
```javascript
/* loadingGrid useMemo in Desktop.jsx */
const tileWidth = (viewportWidth - totalGaps) / numColumns;  /* STRETCHED: e.g., 280px */
```

**The mismatch:** The background grid used a fixed 229px cell size, but album positions used a stretched width calculated dynamically (could be 280px+ depending on screen width). They were completely out of sync.

## The Fix

Pass the calculated tile size from JavaScript to CSS, so both use the same dimensions.

### Step 1: Update LoadingContainer to use CSS variable

```css
/* Before */
background-size: 229px 229px;

/* After */
background-size: var(--cell-size, 229px) var(--cell-size, 229px);
```

### Step 2: Calculate grid geometry and return cellSize

```javascript
const loadingGrid = useMemo(() => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight - 48;
  const minTileSize = GRID_ALBUM_MIN_SIZE;  // 225
  const gap = GRID_GAP;  // 4

  const numColumns = Math.max(1, Math.floor((viewportWidth + gap) / (minTileSize + gap)));
  const totalGaps = (numColumns - 1) * gap;
  const tileWidth = (viewportWidth - totalGaps) / numColumns;

  // This is the key: cellSize syncs background grid with album positions
  const cellSize = tileWidth + gap;

  // ... build positions array ...

  return { positions, cellSize };
}, []);
```

### Step 3: Pass cellSize to LoadingContainer via CSS variable

```jsx
const { positions, cellSize } = loadingGrid;

return (
  <LoadingContainer style={{ '--cell-size': `${cellSize}px` }}>
    {/* albums positioned using same tileWidth */}
  </LoadingContainer>
);
```

## Key Files Modified

| File | Change |
|------|--------|
| `src/components/Desktop.jsx` | Updated `LoadingContainer` to use `var(--cell-size)`, renamed `loadingPositions` to `loadingGrid`, pass CSS variable to container |

## Result

- Background grid lines now spaced at STRETCHED tile width (e.g., 280px)
- Album covers sized at STRETCHED tile width (280px)
- Albums fit exactly inside the grid squares
- Everything aligned

## Key Insight

When you have CSS styling (background-size) that needs to match JavaScript calculations (album positioning), use CSS variables to sync them. Calculate once in JS, pass to CSS via inline style `--custom-property`.
