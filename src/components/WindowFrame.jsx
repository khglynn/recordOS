/**
 * ============================================================================
 * WINDOW FRAME COMPONENT
 * ============================================================================
 *
 * Shared window/modal wrapper with consistent styling and behavior.
 * Eliminates duplicate styled-components across modals.
 *
 * Features:
 * - Dark Matrix theme styling
 * - Draggable header
 * - Minimize/Close buttons
 * - Consistent mobile centering
 * - Animation on appear
 *
 * Created: 2025-12-11
 */

import { useRef, forwardRef } from 'react';
import styled, { css } from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';
import PixelIcon from './PixelIcon';
import Tooltip from './Tooltip';
import {
  TASKBAR_HEIGHT,
  MOBILE_PADDING,
  getMobileModalStyles,
  Z_INDEX,
} from '../utils/windowConfig';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const windowAppearAnimation = css`
  @keyframes windowAppear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const darkThemeStyles = css`
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 20px rgba(0, 255, 65, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.5) !important;
`;

const mobileStyles = css`
  width: calc(100vw - ${MOBILE_PADDING * 2}px) !important;
  max-width: calc(100vw - ${MOBILE_PADDING * 2}px) !important;
  max-height: calc(100vh - ${TASKBAR_HEIGHT}px - ${MOBILE_PADDING * 2}px) !important;
  left: ${MOBILE_PADDING}px !important;
  /* Center in available space (above taskbar) */
  top: calc((100vh - ${TASKBAR_HEIGHT}px) / 2) !important;
  transform: translateY(-50%);
  border-radius: 0;
`;

const StyledWindow = styled(Window)`
  position: fixed;
  z-index: ${props => props.$zIndex || Z_INDEX.window};
  overflow: hidden; /* Clip content to window frame */
  ${darkThemeStyles}
  ${windowAppearAnimation}
  animation: windowAppear 0.15s ease-out;

  ${props => props.$isMobile && mobileStyles}

  /* Allow custom width override on desktop */
  ${props => !props.$isMobile && props.$width && `width: ${props.$width}px;`}
  ${props => !props.$isMobile && props.$maxWidth && `max-width: ${props.$maxWidth};`}
  ${props => !props.$isMobile && props.$maxHeight && `max-height: ${props.$maxHeight};`}
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
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
  background: ${props => props.$darkBg ? '#0a0a0a' : '#1a1a1a'} !important;
  padding: ${props => props.$noPadding ? '0' : '12px'} !important;
  overflow: ${props => props.$overflow || 'hidden'};
  display: flex;
  flex-direction: column;

  /* Custom scrollbar when overflow is auto/scroll */
  &::-webkit-scrollbar {
    width: 12px;
  }
  &::-webkit-scrollbar-track {
    background: #0d0d0d;
  }
  &::-webkit-scrollbar-thumb {
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #3a3a3a;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * WindowFrame - Shared window wrapper component
 *
 * @param {string} title - Window title text
 * @param {string} icon - PixelIcon name for title bar
 * @param {boolean} isActive - Whether window is focused
 * @param {number} zIndex - Window z-index
 * @param {Object} position - { x, y } position for desktop
 * @param {number} width - Desktop width in pixels
 * @param {string} maxWidth - Max width CSS value
 * @param {string} maxHeight - Max height CSS value
 * @param {boolean} isMobile - Mobile mode flag
 * @param {boolean} showMinimize - Show minimize button (default: true on desktop)
 * @param {boolean} noPadding - Remove content padding
 * @param {boolean} darkBg - Use darker background (#0a0a0a)
 * @param {string} overflow - Content overflow setting
 * @param {function} onClose - Close handler
 * @param {function} onMinimize - Minimize handler
 * @param {function} onFocus - Focus handler
 * @param {function} onDragStart - Drag start handler
 * @param {ReactNode} children - Window content
 */
const WindowFrame = forwardRef(function WindowFrame({
  title,
  icon,
  isActive = true,
  zIndex,
  position,
  width,
  maxWidth = '95vw',
  maxHeight = '85vh',
  isMobile = false,
  showMinimize = true,
  noPadding = false,
  darkBg = false,
  overflow = 'hidden',
  onClose,
  onMinimize,
  onFocus,
  onDragStart,
  children,
  style,
  contentStyle,
  ...props
}, ref) {
  const headerRef = useRef(null);

  const handleMouseDown = (e) => {
    // Only drag from header, not from buttons
    if (e.target === headerRef.current || headerRef.current?.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  // Position style - only applied on desktop
  const positionStyle = isMobile ? {} : {
    left: position?.x ?? 100,
    top: position?.y ?? 100,
    ...style,
  };

  return (
    <StyledWindow
      ref={ref}
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      $width={width}
      $maxWidth={maxWidth}
      $maxHeight={maxHeight}
      style={positionStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      {...props}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          {icon && <PixelIcon name={icon} size={14} />}
          <span>{title}</span>
        </HeaderTitle>
        <HeaderButtons>
          {/* Only show minimize on desktop, or for persistent window types */}
          {showMinimize && !isMobile && onMinimize && (
            <Tooltip text="Minimize">
              <HeaderButton onClick={(e) => { e.stopPropagation(); onMinimize(); }}>
                <PixelIcon name="minus" size={10} />
              </HeaderButton>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip text="Close">
              <HeaderButton onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <PixelIcon name="close" size={10} />
              </HeaderButton>
            </Tooltip>
          )}
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent
        $noPadding={noPadding}
        $darkBg={darkBg}
        $overflow={overflow}
        style={contentStyle}
      >
        {children}
      </StyledWindowContent>
    </StyledWindow>
  );
});

export default WindowFrame;
