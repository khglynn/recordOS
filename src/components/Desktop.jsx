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

import { useEffect, useState, useMemo, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { GRID_ALBUM_MIN_SIZE, GRID_ALBUM_MAX_SIZE, GRID_GAP } from '../utils/constants';

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
  right: 0;
  bottom: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-gutter: stable; /* Reserve space for scrollbar to prevent layout shift */

  display: grid;
  /*
   * Min 225px per tile, stretch to fill row evenly.
   * On a 1200px screen: 5 columns at 240px each
   * On a 800px screen: 3 columns at 266px each
   * On a 450px screen: 2 columns at 225px each
   */
  grid-template-columns: repeat(auto-fill, minmax(${GRID_ALBUM_MIN_SIZE}px, 1fr));
  gap: ${GRID_GAP}px;
  align-content: start;

  /* Fade in when albums load */
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

/**
 * Individual album cover with entrance animation
 * Uses padding-bottom trick for reliable square aspect ratio
 */
const AlbumCover = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* Square tiles - height equals width */
  cursor: pointer;
  overflow: hidden;
  background: #0a0a0a;

  /* Entrance animation - simplified for performance */
  animation: albumReveal 0.3s ease-out backwards;
  animation-delay: ${props => props.$delay || 0}ms;

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
`;

const AlbumArtist = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AlbumStats = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  margin-top: 2px;
`;

// ============================================================================
// LOADING STATE - Glitchy grid with scanning albums
// ============================================================================

const glitchFlicker = keyframes`
  0% { opacity: 0; transform: scale(0.98); }
  8% { opacity: 0; }
  10% { opacity: 1; transform: scale(1); }
  85% { opacity: 1; transform: scale(1); }
  88% { opacity: 0.7; }
  92% { opacity: 0.9; }
  95% { opacity: 0; transform: scale(0.98); }
  100% { opacity: 0; }
`;

/**
 * Loading container - same grid lines as EmptyGrid but with scanning effect
 * Grid is positioned from top-left with calculated offset to center visually
 */
const LoadingContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  /* Grid pattern - aligned from top-left with offset passed via CSS var */
  background-image:
    linear-gradient(to right, rgba(0, 255, 65, 0.25) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 255, 65, 0.25) 1px, transparent 1px);
  background-size: ${GRID_ALBUM_MIN_SIZE + GRID_GAP}px ${GRID_ALBUM_MIN_SIZE + GRID_GAP}px;
  background-position: var(--grid-offset-x, 0) var(--grid-offset-y, 0);

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
 * Now uses CSS calc to properly center within grid cells
 */
const GlitchAlbum = styled.div`
  position: absolute;
  width: ${GRID_ALBUM_MIN_SIZE}px;
  height: ${GRID_ALBUM_MIN_SIZE}px;
  overflow: hidden;
  animation: ${glitchFlicker} ${props => props.$duration || 8}s ease-in-out infinite;
  animation-delay: ${props => props.$delay || 0}s;

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

// ============================================================================
// COMPONENT
// ============================================================================

function Desktop({ albums, loadingAlbums = [], isLoggedIn, isLoading, onAlbumClick, onOpenGame }) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [seenAlbums, setSeenAlbums] = useState(new Set());
  const [shuffleKey, setShuffleKey] = useState(0); // Forces position recalculation
  const containerRef = useRef(null);

  const handleImageLoad = (albumId) => {
    setLoadedImages(prev => new Set([...prev, albumId]));
  };

  // Shuffle album positions periodically during loading
  useEffect(() => {
    if (!isLoading || albums.length > 0) return;

    const shuffleInterval = setInterval(() => {
      setShuffleKey(k => k + 1);
    }, 4000); // Shuffle every 4 seconds

    return () => clearInterval(shuffleInterval);
  }, [isLoading, albums.length]);

  // Generate random grid positions that align with the centered grid pattern
  // The grid is centered, so we calculate the offset from center
  const glitchPositions = useMemo(() => {
    const cellSize = GRID_ALBUM_MIN_SIZE + GRID_GAP;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 48; // -48 for taskbar

    // Calculate how the centered grid aligns
    // The grid pattern starts from center, so we find the leftmost/topmost grid line
    const totalGridWidth = Math.floor(viewportWidth / cellSize) * cellSize;
    const totalGridHeight = Math.floor(viewportHeight / cellSize) * cellSize;
    const gridOffsetX = (viewportWidth - totalGridWidth) / 2;
    const gridOffsetY = (viewportHeight - totalGridHeight) / 2;

    const maxCols = Math.floor(totalGridWidth / cellSize);
    const maxRows = Math.floor(totalGridHeight / cellSize);

    // Create unique positions - avoid duplicates by using a Set
    const usedPositions = new Set();
    const positions = [];

    for (let i = 0; i < 8; i++) {
      let col, row, posKey;
      let attempts = 0;

      // Find a unique position
      do {
        col = Math.floor(Math.random() * maxCols);
        row = Math.floor(Math.random() * maxRows);
        posKey = `${col}-${row}`;
        attempts++;
      } while (usedPositions.has(posKey) && attempts < 50);

      usedPositions.add(posKey);

      positions.push({
        // Position relative to the centered grid
        x: gridOffsetX + col * cellSize,
        y: gridOffsetY + row * cellSize,
        delay: i * 1.2, // Stagger: each album appears 1.2s after previous
        duration: 6 + Math.random() * 3, // 6-9 second cycles
      });
    }

    return positions;
  }, [shuffleKey]); // Recalculate when shuffleKey changes

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

  // Loading state: show glitchy grid with user's albums streaming in
  if (isLoading && albums.length === 0) {
    // Randomly select which albums to show (different subset on each shuffle)
    const shuffledAlbums = [...loadingAlbums]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    // Calculate grid offset for centering
    const cellSize = GRID_ALBUM_MIN_SIZE + GRID_GAP;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 48;
    const totalGridWidth = Math.floor(viewportWidth / cellSize) * cellSize;
    const totalGridHeight = Math.floor(viewportHeight / cellSize) * cellSize;
    const gridOffsetX = (viewportWidth - totalGridWidth) / 2;
    const gridOffsetY = (viewportHeight - totalGridHeight) / 2;

    return (
      <DesktopContainer>
        <LoadingContainer
          style={{
            '--grid-offset-x': `${gridOffsetX}px`,
            '--grid-offset-y': `${gridOffsetY}px`,
          }}
        >
          {/* Horizontal scan line */}
          <ScanLine />

          {/* Glitching album art in random grid positions - shuffles periodically */}
          {shuffledAlbums.map((album, index) => {
            const pos = glitchPositions[index];
            if (!pos) return null;
            return (
              <GlitchAlbum
                key={`${album.id}-${shuffleKey}`}
                $delay={pos.delay}
                $duration={pos.duration}
                style={{
                  left: pos.x,
                  top: pos.y,
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

  // Post-login but no albums yet: show empty grid
  if (albums.length === 0) {
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

  return (
    <DesktopContainer>
      <AlbumGrid>
        {albums.map((album, index) => (
          <AlbumCover
            key={album.id}
            onClick={() => onAlbumClick(album)}
            className={!loadedImages.has(album.id) ? 'loading' : ''}
            $delay={getAnimationDelay(album)}
            style={seenAlbums.has(album.id) ? { animation: 'none' } : {}}
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
