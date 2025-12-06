/**
 * ============================================================================
 * SETTINGS MODAL COMPONENT
 * ============================================================================
 *
 * Windows 95-style settings window.
 *
 * Contains:
 * - Scanlines toggle
 * - Album count slider (24-120 in increments of 12)
 */

import { useRef } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Fieldset,
} from 'react95';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const MODAL_WIDTH = 300;

const StyledWindow = styled(Window)`
  position: fixed;
  width: ${MODAL_WIDTH}px;
  max-width: 95vw;
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

  /* Mobile: full screen */
  ${props => props.$isMobile && `
    width: 100vw !important;
    max-width: 100vw !important;
    height: calc(100vh - 44px) !important;
    left: 0 !important;
    top: 0 !important;
    border-radius: 0;
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
  font-family: 'Consolas', 'Courier New', monospace;
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
  background: #1a1a1a !important;
  padding: 12px !important;
`;

const StyledFieldset = styled(Fieldset)`
  margin-bottom: 12px;
  background: #0d0d0d !important;
  border-color: #2a2a2a !important;
  padding: 10px !important;

  legend {
    color: #00ff41 !important;
    font-size: 10px;
    font-family: 'Consolas', 'Courier New', monospace;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SettingLabel = styled.label`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.8);
  font-family: 'Consolas', 'Courier New', monospace;
`;

const ToggleButton = styled.button`
  background: ${props => props.$active ? '#0a2a0a' : '#0a0a0a'};
  border: 1px solid ${props => props.$active ? '#00ff41' : '#2a2a2a'};
  color: #00ff41;
  padding: 4px 10px;
  font-size: 10px;
  cursor: pointer;
  font-family: 'Consolas', 'Courier New', monospace;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #0d1a0d;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SliderInput = styled.input`
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #00ff41;
    border-radius: 2px;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #00ff41;
    border-radius: 2px;
    cursor: pointer;
    border: none;
  }
`;

const SliderValue = styled.span`
  font-size: 12px;
  color: #00ff41;
  font-family: 'Consolas', 'Courier New', monospace;
  min-width: 30px;
  text-align: right;
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  font-family: 'Consolas', 'Courier New', monospace;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function SettingsModal({
  isActive,
  zIndex,
  onClose,
  onFocus,
  position,
  onDragStart,
  scanlinesEnabled,
  onToggleScanlines,
  albumCount,
  onAlbumCountChange,
  isMobile,
  isLoggedIn,
  onRescanLibrary,
}) {
  const headerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  // Album count options: 24, 36, 48, 60, 72, 84, 96, 108, 120
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    onAlbumCountChange?.(value);
  };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      style={isMobile ? {} : {
        left: position?.x ?? 200,
        top: position?.y ?? 100,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name="sliders" size={14} />
          <span>Settings</span>
        </HeaderTitle>
        <HeaderButton onClick={onClose}>×</HeaderButton>
      </StyledWindowHeader>

      <StyledWindowContent>
        <StyledFieldset label="DISPLAY">
          <SettingRow>
            <SettingLabel>CRT Scanlines</SettingLabel>
            <ToggleButton
              $active={scanlinesEnabled}
              onClick={onToggleScanlines}
            >
              <PixelIcon name={scanlinesEnabled ? "check" : "close"} size={12} />
              {scanlinesEnabled ? 'ON' : 'OFF'}
            </ToggleButton>
          </SettingRow>
        </StyledFieldset>

        <StyledFieldset label="ALBUM GRID">
          <SliderContainer>
            <SettingRow>
              <SettingLabel>Albums to display</SettingLabel>
              <SliderValue>{albumCount}</SliderValue>
            </SettingRow>
            <SliderRow>
              <SliderInput
                type="range"
                min="24"
                max="120"
                step="12"
                value={albumCount}
                onChange={handleSliderChange}
              />
            </SliderRow>
            <SliderLabels>
              <span>24</span>
              <span>72</span>
              <span>120</span>
            </SliderLabels>
          </SliderContainer>
        </StyledFieldset>

        {/* Library section - only when logged in */}
        {isLoggedIn && (
          <StyledFieldset label="LIBRARY">
            <SettingRow>
              <SettingLabel>Refresh from Spotify</SettingLabel>
              <ToggleButton onClick={onRescanLibrary}>
                <PixelIcon name="sync" size={12} />
                RESCAN
              </ToggleButton>
            </SettingRow>
          </StyledFieldset>
        )}
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default SettingsModal;
