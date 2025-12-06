/**
 * ============================================================================
 * MEDIA PLAYER COMPONENT
 * ============================================================================
 *
 * Compact Windows Media Player-style music player window.
 *
 * Features:
 * - Draggable window
 * - Album art + track info display
 * - Transport controls (play, pause, prev, next, seek)
 * - Volume control
 *
 * Handles both:
 * - Local audio playback (pre-login demo tracks)
 * - Spotify Web Playback SDK (post-login)
 */

import { useRef, memo } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  width: 320px;
  max-width: 95vw;
  z-index: ${props => props.$zIndex || 1000};

  /* Dark theme */
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 20px rgba(0, 255, 65, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.5) !important;

  animation: windowAppear 0.15s ease-out;

  @keyframes windowAppear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  /* Mobile: full screen */
  ${props => props.$isMobile && `
    width: 100vw !important;
    max-width: 100vw !important;
    height: calc(100vh - 44px) !important;
    left: 0 !important;
    top: 0 !important;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  `}
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
  background: #0a0a0a !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
`;

/* Now Playing Display - compact like Windows Media Player */
const NowPlayingArea = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #0d0d0d;
  border-bottom: 1px solid #2a2a2a;
`;

const AlbumArt = styled.img`
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid rgba(0, 255, 65, 0.3);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
`;

const AlbumArtPlaceholder = styled.div`
  width: 64px;
  height: 64px;
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 255, 65, 0.3);
  flex-shrink: 0;
`;

const TrackInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TrackTitle = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #00ff41;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
`;

const TrackArtist = styled.div`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
`;

const TrackAlbum = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const IdleMessage = styled.div`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.5);
`;

/* Transport Controls */
const TransportArea = styled.div`
  background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
  padding: 12px 16px;
  border-top: 1px solid #2a2a2a;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const TimeDisplay = styled.span`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.7);
  font-family: 'Consolas', monospace;
  min-width: 40px;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 8px;
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 2px;
  cursor: pointer;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00ff41, #00cc33);
  border-radius: 1px;
  transition: width 0.1s linear;
  box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TransportButtons = styled.div`
  display: flex;
  gap: 4px;
`;

const TransportButton = styled(Button)`
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  font-size: 14px;

  background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%) !important;
  color: #00ff41 !important;
  border-color: #3a3a3a !important;

  &:hover {
    background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Play button special styling */
  ${props => props.$isPlay && `
    min-width: 40px;
    background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
    border-color: #00ff41 !important;

    &:hover {
      background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
    }
  `}
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VolumeIcon = styled.span`
  font-size: 14px;
  cursor: pointer;
  color: #00ff41;
  opacity: ${props => props.$muted ? 0.3 : 1};
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    background: #00ff41;
    border-radius: 2px;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
  }
`;


// ============================================================================
// HELPERS
// ============================================================================

function formatTime(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function MediaPlayer({
  isActive,
  zIndex,
  isPlaying,
  currentTrack,
  position,
  duration,
  volume,
  isMuted,
  onClose,
  onMinimize,
  onFocus,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onOpenVisualizer,
  windowPosition,
  onDragStart,
  isMobile,
}) {
  const headerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newPosition = percent * duration;
    onSeek?.(newPosition);
  };

  const progressPercent = duration ? (position / duration) * 100 : 0;

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      style={isMobile ? {} : {
        left: windowPosition?.x ?? 150,
        top: windowPosition?.y ?? 150,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name="music" size={14} />
          <span>Media Player</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={onMinimize}>_</HeaderButton>
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        {/* Now Playing - compact display */}
        <NowPlayingArea>
          {currentTrack?.albumArt ? (
            <AlbumArt src={currentTrack.albumArt} alt={currentTrack.album} />
          ) : (
            <AlbumArtPlaceholder>
              <PixelIcon name="music" size={24} />
            </AlbumArtPlaceholder>
          )}
          <TrackInfo>
            {currentTrack ? (
              <>
                <TrackTitle>{currentTrack.name}</TrackTitle>
                <TrackArtist>{currentTrack.artist}</TrackArtist>
                <TrackAlbum>{currentTrack.album}</TrackAlbum>
              </>
            ) : (
              <IdleMessage>IDLE // NO TRACK</IdleMessage>
            )}
          </TrackInfo>
        </NowPlayingArea>

        <TransportArea>
          {/* Progress bar */}
          <ProgressRow>
            <TimeDisplay>{formatTime(position)}</TimeDisplay>
            <ProgressBar onClick={handleProgressClick}>
              <ProgressFill style={{ width: `${progressPercent}%` }} />
            </ProgressBar>
            <TimeDisplay>{formatTime(duration)}</TimeDisplay>
          </ProgressRow>

          {/* Controls */}
          <ControlsRow>
            <TransportButtons>
              <TransportButton onClick={onPrevious}>
                <PixelIcon name="prev" size={14} />
              </TransportButton>
              <TransportButton
                $isPlay
                onClick={isPlaying ? onPause : onPlay}
              >
                <PixelIcon name={isPlaying ? "pause" : "play"} size={14} />
              </TransportButton>
              <TransportButton onClick={onNext}>
                <PixelIcon name="next" size={14} />
              </TransportButton>
              {/* Visualizer button */}
              <TransportButton onClick={onOpenVisualizer} title="Visualizer">
                <PixelIcon name="sparkles" size={14} />
              </TransportButton>
            </TransportButtons>

            <VolumeControl>
              <VolumeIcon
                $muted={isMuted}
                onClick={onMuteToggle}
              >
                <PixelIcon name={isMuted || volume === 0 ? "volumeMute" : "volume"} size={14} />
              </VolumeIcon>
              <VolumeSlider
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange?.(parseInt(e.target.value))}
              />
            </VolumeControl>
          </ControlsRow>
        </TransportArea>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default memo(MediaPlayer);
