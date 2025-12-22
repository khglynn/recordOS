/**
 * ============================================================================
 * LIBRARY SCANNER COMPONENT
 * ============================================================================
 *
 * Unified modal for post-auth library scanning. Consolidates the previous
 * LoadingWindow and LoadedModal into one component with two states:
 * - scanning: Progress bar, progressive decade enabling
 * - complete: Stats summary, all decades ready
 *
 * Voice: Deadpan corporate Windows 95 with Weyland-Yutani undertones.
 *
 * Created: 2025-12-10
 */

import { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
} from 'react95';
import PixelIcon from './PixelIcon';
import Tooltip from './Tooltip';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  z-index: ${props => props.$zIndex || 1000};
  width: 380px;
  max-width: 95vw;

  /* Dark theme */
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 20px rgba(0, 255, 65, 0.15),
    0 8px 32px rgba(0, 0, 0, 0.6) !important;

  animation: windowAppear 0.2s ease-out;

  @keyframes windowAppear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
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

const HeaderButtons = styled.div`
  display: flex;
  gap: 2px;
`;

const HeaderButton = styled.button`
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;
  border: 1px solid #4a4a4a;
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  color: #00ff41;
  cursor: pointer;

  &:hover {
    background: linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%);
  }
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  padding: 20px !important;
`;

// Stats display (tracks + albums boxes)
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const StatBox = styled.div`
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 24px;
  font-weight: bold;
  color: #00ff41;
  text-shadow: 0 0 12px rgba(0, 255, 65, 0.5);
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

// Progress bar (scanning state)
const ProgressContainer = styled.div`
  margin-bottom: 16px;
  width: 100%;
  height: 20px;
  background: #0a0a0a;
  border: 1px solid #00ff41;
  position: relative;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00ff41 0%, #00cc33 100%);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  transition: width 0.2s ease-out;
`;

const ProgressPercent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: #000;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 255, 65, 0.8);
`;

// Dominant era display (complete state - replaces progress bar)
const DominantEraBox = styled.div`
  background: #0a0a0a;
  border: 1px solid #00ff41;
  padding: 12px;
  text-align: center;
  margin-bottom: 16px;
`;

const DominantEraValue = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 18px;
  font-weight: bold;
  color: #00ff41;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
`;

const DominantEraLabel = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
`;

// Instruction text
const InstructionText = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.6);
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
`;

// Decade button grid - 3 columns, ALL button spans full width at bottom
const DecadeButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 100%;
`;

const DecadeButton = styled.button`
  padding: 6px 8px;
  min-width: 0;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  border: 1px solid ${props => {
    if (props.disabled) return '#2a2a2a';
    if (props.$isAll) return '#00ff41';
    return '#3a3a3a';
  }};
  background: ${props => {
    if (props.disabled) return 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)';
    if (props.$isAll) return 'linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%)';
    return 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)';
  }};
  color: ${props => {
    if (props.disabled) return 'rgba(0, 255, 65, 0.3)';
    if (props.$isAll) return '#00ff41';
    return 'rgba(0, 255, 65, 0.7)';
  }};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  opacity: ${props => props.disabled ? 0.5 : 1};

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%);
    border-color: #00ff41;
    color: #00ff41;
  }
`;

const DecadeButtonCount = styled.span`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
`;

// ALL button spans full width at bottom of grid
const AllButton = styled(DecadeButton)`
  grid-column: 1 / -1;
  padding: 10px 12px;
`;

// System footer
const SystemNote = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.35);
  text-align: center;
  margin-top: 16px;
  letter-spacing: 0.5px;
`;

// Games section (while scanning)
const IdleProcesses = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #1a1a1a;
`;

const IdleHeader = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 8px;
  letter-spacing: 1px;
`;

const GameLinks = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

const GameLink = styled.button`
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  color: rgba(0, 255, 65, 0.7);
  padding: 6px 10px;
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #00ff41;
    color: #00ff41;
    background: #0d1a0d;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function LibraryScanner({
  // Window management props
  isActive,
  zIndex,
  position,
  onClose,
  onMinimize,
  onFocus,
  onDragStart,
  isMobile,

  // Scan state
  scanState = 'scanning', // 'scanning' | 'complete'
  loadingProgress = { loaded: 0, total: 0 },
  totalTracks = 0,
  albumCount = 0,

  // Decade data
  decadeStatus = {},
  albumsByDecade = {},
  decadeOrder = [],
  decadeLabels = {},
  topDecade = null,

  // Actions
  onSelectDecade,
  onOpenGame, // For playing games while waiting
}) {
  const headerRef = useRef(null);
  const [displayedPercent, setDisplayedPercent] = useState(0);

  const loaded = loadingProgress?.loaded || 0;
  const total = loadingProgress?.total || 0;
  const calculatedPercent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  // Only update displayed percent if it increased (prevents backwards glitching)
  useEffect(() => {
    if (calculatedPercent > displayedPercent) {
      setDisplayedPercent(calculatedPercent);
    }
  }, [calculatedPercent, displayedPercent]);

  // Reset when starting a new scan
  useEffect(() => {
    if (loaded === 0 && total === 0) {
      setDisplayedPercent(0);
    }
  }, [loaded, total]);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  // Get decades that have albums (for button display)
  const availableDecades = decadeOrder.filter(d => albumsByDecade[d]?.length > 0);

  // Check if a decade is ready (has finished scanning)
  const isDecadeReady = (decade) => decadeStatus[decade] === 'ready';

  // In complete state, all decades are clickable
  const isComplete = scanState === 'complete';

  const handleDecadeClick = (decade) => {
    onSelectDecade?.(decade);
  };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      style={{
        left: position?.x ?? 300,
        top: position?.y ?? 200,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name={isComplete ? 'check' : 'disc'} size={14} />
          <span>{isComplete ? 'SCAN COMPLETE' : 'SCANNING LIBRARY'}</span>
        </HeaderTitle>
        <HeaderButtons>
          <Tooltip text="Minimize">
            <HeaderButton onClick={onMinimize}>_</HeaderButton>
          </Tooltip>
          <Tooltip text="Close">
            <HeaderButton onClick={onClose}>×</HeaderButton>
          </Tooltip>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        {/* Stats boxes - use live counts during scanning */}
        <StatsGrid>
          <StatBox>
            <StatValue>
              {(isComplete ? totalTracks : loaded).toLocaleString()}
            </StatValue>
            <StatLabel>Tracks Indexed</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{albumCount.toLocaleString()}</StatValue>
            <StatLabel>Albums Found</StatLabel>
          </StatBox>
        </StatsGrid>

        {/* Progress bar (scanning) or Dominant Era (complete) */}
        {isComplete ? (
          topDecade && (
            <DominantEraBox>
              <DominantEraValue>{topDecade}</DominantEraValue>
              <DominantEraLabel>Dominant Era Detected</DominantEraLabel>
            </DominantEraBox>
          )
        ) : (
          <ProgressContainer>
            <ProgressFill style={{ width: `${displayedPercent}%` }} />
            {displayedPercent > 0 && (
              <ProgressPercent>{displayedPercent}%</ProgressPercent>
            )}
          </ProgressContainer>
        )}

        {/* Instruction text */}
        <InstructionText>
          SELECT DECADE // TOP 50 BY SAVED TRACKS
        </InstructionText>

        {/* Decade buttons - 3x3 grid + full-width ALL at bottom */}
        <DecadeButtonGrid>
          {/* Individual decade buttons (6 buttons = 2 rows of 3) */}
          {availableDecades.map(decade => {
            const count = albumsByDecade[decade]?.length || 0;
            const ready = isComplete || isDecadeReady(decade);

            return (
              <DecadeButton
                key={decade}
                disabled={!ready}
                onClick={() => handleDecadeClick(decade)}
              >
                {decadeLabels[decade] || decade}
                <DecadeButtonCount>{count}</DecadeButtonCount>
              </DecadeButton>
            );
          })}

          {/* ALL TIME button - full width at bottom, highlighted in complete state */}
          <AllButton
            $isAll={isComplete}
            disabled={!isComplete && albumCount === 0}
            onClick={() => handleDecadeClick('all')}
          >
            ALL TIME
            <DecadeButtonCount>{albumCount} albums</DecadeButtonCount>
          </AllButton>
        </DecadeButtonGrid>

        {/* Games while scanning */}
        {!isComplete && onOpenGame && (
          <IdleProcesses>
            <IdleHeader>IDLE PROCESSES AVAILABLE</IdleHeader>
            <GameLinks>
              <GameLink onClick={() => { onOpenGame('minesweeper'); onMinimize?.(); }}>
                <PixelIcon name="flag" size={12} color="currentColor" />
                MINESWEEPER
              </GameLink>
              <GameLink onClick={() => { onOpenGame('solitaire'); onMinimize?.(); }}>
                <PixelIcon name="cards" size={12} color="currentColor" />
                SOLITAIRE
              </GameLink>
              <GameLink onClick={() => { onOpenGame('snake'); onMinimize?.(); }}>
                <PixelIcon name="gamepad" size={12} color="currentColor" />
                SNAKE
              </GameLink>
            </GameLinks>
          </IdleProcesses>
        )}

        <SystemNote>
          // RECORD_OS v3.0 // WEYLAND-YUTANI AUDIO DIVISION //
        </SystemNote>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LibraryScanner;
