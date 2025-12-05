/**
 * ============================================================================
 * TRIPPY GRAPHICS COMPONENT
 * ============================================================================
 *
 * Butterchurn (MilkDrop) visualizer in its own window.
 *
 * Features:
 * - Draggable, resizable window
 * - Butterchurn WebGL visualizer with audio input
 * - Preset controls (next, random)
 * - Displays current preset name
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';
import { useButterchurn } from '../hooks/useButterchurn';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  min-width: 400px;
  min-height: 300px;
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

const VisualizerContainer = styled.div`
  flex: 1;
  position: relative;
  min-height: 200px;
`;

const VisualizerCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

const PresetName = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  color: rgba(0, 255, 65, 0.5);
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  max-width: calc(100% - 16px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00ff41;
  font-size: 12px;
  text-align: center;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(0, 255, 65, 0.7);
  font-size: 12px;
  text-align: center;
  font-family: 'Consolas', 'Courier New', monospace;
  padding: 20px;
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
  onResizeStart,
  audioContext,
  audioAnalyser,
  initAudioContext,
}) {
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Butterchurn hook
  const butterchurn = useButterchurn();

  // Initialize Butterchurn when window opens
  useEffect(() => {
    const initializeViz = async () => {
      // Don't retry if already initialized, already enabled, or there's an error
      if (canvasRef.current && !isInitialized && !butterchurn.isEnabled && !butterchurn.error) {
        // Try to initialize audio context if not already done
        if (!audioContext && initAudioContext) {
          initAudioContext();
          // Wait for audio context to be ready (state update is async)
          // If it's not ready, the microphone fallback will be used
          return;
        }

        // Use external audio source if available, otherwise falls back to mic
        const success = await butterchurn.initialize(
          canvasRef.current,
          audioContext,
          audioAnalyser
        );
        if (success) {
          setIsInitialized(true);
        }
      }
    };

    // Small delay to ensure canvas is rendered and audio context is available
    const timer = setTimeout(initializeViz, 100);
    return () => clearTimeout(timer);
  }, [isInitialized, butterchurn.isEnabled, butterchurn.error, butterchurn.initialize, audioContext, audioAnalyser, initAudioContext]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !butterchurn.isEnabled) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          butterchurn.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [butterchurn.isEnabled, butterchurn.resize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      butterchurn.disable();
    };
  }, [butterchurn.disable]);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  const handleClose = () => {
    butterchurn.disable();
    onClose();
  };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      style={{
        left: position?.x ?? 100,
        top: position?.y ?? 100,
        width: size?.width ?? 500,
        height: size?.height ?? 400,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name="sparkles" size={14} />
          <span>Trippy Graphics</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={onMinimize}>_</HeaderButton>
          <HeaderButton onClick={handleClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent>
        <VisualizerContainer ref={containerRef}>
          <VisualizerCanvas ref={canvasRef} />

          {/* Loading state */}
          {butterchurn.isLoading && !butterchurn.error && (
            <LoadingOverlay>
              Initializing visualizer...
            </LoadingOverlay>
          )}

          {/* Error state */}
          {butterchurn.error && (
            <ErrorOverlay>
              {butterchurn.error}
            </ErrorOverlay>
          )}

          {/* Preset name */}
          {butterchurn.currentPreset && butterchurn.isEnabled && (
            <PresetName>{butterchurn.currentPreset}</PresetName>
          )}
        </VisualizerContainer>

        {/* Control bar */}
        <ControlBar>
          <ControlButton
            onClick={butterchurn.nextPreset}
            disabled={!butterchurn.isEnabled}
          >
            <PixelIcon name="next" size={12} />
            Next
          </ControlButton>
          <ControlButton
            onClick={butterchurn.randomPreset}
            disabled={!butterchurn.isEnabled}
          >
            <PixelIcon name="shuffle" size={12} />
            Random
          </ControlButton>
        </ControlBar>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default TrippyGraphics;
