/**
 * ============================================================================
 * GAME WINDOW COMPONENT
 * ============================================================================
 *
 * Windows 95-style window containing embedded classic games.
 *
 * Games are loaded via iframes from external sources:
 * - Minesweeper: minesweeper.online (classic 90s style)
 * - Solitaire: solitr.com (classic Windows look)
 * - Snake: playsnake.org (Nokia-style)
 */

import { useRef } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';

// ============================================================================
// GAME SOURCES
// ============================================================================

const GAME_CONFIG = {
  minesweeper: {
    title: 'Minesweeper',
    icon: '💣',
    url: 'https://minesweeper.online/game/1',
    width: 320,
    height: 420,
  },
  solitaire: {
    title: 'Solitaire',
    icon: '🃏',
    url: 'https://www.solitr.com/',
    width: 700,
    height: 520,
  },
  snake: {
    title: 'Snake',
    icon: '🐍',
    url: 'https://playsnake.org/',
    width: 500,
    height: 520,
  },
};

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  z-index: 1000;

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
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #00ff41;
`;

const LoadingIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  animation: pulse 1s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }
`;

const LoadingText = styled.div`
  font-size: 12px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function GameWindow({
  gameType,
  isActive,
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
          <span>{config.icon}</span>
          <span>{config.title}</span>
        </HeaderTitle>
        <HeaderButtons>
          <HeaderButton onClick={onMinimize}>_</HeaderButton>
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </HeaderButtons>
      </StyledWindowHeader>

      <StyledWindowContent style={{ height: config.height }}>
        <GameFrame
          src={config.url}
          title={config.title}
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default GameWindow;
