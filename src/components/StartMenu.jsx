/**
 * ============================================================================
 * START MENU COMPONENT
 * ============================================================================
 *
 * Windows 95-style Start Menu with options:
 * - Sort (with submenu for sort options + direction toggle)
 * - Info (contact info + donation button)
 * - Media Player
 * - Games (submenu: Minesweeper, Solitaire, Snake)
 * - Log Out (only when logged in)
 *
 * Opens above the taskbar Start button.
 */

import { useState } from 'react';
import styled from 'styled-components';
import { MenuList, MenuListItem, Separator } from 'react95';
import {
  SORT_OPTIONS,
  SORT_LABELS,
} from '../utils/constants';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const MenuContainer = styled.div`
  position: fixed;
  bottom: 39px;
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
  padding: 6px 20px 6px 30px;
  position: relative;
  font-size: 12px;

  &:hover {
    background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
    color: #00ff41 !important;
  }

  /* Icon placeholder */
  &::before {
    content: attr(data-icon);
    position: absolute;
    left: 8px;
    font-size: 14px;
  }

  /* Arrow for submenus */
  &[data-submenu]::after {
    content: '▶';
    position: absolute;
    right: 8px;
    font-size: 8px;
  }

  /* Checkmark for selected items */
  &[data-checked="true"]::before {
    content: '✓';
    left: 10px;
    font-size: 10px;
  }
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
  font-size: 14px;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
`;

// ============================================================================
// COMPONENT
// ============================================================================

function StartMenu({
  isLoggedIn,
  sortBy,
  sortDesc,
  threshold,
  onSortChange,
  onThresholdChange,
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

  const toggleSortDirection = () => {
    onSortChange(sortBy, !sortDesc);
  };

  return (
    <MenuContainer data-start-menu onClick={(e) => e.stopPropagation()}>
      <StyledMenuList>
        <MenuBanner>
          <BannerText>RECORD OS</BannerText>
        </MenuBanner>

        {/* Media Player - Always available */}
        <StyledMenuItem
          data-icon="🎵"
          onClick={() => handleMenuItemClick(onOpenMediaPlayer)}
        >
          Media Player
        </StyledMenuItem>

        {/* Games Submenu - Always available */}
        <StyledMenuItem
          data-icon="🎮"
          data-submenu
          onMouseEnter={() => setActiveSubmenu('games')}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          Games
          {activeSubmenu === 'games' && (
            <Submenu>
              <StyledMenuList>
                <StyledMenuItem
                  data-icon="💣"
                  onClick={() => handleMenuItemClick(() => onOpenGame('minesweeper'))}
                >
                  Minesweeper
                </StyledMenuItem>
                <StyledMenuItem
                  data-icon="🃏"
                  onClick={() => handleMenuItemClick(() => onOpenGame('solitaire'))}
                >
                  Solitaire
                </StyledMenuItem>
                <StyledMenuItem
                  data-icon="🐍"
                  onClick={() => handleMenuItemClick(() => onOpenGame('snake'))}
                >
                  Snake
                </StyledMenuItem>
              </StyledMenuList>
            </Submenu>
          )}
        </StyledMenuItem>

        <StyledSeparator />

        {/* Sort Options - Only when logged in */}
        {isLoggedIn && (
          <>
            <StyledMenuItem
              data-icon="📊"
              data-submenu
              onMouseEnter={() => setActiveSubmenu('sort')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              Sort
              {activeSubmenu === 'sort' && (
                <Submenu>
                  <StyledMenuList>
                    {Object.entries(SORT_OPTIONS).map(([key, value]) => (
                      <StyledMenuItem
                        key={key}
                        data-checked={sortBy === value}
                        onClick={() => handleMenuItemClick(() => onSortChange(value, sortDesc))}
                      >
                        {SORT_LABELS[value]}
                      </StyledMenuItem>
                    ))}
                    <StyledSeparator />
                    <StyledMenuItem
                      data-checked={sortDesc}
                      onClick={() => handleMenuItemClick(toggleSortDirection)}
                    >
                      {sortBy === SORT_OPTIONS.RELEASE_DATE
                        ? (sortDesc ? 'Newest First' : 'Oldest First')
                        : sortBy === SORT_OPTIONS.TRACK_COUNT
                          ? (sortDesc ? 'Most First' : 'Least First')
                          : (sortDesc ? 'Z → A' : 'A → Z')
                      }
                    </StyledMenuItem>
                  </StyledMenuList>
                </Submenu>
              )}
            </StyledMenuItem>

            {/* Album Filter */}
            <StyledMenuItem
              data-icon="🎚️"
              data-submenu
              onMouseEnter={() => setActiveSubmenu('filter')}
              onMouseLeave={() => setActiveSubmenu(null)}
            >
              Filter: {threshold === 'all' ? 'Show All' : 'Top 50'}
              {activeSubmenu === 'filter' && (
                <Submenu>
                  <StyledMenuList>
                    <StyledMenuItem
                      data-checked={threshold !== 'all'}
                      onClick={() => handleMenuItemClick(() => onThresholdChange('auto'))}
                    >
                      Top 50 Albums
                    </StyledMenuItem>
                    <StyledMenuItem
                      data-checked={threshold === 'all'}
                      onClick={() => handleMenuItemClick(() => onThresholdChange('all'))}
                    >
                      Show All Albums
                    </StyledMenuItem>
                  </StyledMenuList>
                </Submenu>
              )}
            </StyledMenuItem>

            <StyledSeparator />
          </>
        )}

        {/* Info */}
        <StyledMenuItem
          data-icon="ℹ️"
          onClick={() => handleMenuItemClick(onOpenInfo)}
        >
          Info
        </StyledMenuItem>

        <StyledSeparator />

        {/* Connect / Log Out */}
        {isLoggedIn ? (
          <StyledMenuItem
            data-icon="🚪"
            onClick={() => handleMenuItemClick(onLogout)}
          >
            Log Out
          </StyledMenuItem>
        ) : (
          <StyledMenuItem
            data-icon="◉"
            onClick={() => handleMenuItemClick(onOpenLogin)}
          >
            Connect
          </StyledMenuItem>
        )}
      </StyledMenuList>
    </MenuContainer>
  );
}

export default StartMenu;
