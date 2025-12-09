/**
 * ============================================================================
 * TOOLTIP COMPONENT
 * ============================================================================
 *
 * Matrix-styled tooltip that appears on hover over icon buttons.
 * Positioned above the element by default.
 */

import styled from 'styled-components';

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipContent = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);

  /* Styling */
  background: #0a0a0a;
  border: 1px solid #00ff41;
  padding: 4px 8px;
  border-radius: 2px;

  /* Text */
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: #00ff41;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  /* Glow effect */
  box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);

  /* Hidden by default */
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;

  /* Ensure it's above other elements */
  z-index: 9999;
  pointer-events: none;

  /* Arrow pointing down */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #00ff41;
  }
`;

const TooltipTrigger = styled.div`
  display: inline-flex;

  &:hover + ${TooltipContent} {
    opacity: 1;
    visibility: visible;
  }
`;

/**
 * Tooltip component that wraps around any element.
 *
 * @param {string} text - The tooltip text to display
 * @param {ReactNode} children - The element to wrap
 */
function Tooltip({ text, children }) {
  if (!text) return children;

  return (
    <TooltipWrapper>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </TooltipWrapper>
  );
}

export default Tooltip;
