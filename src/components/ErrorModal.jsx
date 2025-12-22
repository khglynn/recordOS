/**
 * ============================================================================
 * ERROR MODAL COMPONENT
 * ============================================================================
 *
 * Displays scanError and authError to users with retry/dismiss options.
 * Previously these errors were set but never rendered - users saw a frozen
 * loading bar with no feedback.
 *
 * Common trigger: Cached login failed to re-authenticate on page load.
 * Copy reflects this - "session expired" rather than generic "not authenticated".
 *
 * Created: 2025-12-21
 * Updated: 2025-12-22 - Added internal drag state, updated copy
 */

import { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
import PixelIcon from './PixelIcon';
import WindowFrame from './WindowFrame';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ErrorContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
`;

const ErrorTitleBlock = styled.div`
  flex: 1;
`;

const ErrorCode = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(255, 65, 65, 0.6);
  letter-spacing: 1px;
  margin-bottom: 4px;
`;

const ErrorTitle = styled.h2`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  color: #00ff41;
  margin: 0;
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
`;

const ErrorDetail = styled.div`
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  padding: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.8);
  line-height: 1.6;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ActionButton = styled(Button)`
  min-width: 100px;
  padding: 8px 16px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.5px;

  ${props => props.$primary ? `
    background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
    color: #00ff41 !important;
    border-color: #00ff41 !important;

    &:hover {
      background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
      text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
    }
  ` : `
    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%) !important;
    color: rgba(0, 255, 65, 0.7) !important;
    border-color: #3a3a3a !important;

    &:hover {
      background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
    }
  `}
`;

const SystemNote = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(255, 65, 65, 0.35);
  text-align: center;
  letter-spacing: 0.5px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ErrorModal - Display scan/auth errors to users
 *
 * @param {Object} error - Error object { code, message, detail } or string
 * @param {string} errorType - 'scan' | 'auth' - determines icon and retry behavior
 * @param {function} onRetry - Called when user clicks retry (scan errors only)
 * @param {function} onDismiss - Called when user clicks dismiss
 * @param {boolean} isActive - Window focus state
 * @param {number} zIndex - Window z-index
 * @param {Object} position - { x, y } initial position
 * @param {boolean} isMobile - Mobile mode
 * @param {function} onClose - Close handler
 * @param {function} onFocus - Focus handler
 */
function ErrorModal({
  error,
  errorType = 'scan',
  onRetry,
  onDismiss,
  isActive,
  zIndex,
  position,
  isMobile,
  onClose,
  onFocus,
}) {
  // Internal position state for dragging (since ErrorModal isn't in windows array)
  const [windowPosition, setWindowPosition] = useState(position);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  // Drag handler - manages its own position since not in windows array
  const handleDragStart = useCallback((e) => {
    if (isMobile) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      isDragging: true,
      startX: clientX - (windowPosition?.x || 0),
      startY: clientY - (windowPosition?.y || 0),
    };

    const handleMove = (moveEvent) => {
      if (!dragRef.current.isDragging) return;

      const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const moveY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      setWindowPosition({
        x: Math.max(0, Math.min(window.innerWidth - 380, moveX - dragRef.current.startX)),
        y: Math.max(0, Math.min(window.innerHeight - 200, moveY - dragRef.current.startY)),
      });
    };

    const handleEnd = () => {
      dragRef.current.isDragging = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [isMobile, windowPosition]);

  if (!error) return null;

  // Normalize error to object format
  const errorObj = typeof error === 'string'
    ? { code: 'ERROR', message: error, detail: null }
    : error;

  // Improve error copy for common scenarios
  const getImprovedDetail = () => {
    const detail = errorObj.detail || '';
    const lowerDetail = detail.toLowerCase();

    // Cached login / session expired scenarios
    if (lowerDetail.includes('not authenticated') ||
        lowerDetail.includes('401') ||
        lowerDetail.includes('unauthorized') ||
        lowerDetail.includes('token')) {
      return 'Session expired or login cache invalid';
    }

    // Network errors
    if (lowerDetail.includes('network') || lowerDetail.includes('fetch')) {
      return 'Network connection interrupted';
    }

    return detail;
  };

  const getImprovedMessage = () => {
    const message = errorObj.message || 'UNKNOWN ERROR';
    const lowerMessage = message.toLowerCase();

    // Auth-related scan failures
    if (lowerMessage.includes('scan') &&
        (errorObj.detail?.toLowerCase().includes('authenticated') ||
         errorObj.detail?.toLowerCase().includes('401'))) {
      return 'SESSION EXPIRED';
    }

    return message;
  };

  const isScanError = errorType === 'scan';
  const title = isScanError ? 'SYSTEM ERROR' : 'AUTH ERROR';
  const icon = 'alert'; // Use existing icon

  // Handle close - dismisses the error
  const handleClose = () => {
    onDismiss?.();
    onClose?.();
  };

  return (
    <WindowFrame
      title={title}
      icon={icon}
      isActive={isActive}
      zIndex={zIndex}
      position={windowPosition}
      width={380}
      isMobile={isMobile}
      showMinimize={false}
      onClose={handleClose}
      onFocus={onFocus}
      onDragStart={handleDragStart}
    >
      <ErrorContent>
        <ErrorTitleBlock>
          {errorObj.code && (
            <ErrorCode>ERR_{errorObj.code}</ErrorCode>
          )}
          <ErrorTitle>{getImprovedMessage()}</ErrorTitle>
        </ErrorTitleBlock>

        {(errorObj.detail || getImprovedDetail()) && (
          <ErrorDetail>
            {getImprovedDetail()}
          </ErrorDetail>
        )}

        <ButtonRow>
          <ActionButton onClick={handleClose}>
            [DISMISS]
          </ActionButton>
          {isScanError && onRetry && (
            <ActionButton $primary onClick={() => { onDismiss?.(); onRetry(); }}>
              [RETRY]
            </ActionButton>
          )}
        </ButtonRow>

        <SystemNote>
          // RECORD_OS DIAGNOSTIC // SESSION RECOVERY //
        </SystemNote>
      </ErrorContent>
    </WindowFrame>
  );
}

export default ErrorModal;
