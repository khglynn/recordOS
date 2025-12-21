/**
 * ============================================================================
 * DESKTOP COMPONENT
 * ============================================================================
 *
 * The main background area showing either:
 * - Empty grid with subtle animation (pre-login)
 * - Album cover grid (post-login)
 *
 * Clicking an album opens the TrackList modal.
 *
 * Style: Dark with green grid lines, grungy/Alien computer aesthetic.
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { GRID_ALBUM_MIN_SIZE, GRID_ALBUM_MAX_SIZE, GRID_GAP } from '../utils/constants';

// ============================================================================
// BROWSER DETECTION
// ============================================================================

// Detect Safari - CSS Grid has issues, use flexbox instead
const isSafari = typeof navigator !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// ============================================================================
// KEYFRAMES (defined first to avoid temporal dead zone)
// ============================================================================

const scanLine = keyframes`
  0% { top: -10%; }
  100% { top: 110%; }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const DesktopContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 48px; /* Leave room for taskbar */
  overflow: hidden;
  background: #0a0a0a;
`;

/**
 * Empty grid background (pre-login state)
 * Shows a grid of squares with glitchy Matrix-style animation
 */
const EmptyGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* Grid pattern using CSS - Alien computer terminal aesthetic */
  background-image:
    /* Vertical lines */
    linear-gradient(
      to right,
      rgba(0, 255, 65, 0.3) 1px,
      transparent 1px
    ),
    /* Horizontal lines */
    linear-gradient(
      to bottom,
      rgba(0, 255, 65, 0.3) 1px,
      transparent 1px
    );

  /* Grid size matches album grid */
  background-size: ${GRID_ALBUM_MIN_SIZE + GRID_GAP}px ${GRID_ALBUM_MIN_SIZE + GRID_GAP}px;

  /* Center the grid */
  background-position: center center;

  /* Subtle pulse animation - gentle breathing effect */
  animation: gridPulse 6s ease-in-out infinite;

  @keyframes gridPulse {
    0%, 100% {
      opacity: 0.4;
    }
    25% {
      opacity: 0.55;
    }
    50% {
      opacity: 0.65;
    }
    75% {
      opacity: 0.5;
    }
  }

  /* Scanline overlay for CRT feel - subtle static effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03) 0px,
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 4px
    );
    pointer-events: none;
    /* Removed animation - static scanlines are more subtle */
  }

  /* Glowing corners effect - adds depth */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      transparent 50%,
      rgba(0, 255, 65, 0.03) 100%
    );
    pointer-events: none;
  }
`;

/**
 * Album grid container (post-login state)
 * Edge-to-edge album grid, tiles fill horizontally with min/max constraints
 *
 * Grid strategy:
 * - minmax(225px, 1fr) ensures tiles are at least 225px
 * - 1fr allows them to stretch to fill the row
 * - auto-fill creates as many columns as fit
 * - Result: edge-to-edge grid where tiles grow proportionally
 */
const AlbumGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100vh - 48px);
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;

  /* Fade in when albums load */
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  ${isSafari ? css`
    /* Safari: Use flexbox (CSS Grid has rendering issues) */
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: center;
  ` : css`
    /* Chrome/Firefox: Use CSS Grid for better responsiveness */
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(${GRID_ALBUM_MIN_SIZE}px, 1fr));
    gap: ${GRID_GAP}px;
    align-content: start;

    /* Mobile: smaller tiles */
    @media (max-width: 767px) {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
  `}
`;

/**
 * Individual album cover with entrance animation
 * Uses padding-bottom trick for reliable square aspect ratio
 * Uses CSS variables for animation delay (avoids styled-components class explosion)
 * Safari uses --tile-width CSS variable from parent, Chrome uses 100%
 */
const AlbumCover = styled.div`
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: #0a0a0a;

  ${isSafari ? css`
    /* Safari flexbox: explicit width via CSS variable */
    width: var(--tile-width, ${GRID_ALBUM_MIN_SIZE}px);
    padding-bottom: var(--tile-width, ${GRID_ALBUM_MIN_SIZE}px);
    margin: 0 ${GRID_GAP}px ${GRID_GAP}px 0;
  ` : css`
    /* Chrome/Firefox CSS Grid: 100% width */
    width: 100%;
    padding-bottom: 100%; /* Square tiles - height equals width */
  `}

  /* Entrance animation - uses CSS variable for delay */
  animation: albumReveal 0.3s ease-out backwards;
  animation-delay: var(--reveal-delay, 0ms);

  @keyframes albumReveal {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Album art - absolutely positioned inside padded container */
  img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* CRT scanline overlay - subtle effect */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 3px,
      rgba(0, 0, 0, 0.04) 3px,
      rgba(0, 0, 0, 0.04) 4px
    );
    pointer-events: none;
    z-index: 1;
  }

  /* Hover effect - glitchy/grungy, no smooth transitions */
  &:hover img {
    filter: brightness(1.15) contrast(1.1) saturate(1.1);
  }

  &:hover::after {
    opacity: 1;
  }

  /* Pixelated green border on hover - retro feel */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 3px solid #00ff41;
    box-shadow:
      inset 0 0 0 1px #000,
      inset 0 0 15px rgba(0, 255, 65, 0.4);
    opacity: 0;
    pointer-events: none;
    z-index: 2;
    /* Instant snap, no transition */
  }

  /* Loading state - matrix-style scan line */
  &.loading {
    background: #0a0a0a;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(0, 255, 65, 0.1) 45%,
        rgba(0, 255, 65, 0.2) 50%,
        rgba(0, 255, 65, 0.1) 55%,
        transparent 100%
      );
      animation: scanLoad 1.2s ease-in-out infinite;
    }
  }

  @keyframes scanLoad {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
`;

/**
 * Refresh overlay - glitch effect when rescanning library
 */
const RefreshOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;

  /* Horizontal scan line */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 255, 65, 0.3) 20%,
      rgba(0, 255, 65, 0.6) 50%,
      rgba(0, 255, 65, 0.3) 80%,
      transparent 100%
    );
    box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
    animation: ${scanLine} 2s linear infinite;
  }

  /* Glitch overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 4px,
      rgba(0, 255, 65, 0.02) 4px,
      rgba(0, 255, 65, 0.02) 8px
    );
    animation: glitchOverlay 0.1s infinite;
  }

  @keyframes glitchOverlay {
    0% { opacity: 0.5; }
    50% { opacity: 0.3; }
    100% { opacity: 0.5; }
  }
`;

const RefreshStatus = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  color: #00ff41;
  text-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
  letter-spacing: 3px;
  text-transform: uppercase;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 255, 65, 0.3);
  z-index: 20;
  animation: blink 0.8s ease-in-out infinite;

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

/**
 * Album info overlay (shown on hover)
 */
const AlbumInfo = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(
    transparent 0%,
    rgba(0, 0, 0, 0.8) 20%,
    rgba(0, 0, 0, 0.95) 100%
  );
  opacity: 0;
  font-family: 'Consolas', 'Courier New', monospace;
  z-index: 3;
  /* No transition - instant snap */

  ${AlbumCover}:hover & {
    opacity: 1;
  }
`;

const AlbumTitle = styled.div`
  font-size: 11px;
  font-weight: bold;
  color: #00ff41;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 0 6px rgba(0, 255, 65, 0.4);
  margin-bottom: 2px;

  /* Mobile: larger text for readability */
  @media (max-width: 767px) {
    font-size: 13px;
  }
`;

const AlbumArtist = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Mobile: larger text for readability */
  @media (max-width: 767px) {
    font-size: 12px;
  }
`;

const AlbumStats = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  margin-top: 2px;

  /* Mobile: larger text for readability */
  @media (max-width: 767px) {
    font-size: 11px;
  }
`;

// ============================================================================
// LOADING STATE - Glitchy grid with scanning albums
// ============================================================================

/**
 * Slow pulse animation - chill, visible most of the time
 * Album fades in, hangs out for a while, then fades out
 */
// Animation synced to 4-second cycle - fades in, stays, fades out before unmount
const slowPulse = keyframes`
  0% { opacity: 0; transform: scale(0.97); }
  12% { opacity: 0.85; transform: scale(1); }
  75% { opacity: 0.85; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.97); }
`;

/**
 * Simple fade in animation for loading albums
 */
const fadeIn = keyframes`
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 0.85; transform: scale(1); }
`;

/**
 * Loading container - grid lines that match the stretched album tiles
 * Uses CSS variable --cell-size to sync with calculated tile width
 */
const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* Grid pattern - uses calculated cell size passed via CSS var */
  background-image:
    linear-gradient(to right, rgba(0, 255, 65, 0.25) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 255, 65, 0.25) 1px, transparent 1px);
  background-size: var(--cell-size, 229px) var(--cell-size, 229px);
  background-position: 0 0;

  /* Brighter pulse during loading */
  animation: loadingPulse 2s ease-in-out infinite;

  @keyframes loadingPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
`;

/**
 * Horizontal scan line that sweeps down the screen
 */
const ScanLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 255, 65, 0.3) 20%,
    rgba(0, 255, 65, 0.8) 50%,
    rgba(0, 255, 65, 0.3) 80%,
    transparent 100%
  );
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0, 255, 65, 0.3);
  animation: ${scanLine} 3s linear infinite;
  pointer-events: none;
`;

/**
 * Floating album that glitches in a grid position
 * Uses CSS variables for dynamic sizing (matches CSS Grid stretched tiles)
 */
const GlitchAlbum = styled.div`
  position: absolute;
  width: var(--tile-size, ${GRID_ALBUM_MIN_SIZE}px);
  height: var(--tile-size, ${GRID_ALBUM_MIN_SIZE}px);
  overflow: hidden;
  /* 4s animation synced to state change - no loop, fades out before unmount */
  animation: ${slowPulse} 4s ease-in-out forwards;
  animation-delay: var(--delay, 0s);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.7) brightness(0.8);
  }

  /* Green tint overlay */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 255, 65, 0.1);
    mix-blend-mode: overlay;
  }

  /* Scanline effect on albums */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;
    z-index: 1;
  }
`;

/**
 * Status text overlay
 */
const LoadingStatus = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: rgba(0, 255, 65, 0.6);
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
  letter-spacing: 2px;
  text-transform: uppercase;
  pointer-events: none;
`;

/**
 * Empty library message (logged in but no liked songs)
 */
const EmptyLibraryMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  font-family: 'Consolas', 'Courier New', monospace;
  color: rgba(0, 255, 65, 0.7);
  max-width: 400px;
  padding: 20px;

  h2 {
    font-size: 16px;
    color: #00ff41;
    margin: 0 0 16px;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
  }

  p {
    font-size: 12px;
    line-height: 1.6;
    margin: 0 0 12px;
    opacity: 0.7;
  }

  .prompt {
    color: #00ff41;
  }

  a {
    color: #00ff41;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function Desktop({ albums, loadingAlbums = [], isLoggedIn, isLoading, isInitializing, onAlbumClick, onOpenGame }) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [seenAlbums, setSeenAlbums] = useState(new Set());
  // Track which slot to update next (rotating: 0, 1, 2, 3, 0, 1, 2, 3...)
  // Only 2 loading slots - simpler, no overlap possible
  const [loadingSlots, setLoadingSlots] = useState([
    { albumIndex: 0, cycle: 0 },
    { albumIndex: 1, cycle: 0 },
  ]);
  const nextSlotRef = useRef(0);
  const containerRef = useRef(null);
  const loadingAlbumsLengthRef = useRef(loadingAlbums.length);

  // Keep ref in sync with prop (so interval closure always has current value)
  useEffect(() => {
    loadingAlbumsLengthRef.current = loadingAlbums.length;
  }, [loadingAlbums.length]);

  // Rotate ONE slot every 4 seconds (slower, calmer animation)
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      const slotToUpdate = nextSlotRef.current;
      const albumCount = loadingAlbumsLengthRef.current;

      setLoadingSlots(prev => prev.map((slot, i) => {
        if (i !== slotToUpdate) return slot;
        // Jump by 2 to get a different album each time
        const newAlbumIndex = (slot.albumIndex + 2) % Math.max(2, albumCount);
        return { albumIndex: newAlbumIndex, cycle: slot.cycle + 1 };
      }));

      // Alternate between slot 0 and 1
      nextSlotRef.current = (slotToUpdate + 1) % 2;
    }, 4000); // 4 seconds per slot change (slower)

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleImageLoad = (albumId) => {
    setLoadedImages(prev => new Set([...prev, albumId]));
  };

  // Calculate grid geometry - stable (doesn't change with slots)
  const gridGeometry = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 48;
    const minTileSize = GRID_ALBUM_MIN_SIZE;
    const gap = GRID_GAP;

    const numColumns = Math.max(1, Math.floor((viewportWidth + gap) / (minTileSize + gap)));
    const totalGaps = (numColumns - 1) * gap;
    const tileWidth = (viewportWidth - totalGaps) / numColumns;
    const cellSize = tileWidth + gap;
    const rowHeight = tileWidth + gap;
    const numRows = Math.max(1, Math.floor(viewportHeight / rowHeight));

    return { numColumns, numRows, tileWidth, cellSize };
  }, []);

  // Generate position for a slot - ensures 2 slots never overlap
  // Slot 0: top-left area, Slot 1: bottom-right area
  const getSlotPosition = useCallback((slotIndex, cycle) => {
    const { numColumns, numRows, tileWidth, cellSize } = gridGeometry;

    // Predefined regions to prevent overlap
    // Slot 0: top-left quadrant, Slot 1: bottom-right quadrant
    const halfCols = Math.floor(numColumns / 2);
    const halfRows = Math.floor(numRows / 2);

    // Use cycle for variety within each slot's region
    const seed = cycle * 7 + slotIndex * 13; // Different primes for variety
    const pseudoRandom = (s) => {
      const x = Math.sin(s) * 10000;
      return x - Math.floor(x);
    };

    let col, row;
    if (slotIndex === 0) {
      // Slot 0: columns 0 to halfCols-1, rows 0 to halfRows-1
      col = Math.floor(pseudoRandom(seed) * Math.max(1, halfCols));
      row = Math.floor(pseudoRandom(seed + 1) * Math.max(1, halfRows));
    } else {
      // Slot 1: columns halfCols to end, rows halfRows to end
      col = halfCols + Math.floor(pseudoRandom(seed) * Math.max(1, numColumns - halfCols));
      row = halfRows + Math.floor(pseudoRandom(seed + 1) * Math.max(1, numRows - halfRows));
    }

    return {
      x: col * cellSize,
      y: row * cellSize,
      tileSize: tileWidth,
    };
  }, [gridGeometry]);

  useEffect(() => {
    const newIds = albums.map(a => a.id).filter(id => !seenAlbums.has(id));
    if (newIds.length > 0) {
      const timer = setTimeout(() => {
        setSeenAlbums(prev => new Set([...prev, ...newIds]));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [albums, seenAlbums]);

  // Pre-login: show empty grid
  if (!isLoggedIn) {
    return (
      <DesktopContainer>
        <EmptyGrid />
      </DesktopContainer>
    );
  }

  // Initializing: checking cache - show empty grid with subtle loading indicator
  if (isInitializing) {
    return (
      <DesktopContainer>
        <EmptyGrid />
        <LoadingStatus style={{ opacity: 0.5 }}>
          LOADING CACHE...
        </LoadingStatus>
      </DesktopContainer>
    );
  }

  // Loading state: 2 albums in separate quadrants (no overlap)
  // Each fades in/out over 4 seconds, synced to state change
  if (isLoading && albums.length === 0) {
    const { cellSize } = gridGeometry;

    return (
      <DesktopContainer>
        <LoadingContainer style={{ '--cell-size': `${cellSize}px` }}>
          {/* Horizontal scan line */}
          <ScanLine />

          {/* 2 slots: top-left and bottom-right quadrants (never overlap) */}
          {loadingSlots.map((slot, slotIndex) => {
            const album = loadingAlbums[slot.albumIndex % Math.max(1, loadingAlbums.length)];
            if (!album) return null;

            const pos = getSlotPosition(slotIndex, slot.cycle);

            return (
              <GlitchAlbum
                key={`slot-${slotIndex}-cycle-${slot.cycle}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  '--tile-size': `${pos.tileSize}px`,
                }}
              >
                <img src={album.image} alt="" />
              </GlitchAlbum>
            );
          })}

          {/* Loading status */}
          <LoadingStatus>
            SCANNING LIBRARY...
          </LoadingStatus>
        </LoadingContainer>
      </DesktopContainer>
    );
  }

  // Post-login but no albums: show empty state message
  // Only show this if we've actually completed loading (loadingAlbums was populated then cleared)
  // Otherwise just show empty grid while initial load starts
  if (albums.length === 0) {
    // If we have no loadingAlbums either, we might still be initializing - show empty grid
    if (loadingAlbums.length === 0 && !isLoading) {
      // Could be initial state before load starts, or genuinely empty library
      // Show gentle message that doesn't look like an error
      return (
        <DesktopContainer>
          <EmptyGrid />
          <EmptyLibraryMessage>
            <h2>SCAN FAILURE</h2>
            <p>
              <span className="prompt">&gt;</span> ERR_NO_TRACKS: Audio library returned null.
            </p>
            <p>
              <span className="prompt">&gt;</span> This is probably our fault.
            </p>
            <p>
              <span className="prompt">&gt;</span> Enjoy the games, or contact:
            </p>
            <p>
              <span className="prompt">&gt;</span> <a href="https://github.com/khglynn/recordOS" target="_blank" rel="noopener noreferrer">github</a> · <a href="mailto:hello@kevinhg.com">email</a> · <a href="https://kevinhg.com" target="_blank" rel="noopener noreferrer">web</a>
            </p>
          </EmptyLibraryMessage>
        </DesktopContainer>
      );
    }
    // We have loadingAlbums but no final albums - still processing
    return (
      <DesktopContainer>
        <EmptyGrid />
      </DesktopContainer>
    );
  }

  // Show album grid
  // Pre-compute animation delays for new albums (O(n) instead of O(n²))
  // Only animate unseen ones, cap at 500ms total animation time
  const newAlbumDelays = new Map();
  let newIndex = 0;
  for (const album of albums) {
    if (!seenAlbums.has(album.id)) {
      newAlbumDelays.set(album.id, Math.min(newIndex * 15, 500));
      newIndex++;
    }
  }

  const getAnimationDelay = (album) => {
    return newAlbumDelays.get(album.id) || 0;
  };

  // Determine if we're refreshing (loading while already have albums)
  const isRefreshing = isLoading && albums.length > 0;

  // Get tile width for Safari flexbox layout
  const { tileWidth } = gridGeometry;

  return (
    <DesktopContainer data-album-grid>
      <AlbumGrid style={isSafari ? { '--tile-width': `${tileWidth}px` } : undefined}>
        {albums.map((album, index) => (
          <AlbumCover
            key={album.id}
            onClick={() => onAlbumClick(album)}
            className={!loadedImages.has(album.id) ? 'loading' : ''}
            style={seenAlbums.has(album.id)
              ? { animation: 'none' }
              : { '--reveal-delay': `${getAnimationDelay(album)}ms` }
            }
          >
            <img
              src={album.image}
              alt={album.name}
              loading="lazy"
              onLoad={() => handleImageLoad(album.id)}
            />
            <AlbumInfo>
              <AlbumTitle>{album.name}</AlbumTitle>
              <AlbumArtist>{album.artist}</AlbumArtist>
              <AlbumStats>{album.likedTracks} / {album.totalTracks} saved</AlbumStats>
            </AlbumInfo>
          </AlbumCover>
        ))}
      </AlbumGrid>

      {/* Glitch overlay when rescanning library */}
      {isRefreshing && (
        <>
          <RefreshOverlay />
          <RefreshStatus>RESCANNING LIBRARY...</RefreshStatus>
        </>
      )}
    </DesktopContainer>
  );
}

export default Desktop;
