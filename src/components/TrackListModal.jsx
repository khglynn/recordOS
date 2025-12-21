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
 *
 * Updated: 2025-12-11 - Refactored to use WindowFrame
 */

import { memo } from 'react';
import styled from 'styled-components';
import {
  Button,
  Table,
  TableBody,
  TableRow,
  TableDataCell,
  TableHead,
  TableHeadCell,
} from 'react95';
import PixelIcon from './PixelIcon';
import WindowFrame from './WindowFrame';

// ============================================================================
// STYLED COMPONENTS (Content-specific only)
// ============================================================================

const AlbumHeader = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #0d0d0d;
  border-bottom: 1px solid #2a2a2a;
`;

const AlbumArt = styled.img`
  width: 80px;
  height: 80px;
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
  font-size: 14px;
  font-weight: bold;
  color: #00ff41;
  margin: 0;
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
`;

const ArtistName = styled.p`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.7);
  margin: 0;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const AlbumMeta = styled.p`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  margin: 4px 0 0;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const PlayAllButton = styled(Button)`
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }
`;

const TrackListContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: 4px;
  min-height: 0; /* Allow flexbox shrinking */
  max-height: ${props => props.$isMobile ? 'unset' : '280px'}; /* ~10 tracks visible */

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
  padding: 4px 4px !important;
  border-bottom: 1px solid #2a2a2a !important;
  line-height: 1.2;
`;

const StyledRow = styled(TableRow)`
  background: ${props => props.$isLiked
    ? 'rgba(0, 255, 65, 0.08)'
    : 'rgba(0, 0, 0, 0.3)'} !important;
  cursor: pointer;

  &:hover {
    background: rgba(0, 255, 65, 0.18) !important;
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
    : 'rgba(0, 255, 65, 0.6)'} !important;
  font-size: 11px;
  padding: 4px 4px !important;
  border-bottom: 1px solid #1a1a1a !important;
  vertical-align: middle;
  line-height: 1.2;
`;

const TrackNumber = styled.span`
  color: rgba(0, 255, 65, 0.4);
  width: 20px;
  display: inline-block;
  font-size: 9px;
`;

const TrackName = styled.span`
  font-weight: ${props => props.$isLiked ? 'bold' : 'normal'};
  font-family: 'Consolas', 'Courier New', monospace;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
`;

const CheckIcon = styled.span`
  color: #00ff41;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
`;

const Duration = styled.span`
  color: rgba(0, 255, 65, 0.5);
  font-size: 9px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const PlayButton = styled.button`
  background: transparent;
  border: none;
  color: #00ff41;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 10px;
  opacity: 0.4;
  font-family: 'Consolas', 'Courier New', monospace;

  &:hover {
    opacity: 1;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.6);
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
  zIndex,
  currentTrackId,
  onClose,
  onMinimize,
  onFocus,
  onPlayTrack,
  onPlayAlbum,
  position,
  onDragStart,
  isMobile,
}) {
  if (!album) return null;

  return (
    <WindowFrame
      title={album.name}
      icon="disc"
      isActive={isActive}
      zIndex={zIndex}
      position={position}
      width={360}
      maxWidth="95vw"
      maxHeight="70vh"
      isMobile={isMobile}
      showMinimize={true}
      noPadding={true}
      onClose={onClose}
      onMinimize={onMinimize}
      onFocus={onFocus}
      onDragStart={onDragStart}
    >
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

      <TrackListContainer $isMobile={isMobile}>
        <StyledTable>
          <StyledTableHead>
            <TableRow>
              <StyledHeadCell style={{ width: '20px' }}></StyledHeadCell>
              <StyledHeadCell style={{ width: '28px' }}>#</StyledHeadCell>
              <StyledHeadCell>Title</StyledHeadCell>
              <StyledHeadCell style={{ width: '44px' }}>Time</StyledHeadCell>
              <StyledHeadCell style={{ width: '28px' }}></StyledHeadCell>
            </TableRow>
          </StyledTableHead>
          <TableBody>
            {album.tracks?.map((track) => (
              <StyledRow
                key={track.id}
                $isLiked={track.isLiked}
                $isPlaying={currentTrackId === track.id}
                onClick={() => onPlayTrack?.(track, album)}
              >
                <StyledCell $isLiked={track.isLiked}>
                  <CheckIcon>
                    {track.isLiked && <PixelIcon name="check" size={12} />}
                  </CheckIcon>
                </StyledCell>
                <StyledCell $isLiked={track.isLiked}>
                  <TrackNumber>{track.trackNumber}</TrackNumber>
                </StyledCell>
                <StyledCell $isLiked={track.isLiked}>
                  <TrackName $isLiked={track.isLiked}>
                    {track.name}
                  </TrackName>
                </StyledCell>
                <StyledCell $isLiked={track.isLiked}>
                  <Duration>{formatDuration(track.duration)}</Duration>
                </StyledCell>
                <StyledCell $isLiked={track.isLiked}>
                  <PlayButton onClick={(e) => {
                    e.stopPropagation();
                    onPlayTrack?.(track, album);
                  }}>
                    <PixelIcon name="play" size={10} />
                  </PlayButton>
                </StyledCell>
              </StyledRow>
            ))}
          </TableBody>
        </StyledTable>
      </TrackListContainer>
    </WindowFrame>
  );
}

export default memo(TrackListModal);
