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
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
} from 'react95';
import PixelIcon from './PixelIcon';

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

// ============================================================================
// COMPONENT
// ============================================================================

function LoadingWindow({
  loadingProgress,
  position,
  onPositionChange,
}) {
  const headerRef = useRef(null);
  const windowRef = useRef(null);
  const dragOutlineRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [displayedPercent, setDisplayedPercent] = useState(0);

  // Use provided position or center
  const defaultX = typeof window !== 'undefined' ? (window.innerWidth / 2 - 180) : 300;
  const defaultY = typeof window !== 'undefined' ? (window.innerHeight / 2 - 80) : 200;
  const currentPos = position || { x: defaultX, y: defaultY };

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

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      const rect = windowRef.current?.getBoundingClientRect();
      setDragging({
        startX: e.clientX - currentPos.x,
        startY: e.clientY - currentPos.y,
        width: rect?.width || 360,
        height: rect?.height || 150,
        initialX: currentPos.x,
        initialY: currentPos.y,
      });
    }
  };

  // Outline drag effect (same as other windows)
  useEffect(() => {
    if (!dragging) return;

    const outline = document.createElement('div');
    outline.style.cssText = `
      position: fixed;
      border: 2px dashed #00ff41;
      pointer-events: none;
      z-index: 999999;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
      left: ${dragging.initialX}px;
      top: ${dragging.initialY}px;
      width: ${dragging.width}px;
      height: ${dragging.height}px;
    `;
    document.body.appendChild(outline);
    dragOutlineRef.current = outline;

    let currentX = dragging.initialX;
    let currentY = dragging.initialY;

    const handleMouseMove = (e) => {
      currentX = Math.max(0, e.clientX - dragging.startX);
      currentY = Math.max(0, e.clientY - dragging.startY);
      outline.style.left = `${currentX}px`;
      outline.style.top = `${currentY}px`;
    };

    const handleMouseUp = () => {
      outline.remove();
      dragOutlineRef.current = null;
      onPositionChange?.({ x: currentX, y: currentY });
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      outline.remove();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onPositionChange]);

  return (
    <StyledWindow
      ref={windowRef}
      style={{
        left: currentPos.x,
        top: currentPos.y,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef}>
        <HeaderTitle>
          <PixelIcon name="disc" size={14} />
          <span>Scanning Library</span>
        </HeaderTitle>
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
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LoadingWindow;
