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

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { GRID_ALBUM_SIZE, GRID_GAP } from '../utils/constants';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const DesktopContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 37px; /* Leave room for taskbar */
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
  background-size: ${GRID_ALBUM_SIZE + GRID_GAP}px ${GRID_ALBUM_SIZE + GRID_GAP}px;

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

  /* Scanline overlay for CRT feel - animated! */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.1) 0px,
      rgba(0, 0, 0, 0.1) 1px,
      transparent 1px,
      transparent 3px
    );
    pointer-events: none;
    animation: scanlines 0.1s linear infinite;
  }

  @keyframes scanlines {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 0 3px;
    }
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
 */
const AlbumGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  padding: ${GRID_GAP}px;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${GRID_ALBUM_SIZE}px, 1fr));
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
 */
const AlbumCover = styled.div`
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  overflow: hidden;
  background: #0a0a0a;

  /* Entrance animation - glitchy matrix-style reveal */
  animation: albumGlitch 0.35s ease-out backwards;
  animation-delay: ${props => props.$delay || 0}ms;

  @keyframes albumGlitch {
    0% {
      opacity: 0;
      filter: brightness(2) saturate(0) contrast(1.5);
      clip-path: inset(0 100% 0 0);
    }
    30% {
      opacity: 1;
      filter: brightness(1.5) saturate(0.5) contrast(1.2);
      clip-path: inset(0 50% 0 0);
    }
    60% {
      filter: brightness(1.2) saturate(0.8);
      clip-path: inset(0 20% 0 0);
    }
    100% {
      opacity: 1;
      filter: brightness(1) saturate(1) contrast(1);
      clip-path: inset(0 0 0 0);
    }
  }

  /* Album art */
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease, filter 0.2s ease;
  }

  /* Hover effect - subtle glow and scale */
  &:hover img {
    transform: scale(1.05);
    filter: brightness(1.1);
  }

  &:hover::after {
    opacity: 1;
  }

  /* Green border glow on hover */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid rgba(0, 255, 65, 0.5);
    box-shadow:
      inset 0 0 10px rgba(0, 255, 65, 0.3),
      0 0 10px rgba(0, 255, 65, 0.2);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
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
    rgba(0, 0, 0, 0.7) 30%,
    rgba(0, 0, 0, 0.95) 100%
  );
  opacity: 0;
  transition: opacity 0.15s ease;
  font-family: 'Consolas', 'Courier New', monospace;

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

const TrackCount = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.9);
  color: #00ff41;
  font-size: 12px;
  font-weight: bold;
  font-family: 'Consolas', 'Courier New', monospace;
  padding: 3px 6px;
  border-radius: 0;
  border: 1px solid rgba(0, 255, 65, 0.5);
  box-shadow:
    0 0 4px rgba(0, 255, 65, 0.3),
    inset 0 0 2px rgba(0, 255, 65, 0.1);
  text-shadow: 0 0 4px rgba(0, 255, 65, 0.5);
  letter-spacing: 0.5px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function Desktop({ albums, isLoggedIn, onAlbumClick }) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [seenAlbums, setSeenAlbums] = useState(new Set());

  const handleImageLoad = (albumId) => {
    setLoadedImages(prev => new Set([...prev, albumId]));
  };

  useEffect(() => {
    const newIds = albums.map(a => a.id).filter(id => !seenAlbums.has(id));
    if (newIds.length > 0) {
      const timer = setTimeout(() => {
        setSeenAlbums(prev => new Set([...prev, ...newIds]));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [albums, seenAlbums]);

  // If not logged in or no albums, show the empty grid
  if (!isLoggedIn || albums.length === 0) {
    return (
      <DesktopContainer>
        <EmptyGrid />
      </DesktopContainer>
    );
  }

  // Show album grid
  // Calculate staggered delay for new albums (only animate unseen ones)
  const getAnimationDelay = (album, index) => {
    if (seenAlbums.has(album.id)) return 0; // Already seen, no delay
    // Find position among new albums for stagger effect
    const newAlbums = albums.filter(a => !seenAlbums.has(a.id));
    const newIndex = newAlbums.findIndex(a => a.id === album.id);
    return newIndex * 30; // 30ms stagger between each new album
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
            <TrackCount>{album.likedTracks}</TrackCount>
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
