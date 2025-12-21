/**
 * ============================================================================
 * ERROR MODAL COMPONENT
 * ============================================================================
 *
 * Displays scanError and authError to users with retry/dismiss options.
 * Previously these errors were set but never rendered - users saw a frozen
 * loading bar with no feedback.
 *
 * Created: 2025-12-21
 */

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

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ErrorIcon = styled.div`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a0a0a;
  border: 2px solid #ff4141;
  color: #ff4141;
  font-size: 24px;
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
  color: #ff4141;
  margin: 0;
  text-shadow: 0 0 8px rgba(255, 65, 65, 0.4);
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
 * @param {Object} position - { x, y } position
 * @param {boolean} isMobile - Mobile mode
 * @param {function} onClose - Close handler
 * @param {function} onFocus - Focus handler
 * @param {function} onDragStart - Drag handler
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
  onDragStart,
}) {
  if (!error) return null;

  // Normalize error to object format
  const errorObj = typeof error === 'string'
    ? { code: 'ERROR', message: error, detail: null }
    : error;

  const isScanError = errorType === 'scan';
  const title = isScanError ? 'SYSTEM ERROR' : 'AUTH ERROR';
  const icon = isScanError ? 'alert-triangle' : 'lock';

  // Handle close - dismisses the error
  const handleClose = () => {
    onDismiss?.();
    onClose?.();
  };

  return (
    <WindowFrame
      title={`⚠ ${title}`}
      icon={icon}
      isActive={isActive}
      zIndex={zIndex}
      position={position}
      width={380}
      isMobile={isMobile}
      showMinimize={false}
      onClose={handleClose}
      onFocus={onFocus}
      onDragStart={onDragStart}
    >
      <ErrorContent>
        <ErrorHeader>
          <ErrorIcon>
            <PixelIcon name="alert-triangle" size={24} />
          </ErrorIcon>
          <ErrorTitleBlock>
            {errorObj.code && (
              <ErrorCode>ERR_{errorObj.code}</ErrorCode>
            )}
            <ErrorTitle>{errorObj.message || 'UNKNOWN ERROR'}</ErrorTitle>
          </ErrorTitleBlock>
        </ErrorHeader>

        {errorObj.detail && (
          <ErrorDetail>
            <span style={{ color: '#ff4141', marginRight: '6px' }}>&gt;</span>
            {errorObj.detail}
          </ErrorDetail>
        )}

        <ButtonRow>
          <ActionButton onClick={handleClose}>
            [DISMISS]
          </ActionButton>
          {isScanError && onRetry && (
            <ActionButton $primary onClick={() => { onDismiss?.(); onRetry(); }}>
              [RETRY SCAN]
            </ActionButton>
          )}
        </ButtonRow>

        <SystemNote>
          // RECORD_OS DIAGNOSTIC // ERROR HANDLER v1.0 //
        </SystemNote>
      </ErrorContent>
    </WindowFrame>
  );
}

export default ErrorModal;
