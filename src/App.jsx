/**
 * ============================================================================
 * RECORD OS - MAIN APPLICATION
 * ============================================================================
 *
 * A nostalgic music visualization app in Windows 95 style.
 *
 * Architecture:
 * - Desktop: Album grid background (empty grid pre-login, albums post-login)
 * - Taskbar: Start menu, open windows, album count display
 * - Windows: Login, Track List, Media Player, Games, Info
 *
 * State Management:
 * - useSpotify hook for auth, library, and Spotify playback
 * - useLocalAudio hook for pre-login demo track playback
 * - Local state for window management (open, position, z-index)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider } from 'styled-components';
import { styleReset } from 'react95';
import { createGlobalStyle } from 'styled-components';

// Components
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import LoginModal from './components/LoginModal';
import TrackListModal from './components/TrackListModal';
import MediaPlayer from './components/MediaPlayer';
import TrippyGraphics from './components/TrippyGraphics';
import GameWindow from './components/GameWindow';
import InfoModal from './components/InfoModal';
import SettingsModal from './components/SettingsModal';
import LoadingWindow from './components/LoadingWindow';
import LoadedModal from './components/LoadedModal';

// Hooks
import { useSpotify } from './hooks/useSpotify';
import { useLocalAudio } from './hooks/useLocalAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Styles
import { recordOSTheme } from './styles/theme';
import GlobalStyles from './styles/GlobalStyles';

// ============================================================================
// REACT95 STYLE RESET
// ============================================================================

const React95Reset = createGlobalStyle`
  ${styleReset}
`;

// ============================================================================
// WINDOW MANAGEMENT HELPERS
// ============================================================================

// Generate unique window ID
const generateWindowId = () => `window-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Initial window positions (staggered)
const getInitialPosition = (index) => ({
  x: 100 + (index * 30),
  y: 80 + (index * 30),
});

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  // -------------------------------------------------------------------------
  // HOOKS
  // -------------------------------------------------------------------------

  const spotify = useSpotify();
  const localAudio = useLocalAudio();

  // Use Spotify when logged in, local audio otherwise
  const isLoggedIn = spotify.loggedIn;
  const audio = isLoggedIn ? spotify : localAudio;

  // -------------------------------------------------------------------------
  // WINDOW STATE
  // -------------------------------------------------------------------------

  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(null);

  // Track selected album for track list
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  // -------------------------------------------------------------------------
  // VISUAL SETTINGS
  // -------------------------------------------------------------------------

  // Scanlines toggle - persisted to localStorage
  const [scanlinesEnabled, setScanlinesEnabled] = useState(() => {
    const saved = localStorage.getItem('recordos_scanlines');
    return saved !== null ? saved === 'true' : true; // Default: on
  });

  // Persist scanlines setting
  useEffect(() => {
    localStorage.setItem('recordos_scanlines', scanlinesEnabled.toString());
    // Add/remove class on body for global CSS targeting
    document.body.classList.toggle('scanlines-disabled', !scanlinesEnabled);
  }, [scanlinesEnabled]);

  // Album count setting - persisted to localStorage (default 48)
  const [displayAlbumCount, setDisplayAlbumCount] = useState(() => {
    const saved = localStorage.getItem('recordos_album_count');
    return saved ? parseInt(saved) : 48;
  });

  // Persist album count setting
  useEffect(() => {
    localStorage.setItem('recordos_album_count', displayAlbumCount.toString());
  }, [displayAlbumCount]);

  // Loading window position (separate from managed windows for simplicity)
  const [loadingWindowPos, setLoadingWindowPos] = useState(null);

  // Track when loading completes to show loaded modal
  const [showLoadedModal, setShowLoadedModal] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);

  // Detect when loading transitions from true to false (completed)
  useEffect(() => {
    if (spotify.isLoading) {
      setWasLoading(true);
    } else if (wasLoading && !spotify.isLoading && spotify.allAlbumsCount > 0) {
      // Loading just finished, show the loaded modal
      setShowLoadedModal(true);
      setWasLoading(false);
    }
  }, [spotify.isLoading, wasLoading, spotify.allAlbumsCount]);

  // Calculate top decade from albums
  const getTopDecade = () => {
    if (spotify.albums.length === 0) return null;
    const decadeCounts = {};
    spotify.albums.forEach(album => {
      const year = parseInt(album.releaseDate?.split('-')[0]);
      if (year) {
        const decade = Math.floor(year / 10) * 10;
        decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
      }
    });
    const topDecade = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0];
    return topDecade ? `${topDecade[0]}s` : null;
  };

  // Calculate total tracks
  const getTotalTracks = () => {
    return spotify.albums.reduce((sum, album) => sum + (album.likedTracks || 0), 0);
  };

  // -------------------------------------------------------------------------
  // LOGIN FLOW STATE
  // -------------------------------------------------------------------------

  // Step 1: Show login modal on first load or when logged out
  // Step 2: After OAuth, show config modal
  // Step 3: After execute, show the app

  // Check if user has cached albums to avoid modal flash on page refresh
  const hasCachedAlbums = () => {
    const cached = localStorage.getItem('recordos_albums_cache');
    const cacheTime = localStorage.getItem('recordos_albums_cache_time');
    if (cached && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      return age < 60 * 60 * 1000; // 1 hour cache
    }
    return false;
  };

  // Don't show login modal if user is logged in with valid cached albums
  const [loginModalOpen, setLoginModalOpen] = useState(() => {
    return !(isLoggedIn && hasCachedAlbums());
  });
  const [showConfigStep, setShowConfigStep] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(() => {
    return isLoggedIn && hasCachedAlbums();
  });

  // Check if user just returned from OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has('code');

    if (hasCode) {
      // User just came back from Spotify OAuth - show config step
      setShowConfigStep(true);
      setLoginModalOpen(true);
    } else if (isLoggedIn && !hasCompletedSetup) {
      // Already logged in from previous session - show config
      setShowConfigStep(true);
      setLoginModalOpen(true);
    } else if (isLoggedIn && hasCompletedSetup) {
      // Fully set up - hide modal
      setLoginModalOpen(false);
    }
  }, [isLoggedIn, hasCompletedSetup]);

  // Mark setup complete once loading starts OR albums are loaded (from cache)
  useEffect(() => {
    if (isLoggedIn && (spotify.isLoading || spotify.allAlbumsCount > 0)) {
      // Loading or albums ready - close modal and show desktop
      setHasCompletedSetup(true);
      setLoginModalOpen(false);
    }
  }, [isLoggedIn, spotify.isLoading, spotify.allAlbumsCount]);

  // -------------------------------------------------------------------------
  // PRE-LOGIN: Open initial windows (Minesweeper, Media Player muted)
  // -------------------------------------------------------------------------
  const [hasOpenedInitialWindows, setHasOpenedInitialWindows] = useState(false);

  useEffect(() => {
    if (!isLoggedIn && !hasOpenedInitialWindows) {
      // Calculate positions: Minesweeper upper right, Media Player lower right
      // Minesweeper is ~280px wide, Media Player is ~320px wide
      const minesweeperX = window.innerWidth - 280 - 24; // 24px inset from right
      const mediaPlayerX = window.innerWidth - 320 - 24;
      const mediaPlayerY = window.innerHeight - 48 - 200 - 24; // 48px taskbar, ~200px player height, 24px inset

      const minesweeperWindow = {
        id: generateWindowId(),
        type: 'minesweeper',
        title: 'Minesweeper',
        data: {},
        position: { x: minesweeperX, y: 24 }, // Upper right, 24px from top
        minimized: false,
      };

      const mediaPlayerWindow = {
        id: generateWindowId(),
        type: 'mediaPlayer',
        title: 'Media Player',
        data: {},
        position: { x: mediaPlayerX, y: mediaPlayerY }, // Lower right
        minimized: false,
      };

      setWindows([minesweeperWindow, mediaPlayerWindow]);
      setActiveWindowId(mediaPlayerWindow.id);
      setHasOpenedInitialWindows(true);

      // Start local audio muted
      if (localAudio.setVolume) {
        localAudio.setVolume(0);
      }
    }
  }, [isLoggedIn, hasOpenedInitialWindows, localAudio]);

  // -------------------------------------------------------------------------
  // WINDOW MANAGEMENT
  // -------------------------------------------------------------------------

  const openWindow = useCallback((type, data = {}) => {
    const existingWindow = windows.find(w => w.type === type && w.data?.id === data?.id);

    if (existingWindow) {
      // Focus existing window
      setActiveWindowId(existingWindow.id);
      setWindows(prev => prev.map(w => ({
        ...w,
        minimized: w.id === existingWindow.id ? false : w.minimized,
      })));
      return;
    }

    const id = generateWindowId();
    const position = getInitialPosition(windows.length);

    let title = '';
    switch (type) {
      case 'trackList':
        title = data.name || 'Track List';
        break;
      case 'mediaPlayer':
        title = 'Media Player';
        break;
      case 'minesweeper':
        title = 'Minesweeper';
        break;
      case 'solitaire':
        title = 'Solitaire';
        break;
      case 'snake':
        title = 'Snake';
        break;
      case 'trippyGraphics':
        title = 'Trippy Graphics';
        break;
      case 'info':
        title = 'About Record OS';
        break;
      default:
        title = 'Window';
    }

    const newWindow = {
      id,
      type,
      title,
      data,
      position,
      minimized: false,
    };

    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(id);
  }, [windows]);

  const closeWindow = useCallback((windowId) => {
    // Check if closing media player - stop music
    const windowToClose = windows.find(w => w.id === windowId);
    if (windowToClose?.type === 'mediaPlayer') {
      // Stop playback
      if (audio.isPlaying) {
        audio.pause?.();
      }
    }

    setWindows(prev => prev.filter(w => w.id !== windowId));

    if (activeWindowId === windowId) {
      setActiveWindowId(windows.length > 1 ? windows[windows.length - 2]?.id : null);
    }
  }, [activeWindowId, windows, audio]);

  const minimizeWindow = useCallback((windowId) => {
    setWindows(prev => prev.map(w =>
      w.id === windowId ? { ...w, minimized: true } : w
    ));

    if (activeWindowId === windowId) {
      const visibleWindows = windows.filter(w => !w.minimized && w.id !== windowId);
      setActiveWindowId(visibleWindows.length > 0 ? visibleWindows[visibleWindows.length - 1].id : null);
    }
  }, [activeWindowId, windows]);

  const focusWindow = useCallback((windowId) => {
    setActiveWindowId(windowId);
    setWindows(prev => prev.map(w =>
      w.id === windowId ? { ...w, minimized: false } : w
    ));
  }, []);

  const toggleWindowFromTaskbar = useCallback((windowId) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    if (window.minimized) {
      focusWindow(windowId);
    } else if (activeWindowId === windowId) {
      minimizeWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  }, [windows, activeWindowId, focusWindow, minimizeWindow]);

  // -------------------------------------------------------------------------
  // WINDOW DRAGGING - Win95 Outline Style
  // -------------------------------------------------------------------------
  // Shows a dotted outline during drag, snaps window on release.
  // No React state updates during drag = no performance issues.

  const dragOutlineRef = useRef(null);

  const handleDragStart = useCallback((windowId, e) => {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;

    // Get window element dimensions
    const windowEl = e.target.closest('[data-window]');
    const rect = windowEl?.getBoundingClientRect();

    setDragging({
      windowId,
      startX: e.clientX - win.position.x,
      startY: e.clientY - win.position.y,
      width: rect?.width || 400,
      height: rect?.height || 300,
      initialX: win.position.x,
      initialY: win.position.y,
    });
  }, [windows]);

  useEffect(() => {
    if (!dragging) return;

    // Create outline element (pure DOM, no React)
    const outline = document.createElement('div');
    outline.style.cssText = `
      position: fixed;
      border: 2px dashed #00ff41;
      pointer-events: none;
      z-index: 999999;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
      left: ${dragging.initialX}px;
      top: ${dragging.initialY}px;
      width: ${dragging.width}px;
      height: ${dragging.height}px;
    `;
    document.body.appendChild(outline);
    dragOutlineRef.current = outline;

    let currentX = dragging.initialX;
    let currentY = dragging.initialY;

    const handleMouseMove = (e) => {
      currentX = Math.max(0, e.clientX - dragging.startX);
      currentY = Math.max(0, e.clientY - dragging.startY);
      outline.style.left = `${currentX}px`;
      outline.style.top = `${currentY}px`;
    };

    const handleMouseUp = () => {
      // Remove outline
      outline.remove();
      dragOutlineRef.current = null;

      // Update window position (single state update)
      setWindows(prev => prev.map(w =>
        w.id === dragging.windowId
          ? { ...w, position: { x: currentX, y: currentY } }
          : w
      ));
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      outline.remove();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);


  // -------------------------------------------------------------------------
  // EVENT HANDLERS
  // -------------------------------------------------------------------------

  const handleAlbumClick = useCallback((album) => {
    setSelectedAlbum(album);
    openWindow('trackList', album);
  }, [openWindow]);

  const handleOpenMediaPlayer = useCallback(() => {
    openWindow('mediaPlayer');
  }, [openWindow]);

  const handleOpenGame = useCallback((gameType) => {
    // Games work before login - minimize modal if open
    if (loginModalOpen && !isLoggedIn) {
      setLoginModalOpen(false);
    }
    openWindow(gameType);
  }, [openWindow, loginModalOpen, isLoggedIn]);

  const handleOpenInfo = useCallback(() => {
    openWindow('info');
  }, [openWindow]);

  const handleOpenSettings = useCallback(() => {
    openWindow('settings');
  }, [openWindow]);

  const handleOpenTrippyGraphics = useCallback(() => {
    openWindow('trippyGraphics');
  }, [openWindow]);

  const handleOpenLogin = useCallback(() => {
    setShowConfigStep(false);
    setLoginModalOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    spotify.logout();
    setHasCompletedSetup(false);
    setShowConfigStep(false);
    setLoginModalOpen(true);
    setWindows([]);
    setSelectedAlbum(null);
  }, [spotify]);

  const handleStartClick = useCallback(() => {
    setIsStartMenuOpen(prev => !prev);
  }, []);

  const handleExecute = useCallback(() => {
    // Trigger library fetch
    spotify.refreshLibrary();
  }, [spotify]);

  const handleRescanLibrary = useCallback(() => {
    // Force refresh library - bypass cache
    spotify.refreshLibrary(true);
  }, [spotify]);

  // Close start menu when clicking elsewhere
  // Using mousedown instead of click, and checking target
  useEffect(() => {
    if (!isStartMenuOpen) return;

    const handleClickOutside = (e) => {
      // Don't close if clicking inside start menu or start button
      const startMenu = document.querySelector('[data-start-menu]');
      const startButton = document.querySelector('[data-start-button]');

      if (startMenu?.contains(e.target) || startButton?.contains(e.target)) {
        return;
      }

      setIsStartMenuOpen(false);
    };

    // Small delay to avoid closing immediately on the opening click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStartMenuOpen]);

  // -------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // -------------------------------------------------------------------------

  // Close active window handler for keyboard
  const closeActiveWindowViaKeyboard = useCallback(() => {
    if (activeWindowId) {
      setWindows(prev => prev.filter(w => w.id !== activeWindowId));
      setActiveWindowId(null);
    }
  }, [activeWindowId]);

  useKeyboardShortcuts({
    isPlaying: audio.isPlaying,
    onPlay: audio.play,
    onPause: audio.pause,
    onNext: audio.next,
    onPrevious: audio.previous,
    volume: audio.volume,
    onVolumeChange: audio.setVolume,
    onMuteToggle: audio.toggleMute,
    onCloseWindow: closeActiveWindowViaKeyboard,
    onCloseStartMenu: () => setIsStartMenuOpen(false),
    isStartMenuOpen,
    enabled: true,
  });

  // -------------------------------------------------------------------------
  // PLAYBACK HANDLERS
  // -------------------------------------------------------------------------

  const handlePlayTrack = useCallback((track, album) => {
    if (isLoggedIn) {
      spotify.playTrack(track, album);
    }
    // Open media player if not already open
    handleOpenMediaPlayer();
  }, [isLoggedIn, spotify, handleOpenMediaPlayer]);

  const handlePlayAlbum = useCallback((album) => {
    if (isLoggedIn) {
      spotify.playAlbum(album);
    }
    handleOpenMediaPlayer();
  }, [isLoggedIn, spotify, handleOpenMediaPlayer]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // Build taskbar windows list (for tabs)
  const taskbarWindows = windows.map(w => ({
    id: w.id,
    type: w.type,
    title: w.title,
  }));

  // Login modal can always be closed - user can explore before logging in
  // They can reopen it from Start menu -> Connect
  const canCloseLogin = true;

  return (
    <ThemeProvider theme={recordOSTheme}>
      <React95Reset />
      <GlobalStyles />

      {/* Desktop Background (Album Grid) */}
      <Desktop
        albums={spotify.albums.slice(0, displayAlbumCount)}
        loadingAlbums={spotify.loadingAlbums}
        isLoggedIn={isLoggedIn && hasCompletedSetup}
        isLoading={spotify.isLoading}
        onAlbumClick={handleAlbumClick}
        onOpenGame={handleOpenGame}
      />

      {/* Loading Window (shown while scanning library) */}
      {spotify.isLoading && (
        <LoadingWindow
          loadingProgress={spotify.loadingProgress}
          position={loadingWindowPos}
          onPositionChange={setLoadingWindowPos}
        />
      )}

      {/* Windows */}
      {windows.map((w, index) => {
        if (w.minimized) return null;

        const isActive = activeWindowId === w.id;
        // Active window gets highest z-index (1100), others stack by order
        const zIndex = isActive ? 1100 : 1000 + index;
        const commonProps = {
          key: w.id,
          isActive,
          zIndex,
          position: w.position,
          onClose: () => closeWindow(w.id),
          onMinimize: () => minimizeWindow(w.id),
          onFocus: () => focusWindow(w.id),
          onDragStart: (e) => handleDragStart(w.id, e),
        };

        switch (w.type) {
          case 'trackList':
            return (
              <TrackListModal
                {...commonProps}
                album={w.data}
                currentTrackId={audio.currentTrack?.id}
                onPlayTrack={handlePlayTrack}
                onPlayAlbum={handlePlayAlbum}
              />
            );

          case 'mediaPlayer':
            return (
              <MediaPlayer
                {...commonProps}
                windowPosition={w.position}
                isPlaying={audio.isPlaying}
                currentTrack={audio.currentTrack}
                position={audio.position}
                duration={audio.duration}
                volume={audio.volume}
                isMuted={audio.isMuted}
                onPlay={audio.play}
                onPause={audio.pause}
                onPrevious={audio.previous}
                onNext={audio.next}
                onSeek={audio.seek}
                onVolumeChange={audio.setVolume}
                onMuteToggle={audio.toggleMute}
                onOpenVisualizer={handleOpenTrippyGraphics}
              />
            );

          case 'trippyGraphics':
            return (
              <TrippyGraphics
                {...commonProps}
                size={w.size || { width: 600, height: 450 }}
                audioContext={audio.audioContext}
                audioAnalyser={audio.analyzer}
                initAudioContext={audio.initAudioContext}
              />
            );

          case 'minesweeper':
          case 'solitaire':
          case 'snake':
            return (
              <GameWindow
                {...commonProps}
                gameType={w.type}
              />
            );

          case 'info':
            return (
              <InfoModal
                {...commonProps}
              />
            );

          case 'settings':
            return (
              <SettingsModal
                {...commonProps}
                scanlinesEnabled={scanlinesEnabled}
                onToggleScanlines={() => setScanlinesEnabled(prev => !prev)}
                albumCount={displayAlbumCount}
                onAlbumCountChange={setDisplayAlbumCount}
              />
            );

          default:
            return null;
        }
      })}

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        canClose={canCloseLogin}
        onExecute={handleExecute}
        user={spotify.user}
        isPostAuth={isLoggedIn && showConfigStep}
        isLoading={spotify.isLoading}
        loadingProgress={spotify.loadingProgress}
      />

      {/* Loaded Modal - shown after library scan completes */}
      <LoadedModal
        isOpen={showLoadedModal}
        albumCount={spotify.allAlbumsCount}
        trackCount={getTotalTracks()}
        topDecade={getTopDecade()}
        onExplore={() => {
          // Close all windows and dismiss modal
          setWindows([]);
          setShowLoadedModal(false);
        }}
        onKeepWindows={() => {
          // Just dismiss the modal
          setShowLoadedModal(false);
        }}
      />

      {/* Taskbar */}
      <Taskbar
        albumCount={spotify.albums.length}
        openWindows={taskbarWindows}
        activeWindow={activeWindowId}
        onWindowClick={toggleWindowFromTaskbar}
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        isLoggedIn={isLoggedIn && hasCompletedSetup}
        decade={spotify.decade}
        onDecadeChange={spotify.setDecade}
        onLogout={handleLogout}
        onOpenMediaPlayer={handleOpenMediaPlayer}
        onOpenTrippyGraphics={handleOpenTrippyGraphics}
        onOpenGame={handleOpenGame}
        onOpenInfo={handleOpenInfo}
        onOpenSettings={handleOpenSettings}
        onOpenLogin={handleOpenLogin}
        onRescanLibrary={handleRescanLibrary}
      />
    </ThemeProvider>
  );
}

export default App;
