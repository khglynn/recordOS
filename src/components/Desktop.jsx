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

import { useEffect, useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { GRID_ALBUM_MIN_SIZE, GRID_ALBUM_MAX_SIZE, GRID_GAP } from '../utils/constants';

// Sample album art URLs for loading animation
const SAMPLE_ALBUM_ART = [
  'https://i.scdn.co/image/ab67616d0000b2732c5b24ecfa39523a75c993c4', // Queen
  'https://i.scdn.co/image/ab67616d0000b273c8a11e48c91a982d086afc69', // Michael Jackson
  'https://i.scdn.co/image/ab67616d0000b273e3e3b64cea45265469d4cafa', // Motown
  'https://i.scdn.co/image/ab67616d0000b27384243a01af3c77b56f4b6e3e', // The Beatles
  'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0', // Prince
  'https://i.scdn.co/image/ab67616d0000b273a7865e686c36a4adda6c9978', // Elton John
];

const GAME_LINKS = [
  { icon: '[ MINESWEEPER ]', type: 'minesweeper' },
  { icon: '[ SNAKE ]', type: 'snake' },
];

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
 * Edge-to-edge album grid, tiles stretch to fill screen width
 */
const AlbumGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;

  display: grid;
  /* Edge-to-edge: tiles stretch between min and max size to fill screen */
  grid-template-columns: repeat(auto-fill, minmax(${GRID_ALBUM_MIN_SIZE}px, 1fr));
  gap: 0;
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
 * Uses aspect-ratio to maintain square shape with flexible width
 */
const AlbumCover = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1; /* Square tiles */
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

  /* Album art */
  img {
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

// Loading grid animations - simplified for performance
const glitchIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const glitchOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const scanPulse = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
`;

const LoadingGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;

  display: grid;
  /* Match album grid sizing - edge to edge */
  grid-template-columns: repeat(auto-fill, minmax(${GRID_ALBUM_MIN_SIZE}px, 1fr));
  gap: 0;
  align-content: start;
`;

const LoadingCell = styled.div`
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #0a0a0a;
  border: 1px solid rgba(0, 255, 65, 0.2);
  position: relative;
  overflow: hidden;

  /* Scanning effect - optimized: CSS-only, no per-cell delay */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 255, 65, 0.08) 45%,
      rgba(0, 255, 65, 0.12) 50%,
      rgba(0, 255, 65, 0.08) 55%,
      transparent 100%
    );
    animation: scanLoad 2s ease-in-out infinite;
    /* Removed per-cell delay - single unified scan is more performant */
  }

  @keyframes scanLoad {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
`;

const GlitchContent = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${props => props.$visible ? glitchIn : glitchOut} 0.3s ease-out forwards;
  /* Removed CRT overlay from loading cells for performance */
`;

const GlitchImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Removed filter for performance */
`;

const GameLink = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 10px;
  color: #00ff41;
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.5);
  letter-spacing: 1px;
  text-align: center;
  animation: ${scanPulse} 2s ease-in-out infinite;
  cursor: pointer;
  padding: 8px;

  &:hover {
    color: #00ff41;
    text-shadow: 0 0 12px rgba(0, 255, 65, 0.8);
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function Desktop({ albums, isLoggedIn, isLoading, onAlbumClick, onOpenGame }) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [seenAlbums, setSeenAlbums] = useState(new Set());
  const [cellStates, setCellStates] = useState({});

  const handleImageLoad = (albumId) => {
    setLoadedImages(prev => new Set([...prev, albumId]));
  };

  // Generate random grid content for loading state
  const GRID_CELL_COUNT = 72; // Match target album count
  const loadingCells = useMemo(() => {
    return Array.from({ length: GRID_CELL_COUNT }, (_, i) => {
      const rand = Math.random();
      if (rand < 0.15) {
        // 15% chance: game link
        const game = GAME_LINKS[Math.floor(Math.random() * GAME_LINKS.length)];
        return { type: 'game', game, id: i };
      } else if (rand < 0.35) {
        // 20% chance: album art preview
        const art = SAMPLE_ALBUM_ART[Math.floor(Math.random() * SAMPLE_ALBUM_ART.length)];
        return { type: 'album', art, id: i };
      } else {
        // 65% chance: empty scanning cell
        return { type: 'empty', id: i };
      }
    });
  }, []);

  // Randomly toggle cell visibility for glitch effect
  // Optimized: longer interval, fewer state updates
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setCellStates(prev => {
        const newStates = { ...prev };
        // Toggle 2-3 random cells each interval (reduced from 3-5)
        const toggleCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < toggleCount; i++) {
          const cellIndex = Math.floor(Math.random() * GRID_CELL_COUNT);
          const cell = loadingCells[cellIndex];
          if (cell.type !== 'empty') {
            newStates[cellIndex] = !prev[cellIndex];
          }
        }
        return newStates;
      });
    }, 1200); // Increased from 800ms to 1200ms

    return () => clearInterval(interval);
  }, [isLoading, loadingCells]);

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

  // Loading state: show glitchy grid with game links and album previews
  if (isLoading && albums.length === 0) {
    return (
      <DesktopContainer>
        <LoadingGrid>
          {loadingCells.map((cell, index) => (
            <LoadingCell key={cell.id}>
              {cell.type === 'game' && (
                <GlitchContent $visible={cellStates[index] !== false}>
                  <GameLink onClick={() => onOpenGame?.(cell.game.type)}>
                    {cell.game.icon}
                  </GameLink>
                </GlitchContent>
              )}
              {cell.type === 'album' && (
                <GlitchContent $visible={cellStates[index] !== false}>
                  <GlitchImage src={cell.art} alt="" />
                </GlitchContent>
              )}
            </LoadingCell>
          ))}
        </LoadingGrid>
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
  // Calculate staggered delay for new albums (only animate unseen ones)
  // Optimized: max delay cap to prevent long animation chains
  const getAnimationDelay = (album, index) => {
    if (seenAlbums.has(album.id)) return 0; // Already seen, no delay
    // Find position among new albums for stagger effect
    const newAlbums = albums.filter(a => !seenAlbums.has(a.id));
    const newIndex = newAlbums.findIndex(a => a.id === album.id);
    // Cap at 500ms total animation time, reduce stagger
    return Math.min(newIndex * 15, 500);
  };

  return (
    <DesktopContainer>
      <AlbumGrid>
        {albums.map((album, index) => (
          <AlbumCover
            key={album.id}
            onClick={() => onAlbumClick(album)}
            className={!loadedImages.has(album.id) ? 'loading' : ''}
            $delay={getAnimationDelay(album, index)}
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
            </AlbumInfo>
          </AlbumCover>
        ))}
      </AlbumGrid>
    </DesktopContainer>
  );
}

export default Desktop;
