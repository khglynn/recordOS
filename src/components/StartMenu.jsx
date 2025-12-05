/**
 * ============================================================================
 * START MENU COMPONENT
 * ============================================================================
 *
 * Windows 95-style Start Menu with options:
 * - Decade filter (Top 48 from each decade)
 * - Media Player
 * - Games (submenu: Minesweeper, Snake)
 * - Info (contact info)
 * - Log Out (only when logged in)
 *
 * Opens above the taskbar Start button.
 */

import { useState } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator } from 'react95';
import {
  DECADE_OPTIONS,
  DECADE_LABELS,
} from '../utils/constants';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const MenuContainer = styled.div`
  position: fixed;
  bottom: 50px; /* Updated for taller taskbar */
  left: 4px;
  z-index: 10000;

  /* Animation */
  animation: slideUp 0.15s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const StyledMenuList = styled(MenuList)`
  /* Override React95 colors */
  background: #1a1a1a !important;
  border: 2px solid #3a3a3a !important;
  border-right-color: #0a0a0a !important;
  border-bottom-color: #0a0a0a !important;
  box-shadow:
    4px 4px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(0, 255, 65, 0.05);
  min-width: 200px;
  /* Add left padding to make room for the vertical banner */
  padding-left: 26px !important;
`;

const StyledMenuItem = styled(MenuListItem)`
  color: #00ff41 !important;
  background: transparent !important;
  padding: 6px 20px 6px 12px;
  position: relative;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
    color: #00ff41 !important;
    text-shadow: 0 0 5px rgba(0, 255, 65, 0.4);
  }

  /* Arrow for submenus */
  &[data-submenu]::after {
    content: '>';
    position: absolute;
    right: 8px;
    font-size: 10px;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  /* Checkmark for selected items */
  &[data-checked="true"] .menu-icon {
    display: none;
  }
  &[data-checked="true"]::before {
    content: '[*]';
    font-size: 9px;
    font-family: 'Consolas', 'Courier New', monospace;
    width: 14px;
  }
`;

const MenuIcon = styled.span.attrs({ className: 'menu-icon' })`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`;

const StyledSeparator = styled(Separator)`
  background: #2a2a2a !important;
  margin: 4px 8px;
`;

const Submenu = styled.div`
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 2px;
`;

const MenuBanner = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 24px;
  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
`;

const BannerText = styled.span`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  color: #00ff41;
  font-weight: bold;
  font-size: 12px;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  font-family: 'Consolas', 'Courier New', monospace;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function StartMenu({
  isLoggedIn,
  decade,
  onDecadeChange,
  onLogout,
  onOpenMediaPlayer,
  onOpenGame,
  onOpenInfo,
  onOpenLogin,
  onClose,
}) {
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const handleMenuItemClick = (action) => {
    action();
    onClose();
  };

  return (
    <MenuContainer data-start-menu onClick={(e) => e.stopPropagation()}>
      <StyledMenuList>
        <MenuBanner>
          <BannerText>RECORD OS</BannerText>
        </MenuBanner>

        {/* Media Player - Always available */}
        <StyledMenuItem
          onClick={() => handleMenuItemClick(onOpenMediaPlayer)}
        >
          <MenuIcon><PixelIcon name="music" size={14} /></MenuIcon>
          Media Player
        </StyledMenuItem>

        {/* Games Submenu - Always available */}
        <StyledMenuItem
          data-submenu
          onMouseEnter={() => setActiveSubmenu('games')}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <MenuIcon><PixelIcon name="gamepad" size={14} /></MenuIcon>
          Games
          {activeSubmenu === 'games' && (
            <Submenu>
              <StyledMenuList>
                <StyledMenuItem
                  onClick={() => handleMenuItemClick(() => onOpenGame('minesweeper'))}
                >
                  <MenuIcon><PixelIcon name="zap" size={14} /></MenuIcon>
                  Minesweeper
                </StyledMenuItem>
                <StyledMenuItem
                  onClick={() => handleMenuItemClick(() => onOpenGame('snake'))}
                >
                  <MenuIcon><PixelIcon name="gamepad" size={14} /></MenuIcon>
                  Snake
                </StyledMenuItem>
              </StyledMenuList>
            </Submenu>
          )}
        </StyledMenuItem>

        <StyledSeparator />

        {/* Decade Filter - Only when logged in */}
        {isLoggedIn && (
          <>
            <StyledMenuItem
              data-submenu
              onMouseEnter={() => setActiveSubmenu('decade')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              <MenuIcon><PixelIcon name="calendar" size={14} /></MenuIcon>
              Decade: {DECADE_LABELS[decade] || 'All'}
              {activeSubmenu === 'decade' && (
                <Submenu>
                  <StyledMenuList>
                    {Object.entries(DECADE_OPTIONS).map(([key, value]) => (
                      <StyledMenuItem
                        key={key}
                        data-checked={decade === value}
                        onClick={() => handleMenuItemClick(() => onDecadeChange(value))}
                      >
                        <MenuIcon><PixelIcon name="calendar" size={14} /></MenuIcon>
                        {DECADE_LABELS[value]}
                      </StyledMenuItem>
                    ))}
                  </StyledMenuList>
                </Submenu>
              )}
            </StyledMenuItem>

            <StyledSeparator />
          </>
        )}

        {/* Info */}
        <StyledMenuItem
          onClick={() => handleMenuItemClick(onOpenInfo)}
        >
          <MenuIcon><PixelIcon name="info" size={14} /></MenuIcon>
          Info
        </StyledMenuItem>

        <StyledSeparator />

        {/* Connect / Log Out */}
        {isLoggedIn ? (
          <StyledMenuItem
            onClick={() => handleMenuItemClick(onLogout)}
          >
            <MenuIcon><PixelIcon name="logout" size={14} /></MenuIcon>
            Log Out
          </StyledMenuItem>
        ) : (
          <StyledMenuItem
            onClick={() => handleMenuItemClick(onOpenLogin)}
          >
            <MenuIcon><PixelIcon name="login" size={14} /></MenuIcon>
            Connect
          </StyledMenuItem>
        )}
      </StyledMenuList>
    </MenuContainer>
  );
}

export default StartMenu;
