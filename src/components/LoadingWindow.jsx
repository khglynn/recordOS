/**
 * ============================================================================
 * LOADING WINDOW COMPONENT
 * ============================================================================
 *
 * Classic Windows 95-style loading window that appears during library fetch.
 * Features:
 * - Draggable with green outline effect
 * - Custom progress bar with green theme
 * - Track count and percentage display
 */

import { useRef, useEffect, useState } from 'react';
// Note: useState/useEffect still needed for displayedPercent tracking
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
  width: 360px;

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
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  padding: 20px !important;
`;

const StatusText = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: #00ff41;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressContainer = styled.div`
  margin-bottom: 12px;
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

const ProgressDetails = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.7);
`;

const AnimatedDots = styled.span`
  &::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
  }

  @keyframes dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
    100% { content: ''; }
  }
`;

const DecadeSection = styled.div`
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #2a2a2a;
`;

const DecadeSectionTitle = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const DecadeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DecadeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
`;

const DecadeIcon = styled.span`
  width: 14px;
  text-align: center;
  color: ${props => props.$ready ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'};
`;

const DecadeName = styled.span`
  color: ${props => props.$ready ? '#00ff41' : 'rgba(0, 255, 65, 0.5)'};
  flex: 1;
`;

const DecadeCount = styled.span`
  color: ${props => props.$ready ? '#00ff41' : 'rgba(0, 255, 65, 0.3)'};
  font-size: 10px;
`;

const DecadeStatus = styled.span`
  font-size: 9px;
  color: ${props => props.$ready ? '#00ff41' : 'rgba(0, 255, 65, 0.4)'};
  text-transform: uppercase;
`;

const ExploreButton = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 8px 16px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid #00ff41;
  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%);
  color: #00ff41;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%);
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function LoadingWindow({
  // Standard window props from window management system
  isActive,
  zIndex,
  position,
  onClose,
  onMinimize,
  onFocus,
  onDragStart,
  isMobile,
  // Loading-specific props
  loadingProgress,
  // Progressive decade props
  decadeStatus = {},
  albumsByDecade = {},
  decadeOrder = [],
  decadeLabels = {},
  hasReadyDecade = false,
  onExploreEarly,
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

  // Reset when starting a new load
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
          <PixelIcon name="disc" size={14} />
          <span>SCANNING LIBRARY...</span>
        </HeaderTitle>
        <HeaderButtons>
          <Tooltip text="Minimize">
            <HeaderButton onClick={onMinimize}>_</HeaderButton>
          </Tooltip>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        <StatusText>
          <span>Fetching saved tracks<AnimatedDots /></span>
        </StatusText>

        <ProgressContainer>
          <ProgressFill style={{ width: `${displayedPercent}%` }} />
          {displayedPercent > 0 && <ProgressPercent>{displayedPercent}%</ProgressPercent>}
        </ProgressContainer>

        <ProgressDetails>
          <span>{loaded.toLocaleString()} / {total > 0 ? total.toLocaleString() : '...'} tracks</span>
          <span>{displayedPercent}%</span>
        </ProgressDetails>

        {/* Decade status list */}
        {Object.keys(decadeStatus).length > 0 && (
          <DecadeSection>
            <DecadeSectionTitle>Decades Discovered</DecadeSectionTitle>
            <DecadeList>
              {decadeOrder.map(decade => {
                const status = decadeStatus[decade];
                const albums = albumsByDecade[decade] || [];
                if (!status) return null;

                const isReady = status === 'ready';
                return (
                  <DecadeRow key={decade}>
                    <DecadeIcon $ready={isReady}>
                      {isReady ? '✓' : '○'}
                    </DecadeIcon>
                    <DecadeName $ready={isReady}>
                      {decadeLabels[decade] || decade}
                    </DecadeName>
                    <DecadeCount $ready={isReady}>
                      [{albums.length} albums]
                    </DecadeCount>
                    <DecadeStatus $ready={isReady}>
                      {isReady ? 'READY' : 'scanning...'}
                    </DecadeStatus>
                  </DecadeRow>
                );
              })}
            </DecadeList>

            {/* Explore early button */}
            <ExploreButton
              disabled={!hasReadyDecade}
              onClick={onExploreEarly}
            >
              <PixelIcon name="monitor" size={12} />
              Minimize & Explore
            </ExploreButton>
          </DecadeSection>
        )}
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LoadingWindow;
