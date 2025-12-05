/**
 * ============================================================================
 * TRACK LIST MODAL COMPONENT
 * ============================================================================
 *
 * Windows 95-style window showing an album's track list.
 *
 * Features:
 * - Draggable window
 * - Album art + info header
 * - Track list with liked tracks highlighted in yellow/green
 * - Play button for each track
 * - Click track to play in Media Player
 */

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Table,
  TableBody,
  TableRow,
  TableDataCell,
  TableHead,
  TableHeadCell,
  ScrollView,
} from 'react95';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  width: 450px;
  max-width: 95vw;
  max-height: 80vh;
  z-index: 1000;

  /* Dark theme */
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 20px rgba(0, 255, 65, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.5) !important;

  /* Animation */
  animation: windowAppear 0.15s ease-out;

  @keyframes windowAppear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const StyledWindowHeader = styled(WindowHeader)`
  background: ${props => props.$active
    ? 'linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%)'
    : 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)'} !important;
  color: ${props => props.$active ? '#00ff41' : '#4a4a4a'} !important;
  cursor: move;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 2px;
`;

const HeaderButton = styled(Button)`
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;

  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
  color: #00ff41 !important;
  border-color: #4a4a4a !important;

  &:hover {
    background: linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%) !important;
  }
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const AlbumHeader = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #0d0d0d;
  border-bottom: 1px solid #2a2a2a;
`;

const AlbumArt = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border: 2px solid #2a2a2a;
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
`;

const AlbumInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
`;

const AlbumName = styled.h2`
  font-size: 16px;
  font-weight: bold;
  color: #00ff41;
  margin: 0;
  text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ArtistName = styled.p`
  font-size: 12px;
  color: rgba(0, 255, 65, 0.7);
  margin: 0;
`;

const AlbumMeta = styled.p`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  margin: 4px 0 0;
`;

const PlayAllButton = styled(Button)`
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 11px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
  }
`;

const TrackListContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: 8px;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 14px;
  }

  &::-webkit-scrollbar-track {
    background: #0d0d0d;
  }

  &::-webkit-scrollbar-thumb {
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
  }
`;

const StyledTable = styled(Table)`
  width: 100%;
  background: transparent !important;
`;

const StyledTableHead = styled(TableHead)`
  background: #0d0d0d !important;
`;

const StyledHeadCell = styled(TableHeadCell)`
  background: #0d0d0d !important;
  color: rgba(0, 255, 65, 0.6) !important;
  font-size: 10px;
  padding: 6px 8px !important;
  border-bottom: 1px solid #2a2a2a !important;
`;

const StyledRow = styled(TableRow)`
  background: ${props => props.$isLiked
    ? 'rgba(0, 255, 65, 0.1)'
    : 'transparent'} !important;
  cursor: pointer;

  &:hover {
    background: rgba(0, 255, 65, 0.15) !important;
  }

  /* Highlight currently playing */
  ${props => props.$isPlaying && `
    background: rgba(0, 255, 65, 0.25) !important;

    td {
      color: #00ff41 !important;
    }
  `}
`;

const StyledCell = styled(TableDataCell)`
  background: transparent !important;
  color: ${props => props.$isLiked
    ? '#00ff41'
    : 'rgba(0, 255, 65, 0.7)'} !important;
  font-size: 11px;
  padding: 8px !important;
  border-bottom: 1px solid #1a1a1a !important;
`;

const TrackNumber = styled.span`
  color: rgba(0, 255, 65, 0.4);
  width: 24px;
  display: inline-block;
`;

const TrackName = styled.span`
  font-weight: ${props => props.$isLiked ? 'bold' : 'normal'};
`;

const LikedIcon = styled.span`
  color: #00ff41;
  font-size: 10px;
  margin-left: 6px;
`;

const Duration = styled.span`
  color: rgba(0, 255, 65, 0.5);
  font-size: 10px;
`;

const PlayButton = styled.button`
  background: transparent;
  border: none;
  color: #00ff41;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 12px;
  opacity: 0.5;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
  }
`;

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function TrackListModal({
  album,
  isActive,
  currentTrackId,
  onClose,
  onMinimize,
  onFocus,
  onPlayTrack,
  onPlayAlbum,
  position,
  onDragStart,
}) {
  const headerRef = useRef(null);

  if (!album) return null;

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  return (
    <StyledWindow
      style={{
        left: position?.x ?? 100,
        top: position?.y ?? 100,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <span>💿</span>
          <span>{album.name}</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={onMinimize}>_</HeaderButton>
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        <AlbumHeader>
          <AlbumArt src={album.image} alt={album.name} />
          <AlbumInfo>
            <AlbumName>{album.name}</AlbumName>
            <ArtistName>{album.artist}</ArtistName>
            <AlbumMeta>
              {album.releaseDate?.split('-')[0]} • {album.totalTracks} tracks • {album.likedTracks} liked
            </AlbumMeta>
            <PlayAllButton onClick={() => onPlayAlbum?.(album)}>
              ▶ Play Album
            </PlayAllButton>
          </AlbumInfo>
        </AlbumHeader>

        <TrackListContainer>
          <StyledTable>
            <StyledTableHead>
              <TableRow>
                <StyledHeadCell style={{ width: '40px' }}>#</StyledHeadCell>
                <StyledHeadCell>Title</StyledHeadCell>
                <StyledHeadCell style={{ width: '50px' }}>Time</StyledHeadCell>
                <StyledHeadCell style={{ width: '40px' }}></StyledHeadCell>
              </TableRow>
            </StyledTableHead>
            <TableBody>
              {album.tracks?.map((track, index) => (
                <StyledRow
                  key={track.id}
                  $isLiked={track.isLiked}
                  $isPlaying={currentTrackId === track.id}
                  onClick={() => onPlayTrack?.(track, album)}
                >
                  <StyledCell $isLiked={track.isLiked}>
                    <TrackNumber>{index + 1}</TrackNumber>
                  </StyledCell>
                  <StyledCell $isLiked={track.isLiked}>
                    <TrackName $isLiked={track.isLiked}>
                      {track.name}
                    </TrackName>
                    {track.isLiked && <LikedIcon>♥</LikedIcon>}
                  </StyledCell>
                  <StyledCell $isLiked={track.isLiked}>
                    <Duration>{formatDuration(track.duration)}</Duration>
                  </StyledCell>
                  <StyledCell $isLiked={track.isLiked}>
                    <PlayButton onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack?.(track, album);
                    }}>
                      ▶
                    </PlayButton>
                  </StyledCell>
                </StyledRow>
              ))}
            </TableBody>
          </StyledTable>
        </TrackListContainer>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default TrackListModal;
