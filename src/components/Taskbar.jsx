/**
 * ============================================================================
 * TASKBAR COMPONENT
 * ============================================================================
 *
 * Windows 95-style taskbar at the bottom of the screen.
 *
 * Contains:
 * - Start button (Record OS logo + text) -> Opens Start Menu
 * - Open window tabs (Track List, Media Player, Games)
 * - Right side: Album count : Track threshold (instead of time)
 */

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Toolbar } from 'react95';
import StartMenu from './StartMenu';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const TaskbarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  z-index: 100000; /* Higher than LoginModal (10000) to always be visible */

  /* Win95 raised border effect */
  background: #1a1a1a;
  border-top: 2px solid #3a3a3a;
  box-shadow:
    inset 0 1px 0 #2a2a2a,
    0 -2px 10px rgba(0, 0, 0, 0.5);

  display: flex;
  align-items: center;
  padding: 4px 6px;
  gap: 6px;

  /* Mobile: shorter height */
  @media (max-width: 767px) {
    height: 44px;
    padding: 2px 4px;
  }
`;

const StartButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 20px 4px 12px;
  height: 40px;
  font-weight: bold;
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 2px;
  text-transform: uppercase;

  /* Terminal style - flat dark with subtle inner glow */
  background: #050505 !important;
  color: #00ff41 !important;
  border: 1px solid #1a1a1a !important;
  box-shadow:
    inset 0 0 20px rgba(0, 255, 65, 0.03),
    inset 0 0 4px rgba(0, 255, 65, 0.05);

  /* Active/pressed state */
  ${props => props.$active && `
    background: #0a0f0a !important;
    box-shadow:
      inset 0 0 30px rgba(0, 255, 65, 0.08),
      inset 0 0 6px rgba(0, 255, 65, 0.1),
      0 0 8px rgba(0, 255, 65, 0.15);
    text-shadow: 0 0 8px rgba(0, 255, 65, 0.5);
  `}

  &:hover {
    background: #080a08 !important;
    box-shadow:
      inset 0 0 25px rgba(0, 255, 65, 0.05),
      0 0 4px rgba(0, 255, 65, 0.1);
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.4);
  }

  &:active {
    background: #050505 !important;
  }
`;

const StartLogo = styled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(0, 255, 65, 0.5));
`;

const TaskbarDivider = styled.div`
  width: 2px;
  height: 32px;
  background: linear-gradient(
    180deg,
    #0a0a0a 0%,
    #2a2a2a 50%,
    #0a0a0a 100%
  );
  margin: 0 4px;

  /* Hide on mobile */
  @media (max-width: 767px) {
    display: none;
  }
`;

const WindowTabs = styled.div`
  display: flex;
  gap: 4px;
  flex: 1;
  overflow: hidden;

  /* Hide on mobile - Start Menu only */
  @media (max-width: 767px) {
    display: none;
  }
`;

const WindowTab = styled(Button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  height: 32px;
  max-width: 200px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;

  /* Active window has different style */
  background: ${props => props.$active
    ? 'linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%)'
    : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)'} !important;
  color: #00ff41 !important;
  border-color: ${props => props.$active ? '#00ff41' : '#3a3a3a'} !important;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: linear-gradient(180deg, #1a3a1a 0%, #0a2a0a 100%) !important;
    text-shadow: 0 0 5px rgba(0, 255, 65, 0.4);
  }
`;

const TabIcon = styled.span`
  font-size: 14px;
  flex-shrink: 0;
`;

const TrayArea = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  height: 32px;

  /* Sunken border effect */
  background: #0d0d0d;
  border: 1px solid #0a0a0a;
  border-right-color: #2a2a2a;
  border-bottom-color: #2a2a2a;

  /* Hide on mobile - decade controls in Start Menu only */
  @media (max-width: 767px) {
    display: none;
  }
`;

const TrayText = styled.span`
  font-size: 11px;
  color: #00ff41;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
  min-width: 70px;
  text-align: center;
`;

const DecadeArrow = styled.button`
  background: transparent;
  border: none;
  color: #00ff41;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }

  &:disabled {
    opacity: 0.2;
    cursor: default;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function Taskbar({
  albumCount,
  openWindows,
  activeWindow,
  onWindowClick,
  onStartClick,
  isStartMenuOpen,
  isLoggedIn,
  decade,
  onDecadeChange,
  onLogout,
  onOpenMediaPlayer,
  onOpenTrippyGraphics,
  onOpenGame,
  onOpenInfo,
  onOpenSettings,
  onOpenLogin,
}) {
  const startButtonRef = useRef(null);

  // Window icons
  const getWindowIcon = (type) => {
    switch (type) {
      case 'trackList': return <PixelIcon name="disc" size={14} />;
      case 'mediaPlayer': return <PixelIcon name="music" size={14} />;
      case 'trippyGraphics': return <PixelIcon name="sparkles" size={14} />;
      case 'minesweeper': return <PixelIcon name="zap" size={14} />;
      case 'solitaire': return <PixelIcon name="gamepad" size={14} />;
      case 'snake': return <PixelIcon name="gamepad" size={14} />;
      case 'info': return <PixelIcon name="info" size={14} />;
      case 'settings': return <PixelIcon name="sliders" size={14} />;
      default: return <PixelIcon name="folder" size={14} />;
    }
  };

  // Decade options for cycling
  const DECADES = ['all', 'classic', '1980s', '1990s', '2000s', '2010s', '2020s'];

  // Decade display for tray
  const getDecadeDisplay = () => {
    if (!isLoggedIn) return '--:--';
    if (decade === 'classic') return 'pre-80';
    if (!decade || decade === 'all') return null; // Will show icon instead
    return decade;
  };

  const showInfinityIcon = isLoggedIn && (!decade || decade === 'all');

  // Navigate decades
  const currentIndex = DECADES.indexOf(decade || 'all');

  const handlePrevDecade = () => {
    const newIndex = currentIndex <= 0 ? DECADES.length - 1 : currentIndex - 1;
    onDecadeChange?.(DECADES[newIndex]);
  };

  const handleNextDecade = () => {
    const newIndex = currentIndex >= DECADES.length - 1 ? 0 : currentIndex + 1;
    onDecadeChange?.(DECADES[newIndex]);
  };

  return (
    <>
      <TaskbarContainer>
        {/* Start Button */}
        <StartButton
          ref={startButtonRef}
          $active={isStartMenuOpen}
          onClick={onStartClick}
          data-start-button
        >
          <StartLogo src="/logo.png" alt="Record OS" />
          <span>RECORD OS</span>
        </StartButton>

        <TaskbarDivider />

        {/* Open Window Tabs */}
        <WindowTabs>
          {openWindows.map((window) => (
            <WindowTab
              key={window.id}
              $active={activeWindow === window.id}
              onClick={() => onWindowClick(window.id)}
            >
              <TabIcon>{getWindowIcon(window.type)}</TabIcon>
              <span>{window.title}</span>
            </WindowTab>
          ))}
        </WindowTabs>

        {/* Tray Area - Decade Display with Navigation */}
        <TrayArea>
          {isLoggedIn && (
            <DecadeArrow onClick={handlePrevDecade} title="Previous era">
              <PixelIcon name="chevronLeft" size={12} />
            </DecadeArrow>
          )}
          <TrayText>
            {showInfinityIcon ? (
              <>circa: <PixelIcon name="repeat" size={12} /></>
            ) : (
              <>circa: {getDecadeDisplay()}</>
            )}
          </TrayText>
          {isLoggedIn && (
            <DecadeArrow onClick={handleNextDecade} title="Next era">
              <PixelIcon name="chevronRight" size={12} />
            </DecadeArrow>
          )}
        </TrayArea>
      </TaskbarContainer>

      {/* Start Menu (positioned above taskbar) */}
      {isStartMenuOpen && (
        <StartMenu
          isLoggedIn={isLoggedIn}
          decade={decade}
          onDecadeChange={onDecadeChange}
          onLogout={onLogout}
          onOpenMediaPlayer={onOpenMediaPlayer}
          onOpenTrippyGraphics={onOpenTrippyGraphics}
          onOpenGame={onOpenGame}
          onOpenInfo={onOpenInfo}
          onOpenSettings={onOpenSettings}
          onOpenLogin={onOpenLogin}
          onClose={onStartClick}
        />
      )}
    </>
  );
}

export default Taskbar;
