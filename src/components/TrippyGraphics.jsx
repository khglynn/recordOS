/**
 * ============================================================================
 * VISUALIZER COMPONENT
 * ============================================================================
 *
 * Butterchurn (MilkDrop) visualizer in its own window.
 * Inspired by Windows Media Player visualizations.
 *
 * Features:
 * - Draggable window
 * - Embedded Butterchurn visualizer with microphone input
 * - Preset controls (next, random) via postMessage
 */

import { useRef } from 'react';
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
  min-width: 480px;
  min-height: 360px;
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

  /* Mobile: centered fixed size (not full screen) */
  ${props => props.$isMobile && `
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%);
    width: calc(100vw - 32px) !important;
    max-width: 360px;
    height: auto !important;
    min-width: unset;
    min-height: unset;
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
  font-family: 'Consolas', 'Courier New', monospace;
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
  background: #000 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
`;

const VisualizerIframe = styled.iframe`
  flex: 1;
  width: 100%;
  min-height: 0; /* Allow flexbox to shrink below intrinsic size */
  border: none;
  background: #000;
`;

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: #0d0d0d;
  border-top: 1px solid #2a2a2a;
`;

const MobileWarning = styled.div`
  background: rgba(0, 255, 65, 0.05);
  border-bottom: 1px solid rgba(0, 255, 65, 0.2);
  padding: 4px 8px;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
  text-align: center;
`;

const ControlButton = styled.button`
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: #00ff41;
  padding: 4px 12px;
  font-size: 10px;
  cursor: pointer;
  font-family: 'Consolas', 'Courier New', monospace;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #0a2a0a;
    border-color: rgba(0, 255, 65, 0.5);
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function TrippyGraphics({
  isActive,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  position,
  size,
  onDragStart,
  isMobile,
}) {
  const headerRef = useRef(null);
  const iframeRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  const sendMessage = (type) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type }, '*');
    }
  };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      style={isMobile ? {} : {
        left: position?.x ?? 100,
        top: position?.y ?? 100,
        width: size?.width ?? 640,
        height: size?.height ?? 520,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name="sparkles" size={14} />
          <span>WMP[ish] Visualizations</span>
          {isMobile && <span style={{ fontSize: '8px', opacity: 0.5, marginLeft: '4px' }}>[EXPERIMENTAL]</span>}
        </HeaderTitle>
        <HeaderButtons>
          {/* Hide minimize on mobile - only Scanner/MediaPlayer get minimize on mobile */}
          {!isMobile && <HeaderButton onClick={onMinimize}>_</HeaderButton>}
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        {isMobile && (
          <MobileWarning>
            &gt; WEBGL SUBSTRATE: UNSTABLE ON PORTABLE DEVICES // PROCEED WITH CAUTION
          </MobileWarning>
        )}
        <VisualizerIframe
          ref={iframeRef}
          src="/visualizer/index.html"
          title="Butterchurn Visualizer"
          allow="microphone *; autoplay *"
        />

        {/* Control bar */}
        <ControlBar>
          <ControlButton onClick={() => sendMessage('next-preset')}>
            <PixelIcon name="next" size={12} />
            Next
          </ControlButton>
          <ControlButton onClick={() => sendMessage('random-preset')}>
            <PixelIcon name="shuffle" size={12} />
            Random
          </ControlButton>
        </ControlBar>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default TrippyGraphics;
