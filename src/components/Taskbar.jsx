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
`;

const StartButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  height: 36px;
  font-weight: bold;
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;

  /* Override React95 colors for our theme */
  background: ${props => props.$active
    ? 'linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%)'
    : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)'} !important;
  color: #00ff41 !important;
  border-color: ${props => props.$active ? '#00ff41' : '#3a3a3a'} !important;

  &:hover {
    background: linear-gradient(180deg, #1a3a1a 0%, #0d2d0d 100%) !important;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }

  &:active {
    background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  }
`;

const StartLogo = styled.img`
  width: 24px;
  height: 24px;
  object-fit: contain;
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
`;

const WindowTabs = styled.div`
  display: flex;
  gap: 4px;
  flex: 1;
  overflow: hidden;
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
  padding: 4px 12px;
  height: 32px;

  /* Sunken border effect */
  background: #0d0d0d;
  border: 1px solid #0a0a0a;
  border-right-color: #2a2a2a;
  border-bottom-color: #2a2a2a;
`;

const TrayText = styled.span`
  font-size: 11px;
  color: #00ff41;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
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
  onOpenGame,
  onOpenInfo,
  onOpenLogin,
}) {
  const startButtonRef = useRef(null);

  // Window icons
  const getWindowIcon = (type) => {
    switch (type) {
      case 'trackList': return <PixelIcon name="disc" size={14} />;
      case 'mediaPlayer': return <PixelIcon name="music" size={14} />;
      case 'minesweeper': return <PixelIcon name="zap" size={14} />;
      case 'solitaire': return <PixelIcon name="gamepad" size={14} />;
      case 'snake': return <PixelIcon name="gamepad" size={14} />;
      case 'info': return <PixelIcon name="info" size={14} />;
      default: return <PixelIcon name="folder" size={14} />;
    }
  };

  // Decade display for tray
  const getDecadeDisplay = () => {
    if (!isLoggedIn) return '--:--';
    if (decade === 'classic') return 'circa: pre-80';
    if (!decade || decade === 'all') return null; // Will show icon instead
    return `circa: ${decade}`;
  };

  const showInfinityIcon = isLoggedIn && (!decade || decade === 'all');

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

        {/* Tray Area - Decade Display */}
        <TrayArea>
          <TrayText>
            {showInfinityIcon ? (
              <>circa: <PixelIcon name="repeat" size={12} /></>
            ) : (
              getDecadeDisplay()
            )}
          </TrayText>
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
          onOpenGame={onOpenGame}
          onOpenInfo={onOpenInfo}
          onOpenLogin={onOpenLogin}
          onClose={onStartClick}
        />
      )}
    </>
  );
}

export default Taskbar;
