/**
 * ============================================================================
 * DOWNLOAD MODAL COMPONENT
 * ============================================================================
 *
 * Windows 95-style download/settings window.
 *
 * Contains:
 * - Scanlines toggle
 * - Library refresh controls
 * - Export options (PNG grid, CSV, TXT)
 *
 * Updated: 2025-12-22 - Renamed from SettingsModal, removed threshold slider
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Fieldset } from 'react95';
import html2canvas from 'html2canvas';
import PixelIcon from './PixelIcon';
import WindowFrame from './WindowFrame';
import { DECADE_LABELS, DECADE_ORDER, DECADE_OPTIONS } from '../utils/constants';

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

const DecadeNav = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DecadeArrow = styled.button`
  background: transparent;
  border: none;
  color: #00ff41;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const DecadeDisplay = styled.span`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: #00ff41;
  min-width: 60px;
  text-align: center;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function DownloadModal({
  isActive,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  position,
  onDragStart,
  scanlinesEnabled,
  onToggleScanlines,
  isMobile,
  isLoggedIn,
  isLoading = false, // True during library scan - disables rescan button
  onRescanLibrary,
  onShowScanResults,
  unavailableAlbums = [],
  albumsByDecade = {}, // { '2020s': [...], '2010s': [...], ... }
  userName = '', // For export filename
  decade = 'all', // Current decade filter for export filename
  onChangeDecade, // Callback to change the decade filter
  decadeStatus = {}, // { '2020s': 'ready', '2010s': 'loading', ... }
}) {
  // Decade options for cycling: 'all' first, then each decade (newest to oldest)
  const DECADES = [DECADE_OPTIONS.ALL, ...DECADE_ORDER];

  // Check if a decade is ready (has finished loading)
  const isDecadeReady = (d) => {
    if (d === 'all') return !isLoading; // 'all' ready when scan complete
    return decadeStatus[d] === 'ready';
  };

  // Get ready decades for navigation
  const readyDecades = DECADES.filter(d => isDecadeReady(d));
  const hasReadyDecades = readyDecades.length > 0;

  // Navigate to previous ready decade
  const handlePrevDecade = () => {
    if (!hasReadyDecades) return;
    const currentIndex = readyDecades.indexOf(decade);
    let newIndex;
    if (currentIndex === -1) {
      newIndex = 0;
    } else {
      newIndex = currentIndex <= 0 ? readyDecades.length - 1 : currentIndex - 1;
    }
    onChangeDecade?.(readyDecades[newIndex]);
  };

  // Navigate to next ready decade
  const handleNextDecade = () => {
    if (!hasReadyDecades) return;
    const currentIndex = readyDecades.indexOf(decade);
    let newIndex;
    if (currentIndex === -1) {
      newIndex = 0;
    } else {
      newIndex = currentIndex >= readyDecades.length - 1 ? 0 : currentIndex + 1;
    }
    onChangeDecade?.(readyDecades[newIndex]);
  };

  // Display label for current decade
  const getDecadeDisplay = () => {
    return DECADE_LABELS[decade] || decade;
  };
  // Calculate total albums across all decades
  const totalAlbums = Object.values(albumsByDecade).reduce(
    (sum, albums) => sum + (albums?.length || 0), 0
  );

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

  // Export album grid as PNG with terminal flair
  // States: idle → init → render → compress → success | error
  const [exportState, setExportState] = useState('idle');
  const handleExportGrid = async () => {
    const container = document.querySelector('[data-album-grid]');
    const grid = document.querySelector('[data-album-grid-inner]');
    if (!container || !grid) return;

    // Terminal-style staged export
    setExportState('init');
    await new Promise(r => setTimeout(r, 400));

    // Store original styles to restore later
    const originalContainerStyle = {
      overflow: container.style.overflow,
      height: container.style.height,
    };
    const originalGridStyle = {
      overflow: grid.style.overflow,
      height: grid.style.height,
      position: grid.style.position,
    };

    // Detect Safari or mobile - needs lower scale to avoid hanging/memory issues
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    // Use scale 1 for Safari, mobile, or large grids (>60 albums), scale 2 otherwise
    const exportScale = (isSafari || isMobileDevice || totalAlbums > 60) ? 1 : 2;

    try {
      // Hide UI elements during capture
      document.body.classList.add('export-mode');

      // Expand container and grid to show all albums
      container.style.overflow = 'visible';
      container.style.height = 'auto';
      grid.style.overflow = 'visible';
      grid.style.height = 'auto';
      grid.style.position = 'relative'; // Remove absolute positioning

      setExportState('render');
      // Wait for layout to settle
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 300)); // Extra time for images

      // Race html2canvas against a timeout (Safari can hang on large grids)
      const timeoutMs = 30000;
      const canvas = await Promise.race([
        html2canvas(grid, {
          backgroundColor: '#0a0a0a',
          scale: exportScale,
          useCORS: true, // Allow cross-origin images (Spotify CDN)
          logging: false,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Export timed out')), timeoutMs)
        ),
      ]);

      setExportState('compress');
      await new Promise(r => setTimeout(r, 300));

      // Download with descriptive filename
      // Format: [username]_albums_[decade].png
      const safeUserName = (userName || 'user').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const decadeLabel = decade === 'all' ? 'all-time' : `${DECADE_LABELS[decade] || decade}`;

      const link = document.createElement('a');
      link.download = `${safeUserName}_albums_${decadeLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setExportState('success');
      setTimeout(() => setExportState('idle'), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 2000);
    } finally {
      // Restore original styles
      container.style.overflow = originalContainerStyle.overflow;
      container.style.height = originalContainerStyle.height;
      grid.style.overflow = originalGridStyle.overflow;
      grid.style.height = originalGridStyle.height;
      grid.style.position = originalGridStyle.position;
      document.body.classList.remove('export-mode');
    }
  };

  // Get export button label based on state (terminal flair)
  const getExportLabel = () => {
    switch (exportState) {
      case 'init': return 'INIT...';
      case 'render': return 'RENDER...';
      case 'compress': return 'COMPRESS...';
      case 'success': return 'COMPLETE';
      case 'error': return 'FAILED';
      default: return 'EXPORT';
    }
  };

  // Get albums for export (selected decade or all)
  const getExportAlbums = () => {
    if (decade === 'all') {
      // Flatten all decades
      const albums = [];
      DECADE_ORDER.forEach(dec => {
        if (albumsByDecade[dec]) {
          albums.push(...albumsByDecade[dec]);
        }
      });
      return albums;
    }
    return albumsByDecade[decade] || [];
  };

  // Export album list as TXT (terminal style)
  const handleExportTXT = () => {
    const albumsToExport = getExportAlbums();
    if (albumsToExport.length === 0) return;

    const safeUserName = (userName || 'user').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const decadeLabel = decade === 'all' ? 'ALL TIME' : DECADE_LABELS[decade] || decade;
    const dateStr = new Date().toISOString().split('T')[0];

    // Terminal-style header
    let content = `RECORD OS // TOP ${albumsToExport.length} ALBUMS // ${decadeLabel}\n`;
    content += `USER: ${safeUserName}\n`;
    content += `GENERATED: ${dateStr}\n`;
    content += `\n${'='.repeat(60)}\n\n`;

    // Album list
    albumsToExport.forEach((album, i) => {
      const year = album.releaseDate?.split('-')[0] || '????';
      content += `${String(i + 1).padStart(2, '0')}. ${album.name} - ${album.artist} (${year}) // ${album.likedTracks} saved\n`;
    });

    content += `\n${'='.repeat(60)}\n`;
    content += `// END TRANSMISSION //\n`;

    // Download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeUserName.toLowerCase()}_albums_${decade === 'all' ? 'all-time' : DECADE_LABELS[decade] || decade}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export album list as CSV
  const handleExportCSV = () => {
    const albumsToExport = getExportAlbums();
    if (albumsToExport.length === 0) return;

    // CSV header and rows
    const headers = ['Album', 'Artist', 'Year', 'Liked Tracks', 'Total Tracks'];
    const rows = albumsToExport.map(album => [
      `"${(album.name || '').replace(/"/g, '""')}"`,
      `"${(album.artist || '').replace(/"/g, '""')}"`,
      album.releaseDate?.split('-')[0] || '',
      album.likedTracks || 0,
      album.totalTracks || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download
    const safeUserName = (userName || 'user').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const decadeLabel = decade === 'all' ? 'all-time' : `${DECADE_LABELS[decade] || decade}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeUserName}_albums_${decadeLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <WindowFrame
      title="Download Grid"
      icon="download"
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

      {/* Decade selector - only when logged in */}
      {isLoggedIn && (
        <StyledFieldset label="DECADE">
          <SettingRow>
            <SettingLabel>Filter grid by era</SettingLabel>
            <DecadeNav>
              <DecadeArrow
                onClick={handlePrevDecade}
                disabled={!hasReadyDecades}
                title="Previous era"
              >
                <PixelIcon name="chevronLeft" size={14} />
              </DecadeArrow>
              <DecadeDisplay>{getDecadeDisplay()}</DecadeDisplay>
              <DecadeArrow
                onClick={handleNextDecade}
                disabled={!hasReadyDecades}
                title="Next era"
              >
                <PixelIcon name="chevronRight" size={14} />
              </DecadeArrow>
            </DecadeNav>
          </SettingRow>
        </StyledFieldset>
      )}

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

      {/* Export section - only when logged in with albums */}
      {isLoggedIn && totalAlbums > 0 && (
        <StyledFieldset label="EXPORT">
          {!isMobile && (
            <SettingRow>
              <SettingLabel>Grid image (.png)</SettingLabel>
              <ToggleButton
                onClick={handleExportGrid}
                disabled={['init', 'render', 'compress'].includes(exportState)}
                $active={exportState === 'success'}
              >
                <PixelIcon name={exportState === 'success' ? 'check' : exportState === 'error' ? 'close' : 'image'} size={12} />
                {getExportLabel()}
              </ToggleButton>
            </SettingRow>
          )}
          <SettingRow style={{ marginTop: isMobile ? 0 : '8px' }}>
            <SettingLabel>Album list (.txt)</SettingLabel>
            <ToggleButton onClick={handleExportTXT}>
              <PixelIcon name="file" size={12} />
              TXT
            </ToggleButton>
          </SettingRow>
          <SettingRow style={{ marginTop: '8px' }}>
            <SettingLabel>Album list (.csv)</SettingLabel>
            <ToggleButton onClick={handleExportCSV}>
              <PixelIcon name="file" size={12} />
              CSV
            </ToggleButton>
          </SettingRow>
        </StyledFieldset>
      )}
    </WindowFrame>
  );
}

export default DownloadModal;
