/**
 * ============================================================================
 * TOOLTIP COMPONENT
 * ============================================================================
 *
 * Matrix-styled tooltip that appears on hover over icon buttons.
 *
 * Props:
 * - text: The tooltip text to display
 * - position: "above" (default) or "below" - where to show the tooltip
 * - delay: Delay in ms before showing tooltip (default: 400)
 */

import styled, { css } from 'styled-components';

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const aboveStyles = css`
  bottom: calc(100% + 8px);
  top: auto;

  /* Arrow pointing down */
  &::after {
    top: 100%;
    bottom: auto;
    border-top-color: #00ff41;
    border-bottom-color: transparent;
  }
`;

const belowStyles = css`
  top: calc(100% + 8px);
  bottom: auto;

  /* Arrow pointing up */
  &::after {
    bottom: 100%;
    top: auto;
    border-bottom-color: #00ff41;
    border-top-color: transparent;
  }
`;

const TooltipContent = styled.span`
  position: absolute;
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
  transition-delay: 0s;

  /* Ensure it's above other elements */
  z-index: 9999;
  pointer-events: none;

  /* Arrow base */
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
  }

  /* Position-specific styles */
  ${props => props.$position === 'below' ? belowStyles : aboveStyles}
`;

const TooltipTrigger = styled.div`
  display: inline-flex;

  &:hover + ${TooltipContent} {
    opacity: 1;
    visibility: visible;
    transition-delay: ${props => props.$delay || 400}ms;
  }
`;

/**
 * Tooltip component that wraps around any element.
 *
 * @param {string} text - The tooltip text to display
 * @param {string} position - "above" (default) or "below"
 * @param {number} delay - Delay in ms before showing (default: 400)
 * @param {ReactNode} children - The element to wrap
 */
function Tooltip({ text, position = 'above', delay = 400, children }) {
  if (!text) return children;

  return (
    <TooltipWrapper>
      <TooltipTrigger $delay={delay}>{children}</TooltipTrigger>
      <TooltipContent $position={position}>{text}</TooltipContent>
    </TooltipWrapper>
  );
}

export default Tooltip;
