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

import { useRef, useState, useEffect } from 'react';
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
    width: 260,
    height: 380,
  },
  solitaire: {
    title: 'Solitaire',
    iconName: 'gamepad',
    url: 'https://retro-solitare-4recordos.vercel.app',
    width: 700,
    height: 520,
  },
  snake: {
    title: 'Snake',
    iconName: 'gamepad',
    url: '/games/snake/index.html',
    width: 340,
    height: 420,
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

  /* Mobile: Solitaire = full viewport, others = centered */
  ${props => props.$isMobile && props.$isSolitaire && `
    width: 100vw !important;
    height: calc(100vh - 44px) !important;
    left: 0 !important;
    top: 0 !important;
    border-radius: 0;
  `}

  ${props => props.$isMobile && !props.$isSolitaire && `
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%);
    border-radius: 0;
    max-height: calc(100vh - 44px - 16px) !important;
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
  display: flex;
  flex-direction: column;
`;

const GameFrame = styled.iframe`
  border: none;
  background: #0a0a0a;
  transform-origin: top center;
`;

const MobileGameContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  padding-top: 8px;
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
  isMobile,
}) {
  const headerRef = useRef(null);
  const config = GAME_CONFIG[gameType];
  const [mobileScale, setMobileScale] = useState(1);

  // Calculate scale for mobile to fit game within viewport
  useEffect(() => {
    if (!isMobile || !config) return;

    const calculateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - 44 - 30 - 20; // -44 taskbar, -30 header, -20 padding

      const scaleX = (viewportWidth - 20) / config.width; // 20px total horizontal padding
      const scaleY = viewportHeight / config.height;

      // Use the smaller scale to fit both dimensions
      const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down
      setMobileScale(scale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [isMobile, config]);

  if (!config) return null;

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  // Mobile: full width/height, ignore fixed sizes
  const windowStyle = isMobile ? {} : {
    left: position?.x ?? 200,
    top: position?.y ?? 50,
    width: config.width + 4, // Account for borders
    height: config.height + 30, // Account for header
  };

  const contentStyle = isMobile ? { flex: 1 } : { height: config.height };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      $isSolitaire={gameType === 'solitaire'}
      style={windowStyle}
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

      <StyledWindowContent style={contentStyle}>
        {isMobile ? (
          <MobileGameContainer>
            <GameFrame
              src={config.url}
              title={config.title}
              style={{
                width: config.width,
                height: config.height,
                transform: `scale(${mobileScale})`,
              }}
            />
          </MobileGameContainer>
        ) : (
          <GameFrame
            src={config.url}
            title={config.title}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        )}
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default GameWindow;
