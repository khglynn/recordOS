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
 *
 * Updated: 2025-12-11 - Refactored to use WindowFrame
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Fieldset } from 'react95';
import html2canvas from 'html2canvas';
import PixelIcon from './PixelIcon';
import WindowFrame from './WindowFrame';
import { DECADE_LABELS, DECADE_ORDER } from '../utils/constants';

// ============================================================================
// STYLED COMPONENTS (Content-specific only)
// ============================================================================

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
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.4 : 1};
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

const DecadeCountsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #1a1a1a;
`;

const DecadeCountRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const DecadeCountLabel = styled.span`
  color: rgba(0, 255, 65, 0.6);
`;

const DecadeCountValue = styled.span`
  color: #00ff41;
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #1a1a1a;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function SettingsModal({
  isActive,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  position,
  onDragStart,
  scanlinesEnabled,
  onToggleScanlines,
  albumCount,
  onAlbumCountChange,
  isMobile,
  isLoggedIn,
  isLoading = false, // True during library scan - disables rescan button
  onRescanLibrary,
  onShowScanResults,
  unavailableAlbums = [],
  albumsByDecade = {}, // { '2020s': [...], '2010s': [...], ... }
}) {
  // Calculate total albums across all decades
  const totalAlbums = Object.values(albumsByDecade).reduce(
    (sum, albums) => sum + (albums?.length || 0), 0
  );
  // Album count options: 24, 36, 48, 60, 72, 84, 96, 108, 120
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    onAlbumCountChange?.(value);
  };

  // Download error log as JSON file
  const handleDownloadErrorLog = () => {
    if (unavailableAlbums.length === 0) return;

    const logContent = {
      exported: new Date().toISOString(),
      count: unavailableAlbums.length,
      description: 'Albums hidden from grid due to playback restrictions (403 errors)',
      albums: unavailableAlbums,
    };

    const blob = new Blob([JSON.stringify(logContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recordos-error-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export album grid as PNG
  const [isExporting, setIsExporting] = useState(false);
  const handleExportGrid = async () => {
    const gridElement = document.querySelector('[data-album-grid]');
    if (!gridElement) return;

    setIsExporting(true);

    try {
      // Hide UI elements during capture
      document.body.classList.add('export-mode');

      // Wait a frame for CSS to apply
      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(gridElement, {
        backgroundColor: '#0a0a0a',
        scale: 2, // Good quality for sharing
        useCORS: true, // Allow cross-origin images (Spotify CDN)
        logging: false,
      });

      // Download
      const link = document.createElement('a');
      link.download = `recordos-grid-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      document.body.classList.remove('export-mode');
      setIsExporting(false);
    }
  };

  return (
    <WindowFrame
      title="Settings"
      icon="sliders"
      isActive={isActive}
      zIndex={zIndex}
      position={position}
      width={300}
      isMobile={isMobile}
      showMinimize={true}
      onClose={onClose}
      onMinimize={onMinimize}
      onFocus={onFocus}
      onDragStart={onDragStart}
    >
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

          {/* Live decade counts */}
          {isLoggedIn && totalAlbums > 0 && (
            <DecadeCountsList>
              {DECADE_ORDER.map(dec => {
                const count = albumsByDecade[dec]?.length || 0;
                if (count === 0) return null;
                return (
                  <DecadeCountRow key={dec}>
                    <DecadeCountLabel>{DECADE_LABELS[dec]} ▸</DecadeCountLabel>
                    <DecadeCountValue>{count}</DecadeCountValue>
                  </DecadeCountRow>
                );
              })}
              <TotalRow>
                <DecadeCountLabel>TOTAL</DecadeCountLabel>
                <DecadeCountValue>{totalAlbums}</DecadeCountValue>
              </TotalRow>
            </DecadeCountsList>
          )}
        </SliderContainer>
      </StyledFieldset>

      {/* Library section - only when logged in */}
      {isLoggedIn && (
        <StyledFieldset label="LIBRARY">
          <SettingRow>
            <SettingLabel>Refresh from Spotify</SettingLabel>
            <ToggleButton onClick={onRescanLibrary} disabled={isLoading}>
              <PixelIcon name="sync" size={12} />
              {isLoading ? 'SYNCING...' : 'RESCAN'}
            </ToggleButton>
          </SettingRow>
          <SettingRow style={{ marginTop: '8px' }}>
            <SettingLabel>Scan results window</SettingLabel>
            <ToggleButton onClick={onShowScanResults}>
              <PixelIcon name="disc" size={12} />
              SHOW
            </ToggleButton>
          </SettingRow>
        </StyledFieldset>
      )}

      {/* Hidden albums section - only show when there are errors */}
      {isLoggedIn && unavailableAlbums.length > 0 && (
        <StyledFieldset label="HIDDEN ALBUMS">
          <SettingRow>
            <SettingLabel>{unavailableAlbums.length} album{unavailableAlbums.length === 1 ? '' : 's'} restricted</SettingLabel>
            <ToggleButton onClick={handleDownloadErrorLog}>
              <PixelIcon name="download" size={12} />
              LOG
            </ToggleButton>
          </SettingRow>
        </StyledFieldset>
      )}

      {/* Export grid section - only when logged in with albums */}
      {isLoggedIn && totalAlbums > 0 && (
        <StyledFieldset label="EXPORT">
          <SettingRow>
            <SettingLabel>Save grid as image</SettingLabel>
            <ToggleButton onClick={handleExportGrid} disabled={isExporting}>
              <PixelIcon name="download" size={12} />
              {isExporting ? 'SAVING...' : 'PNG'}
            </ToggleButton>
          </SettingRow>
        </StyledFieldset>
      )}
    </WindowFrame>
  );
}

export default SettingsModal;
