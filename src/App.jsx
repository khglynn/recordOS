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

import { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import { styleReset } from 'react95';
import { createGlobalStyle } from 'styled-components';

// Components
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import LoginModal from './components/LoginModal';
import TrackListModal from './components/TrackListModal';
import MediaPlayer from './components/MediaPlayer';
import GameWindow from './components/GameWindow';
import InfoModal from './components/InfoModal';

// Hooks
import { useSpotify } from './hooks/useSpotify';
import { useLocalAudio } from './hooks/useLocalAudio';

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
  // LOGIN FLOW STATE
  // -------------------------------------------------------------------------

  // Step 1: Show login modal on first load or when logged out
  // Step 2: After OAuth, show config modal
  // Step 3: After execute, show the app
  const [loginModalOpen, setLoginModalOpen] = useState(true);
  const [showConfigStep, setShowConfigStep] = useState(false);
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

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

  // When albums finish loading and we have results, mark setup complete
  useEffect(() => {
    if (isLoggedIn && spotify.albums.length > 0 && !spotify.isLoading) {
      setHasCompletedSetup(true);
      setLoginModalOpen(false);
    }
  }, [isLoggedIn, spotify.albums.length, spotify.isLoading]);

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
    setWindows(prev => prev.filter(w => w.id !== windowId));

    if (activeWindowId === windowId) {
      setActiveWindowId(windows.length > 1 ? windows[windows.length - 2]?.id : null);
    }
  }, [activeWindowId, windows]);

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
  // WINDOW DRAGGING
  // -------------------------------------------------------------------------

  const handleDragStart = useCallback((windowId, e) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    setDragging({
      windowId,
      startX: e.clientX - window.position.x,
      startY: e.clientY - window.position.y,
    });
  }, [windows]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      setWindows(prev => prev.map(w =>
        w.id === dragging.windowId
          ? {
              ...w,
              position: {
                x: Math.max(0, e.clientX - dragging.startX),
                y: Math.max(0, e.clientY - dragging.startY),
              },
            }
          : w
      ));
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
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
    openWindow(gameType);
  }, [openWindow]);

  const handleOpenInfo = useCallback(() => {
    openWindow('info');
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

  // Close start menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => {
      if (isStartMenuOpen) {
        setIsStartMenuOpen(false);
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isStartMenuOpen]);

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

  // Determine if login modal can be closed (only after setup is complete)
  const canCloseLogin = hasCompletedSetup;

  return (
    <ThemeProvider theme={recordOSTheme}>
      <React95Reset />
      <GlobalStyles />

      {/* Desktop Background (Album Grid) */}
      <Desktop
        albums={spotify.albums}
        isLoggedIn={isLoggedIn && hasCompletedSetup}
        isLoading={spotify.isLoading}
        onAlbumClick={handleAlbumClick}
      />

      {/* Windows */}
      {windows.map((w) => {
        if (w.minimized) return null;

        const isActive = activeWindowId === w.id;
        const commonProps = {
          key: w.id,
          isActive,
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
                audioAnalysis={spotify.audioAnalysis}
                onPlay={audio.play}
                onPause={audio.pause}
                onPrevious={audio.previous}
                onNext={audio.next}
                onSeek={audio.seek}
                onVolumeChange={audio.setVolume}
                onMuteToggle={audio.toggleMute}
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

          default:
            return null;
        }
      })}

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        canClose={canCloseLogin}
        threshold={spotify.threshold}
        onThresholdChange={spotify.setThreshold}
        onExecute={handleExecute}
        user={spotify.user}
        isPostAuth={isLoggedIn && showConfigStep}
        isLoading={spotify.isLoading}
        loadingProgress={spotify.loadingProgress}
      />

      {/* Taskbar */}
      <Taskbar
        albumCount={spotify.albums.length}
        threshold={spotify.threshold}
        openWindows={taskbarWindows}
        activeWindow={activeWindowId}
        onWindowClick={toggleWindowFromTaskbar}
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        isLoggedIn={isLoggedIn && hasCompletedSetup}
        sortBy={spotify.sortBy}
        sortDesc={spotify.sortDesc}
        onSortChange={spotify.setSortOptions}
        onThresholdChange={spotify.setThreshold}
        onLogout={handleLogout}
        onOpenMediaPlayer={handleOpenMediaPlayer}
        onOpenGame={handleOpenGame}
        onOpenInfo={handleOpenInfo}
        onOpenLogin={handleOpenLogin}
      />
    </ThemeProvider>
  );
}

export default App;
