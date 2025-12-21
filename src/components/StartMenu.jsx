/**
 * ============================================================================
 * START MENU COMPONENT
 * ============================================================================
 *
 * Windows 95-style Start Menu.
 * - Desktop: hover flyout submenus (classic Win95 behavior)
 * - Mobile: click-to-expand inline submenus (touch-friendly)
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator } from 'react95';
import { DECADE_LABELS } from '../utils/constants';
import PixelIcon from './PixelIcon';
import { useMobile } from '../hooks/useMobile';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const MenuContainer = styled.div`
  position: fixed;
  bottom: 50px;
  left: 4px;
  z-index: 110000; /* Higher than everything including taskbar (100000) */

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
  background: #1a1a1a !important;
  border: 2px solid #3a3a3a !important;
  border-right-color: #0a0a0a !important;
  border-bottom-color: #0a0a0a !important;
  box-shadow:
    4px 4px 10px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(0, 255, 65, 0.05);
  min-width: 180px;
  padding: 4px 0 !important;
`;

const StyledMenuItem = styled(MenuListItem)`
  color: #00ff41 !important;
  background: transparent !important;
  padding: 4px 20px 4px 8px;
  position: relative;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  min-height: 0;
  cursor: pointer;

  &:hover {
    background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
    color: #00ff41 !important;
    text-shadow: 0 0 5px rgba(0, 255, 65, 0.4);
  }

  /* Arrow for submenus (desktop) */
  &[data-submenu]::after {
    content: '>';
    position: absolute;
    right: 8px;
    font-size: 10px;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  /* Expandable indicator (mobile) */
  &[data-expandable]::after {
    content: '${props => props.$expanded ? '−' : '+'}';
    position: absolute;
    right: 8px;
    font-size: 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-weight: bold;
  }

  /* Checkmark for selected items */
  &[data-checked="true"] .menu-icon {
    display: none;
  }
  &[data-checked="true"]::before {
    content: '▸';
    font-size: 9px;
    width: 14px;
    color: #00ff41;
  }

  /* Disabled state */
  &[data-disabled="true"] {
    color: rgba(0, 255, 65, 0.3) !important;
    cursor: not-allowed;
    pointer-events: none;
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
  margin: 2px 8px;
  height: 1px;
`;

// Desktop flyout submenu wrapper
const SubmenuWrapper = styled.div`
  position: relative;
`;

// Desktop flyout submenu
const Submenu = styled.div`
  position: absolute;
  left: 100%;
  top: -6px;
  margin-left: -2px;
  z-index: 110001; /* Higher than MenuContainer */
  padding-left: 4px;
`;

// Mobile inline submenu item
const InlineSubmenuItem = styled(StyledMenuItem)`
  padding-left: 28px;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.85) !important;

  &:hover {
    color: #00ff41 !important;
  }

  &::after {
    content: none !important;
  }
`;

// Mobile decade row with arrow navigation
const DecadeRow = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
`;

const DecadeArrow = styled.button`
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #00ff41;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;

  &:hover {
    background: #0a2a0a;
    border-color: #00ff41;
  }

  &:active {
    background: #0d3d0d;
  }
`;

const DecadeLabel = styled.span`
  flex: 1;
  text-align: center;
  color: #00ff41;
  font-size: 11px;
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
  onOpenTrippyGraphics,
  onOpenGame,
  onOpenInfo,
  onOpenSettings,
  onOpenLogin,
  onClose,
  decadeStatus = {},
  isLoading = false,
}) {
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const isMobile = useMobile();

  // Check if a decade is ready (enabled for selection)
  // 'all' requires loading to be complete; individual decades check decadeStatus
  const isDecadeReady = (d) => {
    if (!isLoggedIn) return false;
    if (d === 'all') return !isLoading;
    return decadeStatus[d] === 'ready';
  };

  // Decade cycling for arrow navigation
  // Skip 'all' in rotation - it requires full scan complete
  const DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', 'classic'];

  // Track visual position (can be on any decade, ready or not)
  const [visualDecade, setVisualDecade] = useState(decade);

  // Sync visual decade when prop changes (e.g., from another component)
  useEffect(() => {
    if (DECADES.includes(decade)) {
      setVisualDecade(decade);
    }
  }, [decade]);

  // Get display label for current visual position
  const getDecadeDisplay = () => {
    const label = DECADE_LABELS[visualDecade] || 'ALL';
    const ready = isDecadeReady(visualDecade);
    return ready ? label : `SCANNING ${label}`;
  };

  const cycleDecade = (direction) => {
    const currentIndex = DECADES.indexOf(visualDecade);
    let newIndex;
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === 'next') {
      newIndex = (currentIndex + 1) % DECADES.length;
    } else {
      newIndex = (currentIndex - 1 + DECADES.length) % DECADES.length;
    }

    const newDecade = DECADES[newIndex];
    setVisualDecade(newDecade);

    // Only update the grid if the decade is ready
    if (isDecadeReady(newDecade)) {
      onDecadeChange(newDecade);
    }
  };

  const handleMenuItemClick = (action) => {
    action();
    onClose();
  };

  const toggleSection = (section) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // -------------------------------------------------------------------------
  // MOBILE MENU (click-to-expand)
  // -------------------------------------------------------------------------
  if (isMobile) {
    return (
      <MenuContainer data-start-menu onClick={(e) => e.stopPropagation()}>
        <StyledMenuList>
          {/* Media Player */}
          <StyledMenuItem onClick={() => handleMenuItemClick(onOpenMediaPlayer)}>
            <MenuIcon><PixelIcon name="music" size={14} /></MenuIcon>
            Media Player
          </StyledMenuItem>

          {/* Games - Expandable */}
          <StyledMenuItem
            data-expandable
            $expanded={expandedSection === 'games'}
            onClick={() => toggleSection('games')}
          >
            <MenuIcon><PixelIcon name="gamepad" size={14} /></MenuIcon>
            Games
          </StyledMenuItem>
          {expandedSection === 'games' && (
            <>
              <InlineSubmenuItem onClick={() => handleMenuItemClick(() => onOpenGame('minesweeper'))}>
                Minesweeper
              </InlineSubmenuItem>
              <InlineSubmenuItem onClick={() => handleMenuItemClick(() => onOpenGame('snake'))}>
                Snake
              </InlineSubmenuItem>
              <InlineSubmenuItem onClick={() => handleMenuItemClick(() => onOpenGame('solitaire'))}>
                Solitaire
              </InlineSubmenuItem>
            </>
          )}

          <StyledSeparator />

          {/* Decade Filter with arrow navigation - Only when logged in */}
          {isLoggedIn && (
            <>
              <DecadeRow>
                <DecadeArrow onClick={() => cycleDecade('prev')}>◀</DecadeArrow>
                <DecadeLabel>
                  {getDecadeDisplay()}
                </DecadeLabel>
                <DecadeArrow onClick={() => cycleDecade('next')}>▶</DecadeArrow>
              </DecadeRow>
              <StyledSeparator />
            </>
          )}

          {/* Info */}
          <StyledMenuItem onClick={() => handleMenuItemClick(onOpenInfo)}>
            <MenuIcon><PixelIcon name="info" size={14} /></MenuIcon>
            Info
          </StyledMenuItem>

          {/* Settings */}
          <StyledMenuItem onClick={() => handleMenuItemClick(onOpenSettings)}>
            <MenuIcon><PixelIcon name="sliders" size={14} /></MenuIcon>
            Settings
          </StyledMenuItem>

          <StyledSeparator />

          {/* Connect / Log Out */}
          {isLoggedIn ? (
            <StyledMenuItem onClick={() => handleMenuItemClick(onLogout)}>
              <MenuIcon><PixelIcon name="logout" size={14} /></MenuIcon>
              Log Out
            </StyledMenuItem>
          ) : (
            <StyledMenuItem onClick={() => handleMenuItemClick(onOpenLogin)}>
              <MenuIcon><PixelIcon name="login" size={14} /></MenuIcon>
              Connect
            </StyledMenuItem>
          )}
        </StyledMenuList>
      </MenuContainer>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP MENU (hover flyouts)
  // -------------------------------------------------------------------------
  return (
    <MenuContainer data-start-menu onClick={(e) => e.stopPropagation()}>
      <StyledMenuList>
        {/* Media Player */}
        <StyledMenuItem onClick={() => handleMenuItemClick(onOpenMediaPlayer)}>
          <MenuIcon><PixelIcon name="music" size={14} /></MenuIcon>
          Media Player
        </StyledMenuItem>

        {/* Visualizer */}
        <StyledMenuItem onClick={() => handleMenuItemClick(onOpenTrippyGraphics)}>
          <MenuIcon><PixelIcon name="sparkles" size={14} /></MenuIcon>
          WMP[ish] Visualizations
        </StyledMenuItem>

        {/* Games Submenu - Hover flyout */}
        <SubmenuWrapper
          onMouseEnter={() => setActiveSubmenu('games')}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          <StyledMenuItem data-submenu>
            <MenuIcon><PixelIcon name="gamepad" size={14} /></MenuIcon>
            Games
          </StyledMenuItem>
          {activeSubmenu === 'games' && (
            <Submenu>
              <StyledMenuList>
                <StyledMenuItem onClick={() => handleMenuItemClick(() => onOpenGame('minesweeper'))}>
                  <MenuIcon><PixelIcon name="zap" size={14} /></MenuIcon>
                  Minesweeper
                </StyledMenuItem>
                <StyledMenuItem onClick={() => handleMenuItemClick(() => onOpenGame('snake'))}>
                  <MenuIcon><PixelIcon name="gamepad" size={14} /></MenuIcon>
                  Snake
                </StyledMenuItem>
                <StyledMenuItem onClick={() => handleMenuItemClick(() => onOpenGame('solitaire'))}>
                  <MenuIcon><PixelIcon name="cards" size={14} /></MenuIcon>
                  Solitaire
                </StyledMenuItem>
              </StyledMenuList>
            </Submenu>
          )}
        </SubmenuWrapper>

        <StyledSeparator />

        {/* Decade Filter - Only when logged in */}
        {isLoggedIn && (
          <>
            <DecadeRow>
              <DecadeArrow onClick={() => cycleDecade('prev')}>◀</DecadeArrow>
              <DecadeLabel>
                {getDecadeDisplay()}
              </DecadeLabel>
              <DecadeArrow onClick={() => cycleDecade('next')}>▶</DecadeArrow>
            </DecadeRow>
            <StyledSeparator />
          </>
        )}

        {/* Info */}
        <StyledMenuItem onClick={() => handleMenuItemClick(onOpenInfo)}>
          <MenuIcon><PixelIcon name="info" size={14} /></MenuIcon>
          Info
        </StyledMenuItem>

        {/* Settings */}
        <StyledMenuItem onClick={() => handleMenuItemClick(onOpenSettings)}>
          <MenuIcon><PixelIcon name="sliders" size={14} /></MenuIcon>
          Settings
        </StyledMenuItem>

        <StyledSeparator />

        {/* Connect / Log Out */}
        {isLoggedIn ? (
          <StyledMenuItem onClick={() => handleMenuItemClick(onLogout)}>
            <MenuIcon><PixelIcon name="logout" size={14} /></MenuIcon>
            Log Out
          </StyledMenuItem>
        ) : (
          <StyledMenuItem onClick={() => handleMenuItemClick(onOpenLogin)}>
            <MenuIcon><PixelIcon name="login" size={14} /></MenuIcon>
            Connect
          </StyledMenuItem>
        )}
      </StyledMenuList>
    </MenuContainer>
  );
}

export default StartMenu;
