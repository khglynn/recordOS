/**
 * ============================================================================
 * GAME WINDOW COMPONENT
 * ============================================================================
 *
 * Windows 95-style window containing embedded classic games.
 *
 * Self-hosted games:
 * - Minesweeper: michaelbutler/minesweeper (GPL)
 * - Solitaire: Two9A/solitaire-js (Unlicense)
 * - Snake: cribbles/snake (MIT) - dark/green themed
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
// GAME SOURCES
// ============================================================================

const GAME_CONFIG = {
  minesweeper: {
    title: 'Minesweeper',
    iconName: 'zap',
    url: '/games/minesweeper/index.html',
    width: 300,
    height: 380,
  },
  solitaire: {
    title: 'Solitaire',
    iconName: 'gamepad',
    url: '/games/solitaire/index.html',
    width: 580,
    height: 480,
    scale: 0.6,
    innerWidth: 960,
    innerHeight: 750,
  },
  snake: {
    title: 'Snake',
    iconName: 'gamepad',
    url: '/games/snake/index.html',
    width: 340,
    height: 500,
  },
};

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
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
  background: #0a0a0a !important;
  padding: 0 !important;
  overflow: hidden;
`;

const GameFrame = styled.iframe`
  border: none;
  background: #0a0a0a;
  transform-origin: top left;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function GameWindow({
  gameType,
  isActive,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  position,
  onDragStart,
}) {
  const headerRef = useRef(null);
  const config = GAME_CONFIG[gameType];

  if (!config) return null;

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
        left: position?.x ?? 200,
        top: position?.y ?? 50,
        width: config.width + 4, // Account for borders
        height: config.height + 30, // Account for header
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name={config.iconName} size={14} />
          <span>{config.title}</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={(e) => { e.stopPropagation(); onMinimize(); }}>
            <PixelIcon name="minus" size={10} />
          </HeaderButton>
          <HeaderButton onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <PixelIcon name="close" size={10} />
          </HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent style={{ height: config.height }}>
        <GameFrame
          src={config.url}
          title={config.title}
          style={config.scale ? {
            width: config.innerWidth,
            height: config.innerHeight,
            transform: `scale(${config.scale})`,
          } : {
            width: '100%',
            height: '100%',
          }}
        />
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default GameWindow;
