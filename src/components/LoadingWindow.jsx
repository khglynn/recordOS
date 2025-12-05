/**
 * ============================================================================
 * LOADING WINDOW COMPONENT
 * ============================================================================
 *
 * Classic Windows 95-style loading window that appears during library fetch.
 * Features:
 * - Draggable like other windows
 * - Win95 progress bar with green theme
 * - Track count and percentage display
 */

import { useRef } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  ProgressBar,
} from 'react95';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  z-index: 10001;
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
  background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
  color: #00ff41 !important;
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

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  padding: 20px !important;
`;

const StatusText = styled.div`
  font-family: 'MS Sans Serif', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  color: #00ff41;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Spinner = styled.span`
  display: inline-block;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ProgressContainer = styled.div`
  margin-bottom: 12px;

  /* Override React95 progress bar colors */
  & > div {
    background: #0a0a0a !important;
    border-color: #3a3a3a !important;
  }

  /* The progress fill */
  & > div > div {
    background: linear-gradient(
      90deg,
      #00aa30 0%,
      #00ff41 50%,
      #00aa30 100%
    ) !important;
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  }
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

// ============================================================================
// COMPONENT
// ============================================================================

function LoadingWindow({
  loadingProgress,
  position,
  onDragStart,
}) {
  const headerRef = useRef(null);

  const loaded = loadingProgress?.loaded || 0;
  const total = loadingProgress?.total || 0;
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      onDragStart?.(e);
    }
  };

  return (
    <StyledWindow
      style={{
        left: position?.x ?? 'calc(50% - 180px)',
        top: position?.y ?? 'calc(50% - 80px)',
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef}>
        <HeaderTitle>
          <span>💿</span>
          <span>Scanning Library</span>
        </HeaderTitle>
      </StyledWindowHeader>

      <StyledWindowContent>
        <StatusText>
          <Spinner>⟳</Spinner>
          <span>Fetching saved tracks<AnimatedDots /></span>
        </StatusText>

        <ProgressContainer>
          <ProgressBar value={percent} />
        </ProgressContainer>

        <ProgressDetails>
          <span>{loaded.toLocaleString()} / {total > 0 ? total.toLocaleString() : '...'} tracks</span>
          <span>{percent}%</span>
        </ProgressDetails>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LoadingWindow;
