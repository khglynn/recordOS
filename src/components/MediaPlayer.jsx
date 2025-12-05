/**
 * ============================================================================
 * MEDIA PLAYER COMPONENT
 * ============================================================================
 *
 * Windows Media Player-style music player window.
 *
 * Features:
 * - Draggable window
 * - Visualization area (Butterchurn or fallback)
 * - Album art overlay
 * - Transport controls (play, pause, prev, next, seek)
 * - Volume control
 * - Track info display
 *
 * Handles both:
 * - Local audio playback (pre-login demo tracks)
 * - Spotify Web Playback SDK (post-login)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Slider,
} from 'react95';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  width: 400px;
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

/* Visualization Area */
const VisualizationArea = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #000;
  overflow: hidden;
`;

const VisualizerCanvas = styled.canvas`
  width: 100%;
  height: 100%;
`;

/* Fallback visualizer (CSS bars) */
const FallbackVisualizer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  padding: 20px;
`;

const VisualizerBar = styled.div`
  width: 8px;
  background: linear-gradient(180deg, #00ff41 0%, #00cc33 50%, #0a0a0a 100%);
  border-radius: 2px 2px 0 0;
  transition: height 0.1s ease;
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
`;

/* Album art overlay */
const AlbumArtOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
`;

const AlbumArt = styled.img`
  width: 80px;
  height: 80px;
  object-fit: cover;
  border: 2px solid rgba(0, 255, 65, 0.3);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
`;

const NowPlayingInfo = styled.div`
  text-align: center;
  margin-top: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`;

const TrackTitle = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #00ff41;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackArtist = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.7);
`;

/* Idle state */
const IdleState = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: rgba(0, 255, 65, 0.5);
`;

const IdleIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
`;

const IdleText = styled.div`
  font-size: 12px;
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

const NextVizButton = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 255, 65, 0.3);
  color: rgba(0, 255, 65, 0.7);
  padding: 4px 8px;
  font-size: 9px;
  cursor: pointer;
  border-radius: 2px;

  &:hover {
    background: rgba(0, 255, 65, 0.2);
    color: #00ff41;
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
  windowPosition,
  onDragStart,
  audioAnalysis,
}) {
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const [visualizerBars, setVisualizerBars] = useState(Array(20).fill(10));

  // Simple fallback visualizer animation
  useEffect(() => {
    if (!isPlaying) {
      setVisualizerBars(Array(20).fill(10));
      return;
    }

    const interval = setInterval(() => {
      setVisualizerBars(prev =>
        prev.map(() => 10 + Math.random() * 90)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

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
      style={{
        left: windowPosition?.x ?? 150,
        top: windowPosition?.y ?? 150,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <span>🎵</span>
          <span>Media Player</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={onMinimize}>_</HeaderButton>
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        <VisualizationArea>
          {/* Fallback CSS visualizer */}
          <FallbackVisualizer>
            {visualizerBars.map((height, i) => (
              <VisualizerBar
                key={i}
                style={{ height: isPlaying ? `${height}%` : '10%' }}
              />
            ))}
          </FallbackVisualizer>

          {/* Album art and track info overlay */}
          {currentTrack ? (
            <AlbumArtOverlay>
              {currentTrack.albumArt && (
                <AlbumArt src={currentTrack.albumArt} alt={currentTrack.album} />
              )}
              <NowPlayingInfo>
                <TrackTitle>{currentTrack.name}</TrackTitle>
                <TrackArtist>{currentTrack.artist}</TrackArtist>
              </NowPlayingInfo>
            </AlbumArtOverlay>
          ) : (
            <IdleState>
              <IdleIcon>🎵</IdleIcon>
              <IdleText>No track playing</IdleText>
            </IdleState>
          )}

          <NextVizButton>Next Viz</NextVizButton>
        </VisualizationArea>

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
              <TransportButton onClick={onPrevious}>⏮</TransportButton>
              <TransportButton
                $isPlay
                onClick={isPlaying ? onPause : onPlay}
              >
                {isPlaying ? '⏸' : '▶'}
              </TransportButton>
              <TransportButton onClick={onNext}>⏭</TransportButton>
            </TransportButtons>

            <VolumeControl>
              <VolumeIcon
                $muted={isMuted}
                onClick={onMuteToggle}
              >
                {isMuted || volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
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

export default MediaPlayer;
