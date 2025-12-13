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
import LibraryScanner from './components/LibraryScanner';

// Hooks
import { useSpotify } from './hooks/useSpotify';
import { useLocalAudio } from './hooks/useLocalAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMobile } from './hooks/useMobile';

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

// Initial window positions - near top with cascade offset
// Position modals closer to top of screen for better visibility
const getInitialPosition = (index) => {
  if (typeof window === 'undefined') return { x: 200, y: 80 };

  const centerX = Math.max(50, window.innerWidth / 2 - 200);
  const topY = 80; // Fixed offset from top (not centered)

  // Cascade offset (wraps after 5 windows to avoid going off-screen)
  const cascadeOffset = (index % 5) * 30;

  return {
    x: centerX + cascadeOffset,
    y: topY + cascadeOffset,
  };
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function App() {
  // -------------------------------------------------------------------------
  // HOOKS
  // -------------------------------------------------------------------------

  const isMobile = useMobile();
  const spotify = useSpotify(isMobile);
  const localAudio = useLocalAudio();

  // Use Spotify when logged in, local audio otherwise
  const isLoggedIn = spotify.loggedIn;

  // Allow user to force demo mode if Spotify playback fails
  const [demoModeForced, setDemoModeForced] = useState(false);

  // Use Spotify when logged in and demo mode not forced, local audio otherwise
  const audio = (isLoggedIn && !demoModeForced) ? spotify : localAudio;

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

  // -------------------------------------------------------------------------
  // LIBRARY SCANNER STATE
  // -------------------------------------------------------------------------
  // The LibraryScanner window persists after scan completes (unlike the old
  // LoadingWindow which closed). If minimized when complete, auto-restore it.

  const scannerWindowId = useRef(null);
  const prevIsLoadingRef = useRef(false);
  const scannerManuallyClosed = useRef(false); // Track if user closed scanner
  const oauthHandled = useRef(false); // Prevent OAuth effect from running multiple times

  // Derive scan state from spotify hook (no separate state needed)
  const scanState = spotify.isLoading ? 'scanning' :
    (spotify.allAlbumsCount > 0 ? 'complete' : 'idle');

  // -------------------------------------------------------------------------
  // LOGIN FLOW STATE (Consolidated to fix race condition)
  // -------------------------------------------------------------------------
  //
  // Flow:
  // 1. Fresh visit (not logged in) → show login modal
  // 2. OAuth return (code in URL) → show config step in modal
  // 3. Logged in + loading/loaded → auto-hide modal, show desktop
  //
  // IMPORTANT: Previously there were TWO useEffects managing loginModalOpen
  // that could race against each other, causing the modal to sometimes not
  // appear in incognito/fresh visits. Now consolidated into ONE effect.

  // Check if this is an OAuth return (code in URL)
  const isOAuthReturn = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('code');

  // Login modal state - initial value carefully determined to avoid flash
  const [loginModalOpen, setLoginModalOpen] = useState(() => {
    if (isOAuthReturn) return true;  // OAuth return - show config step
    if (isLoggedIn) return false;    // Returning user - skip modal
    return true;                     // Not logged in - show login prompt
  });

  // Track if user has completed setup (so returning users don't see config modal)
  const [hasCompletedSetup, setHasCompletedSetup] = useState(() => {
    // If logged in (has cached token) and NOT OAuth return → already set up
    return isLoggedIn && !isOAuthReturn;
  });

  // SINGLE consolidated effect for automatic login modal state changes
  // This replaces the previous two competing effects that caused race conditions
  //
  // New flow (Dec 2025): After OAuth, we auto-start library scan instead of
  // showing a config step. The LibraryScanner window opens automatically.
  useEffect(() => {
    // BULLETPROOF: If library scan is running, login modal should always close
    // This catches any edge cases where other conditions don't trigger
    if (spotify.isLoading && loginModalOpen) {
      setLoginModalOpen(false);
      setHasCompletedSetup(true);
      return;
    }

    // NOTE: Use isOAuthReturn (computed at mount) NOT fresh URL check.
    // The URL gets cleared by useSpotify before isLoggedIn becomes true.

    if (isOAuthReturn && isLoggedIn && !hasCompletedSetup && !oauthHandled.current) {
      // OAuth just completed - close login modal and start library scan
      // Use ref to prevent this from running multiple times before state updates
      oauthHandled.current = true;
      setLoginModalOpen(false);
      setHasCompletedSetup(true);
      // Reset scanner closed flag so it opens fresh
      scannerManuallyClosed.current = false;
      // Auto-start library scan (this will open LibraryScanner window)
      spotify.refreshLibrary();
    } else if (isLoggedIn) {
      // Logged in (returning user or scan in progress) - close modal
      if (spotify.allAlbumsCount > 0 || hasCompletedSetup) {
        setHasCompletedSetup(true);
        setLoginModalOpen(false);
      }
    }
    // Note: We intentionally don't auto-open modal when !isLoggedIn here
    // because the initial state already handles that. This prevents the race.
  }, [isLoggedIn, isOAuthReturn, spotify.isLoading, spotify.allAlbumsCount, hasCompletedSetup, spotify, loginModalOpen]);

  // -------------------------------------------------------------------------
  // SYNC LOGIN WINDOW TO WINDOWS ARRAY
  // -------------------------------------------------------------------------
  // This integrates the login modal into the window system so it appears in
  // taskbar, can be minimized, and doesn't always stay on top.

  const loginWindowId = useRef(null);

  useEffect(() => {
    if (loginModalOpen) {
      // Add login window if not already present
      const existingLogin = windows.find(w => w.type === 'login');
      if (!existingLogin) {
        const id = generateWindowId();
        loginWindowId.current = id;
        const centerX = typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - 340) / 2) : 200;
        const centerY = typeof window !== 'undefined' ? Math.max(0, (window.innerHeight - 500) / 2) : 100;

        setWindows(prev => [...prev, {
          id,
          type: 'login',
          title: 'Record OS // Initialize',
          data: {},
          position: { x: centerX, y: centerY },
          minimized: false,
        }]);
        setActiveWindowId(id);
      }
    } else {
      // Remove login window - filter by type to catch any edge cases
      setWindows(prev => prev.filter(w => w.type !== 'login'));
      loginWindowId.current = null;
    }
  }, [loginModalOpen]);

  // -------------------------------------------------------------------------
  // SYNC LIBRARY SCANNER WINDOW TO WINDOWS ARRAY
  // -------------------------------------------------------------------------
  // Opens when scanning starts, stays open after complete (unlike old LoadingWindow).
  // Auto-expands if minimized when scan completes.

  useEffect(() => {
    // Open scanner when loading starts (but not if user manually closed it)
    if (spotify.isLoading) {
      const existingScanner = windows.find(w => w.type === 'libraryScanner');
      if (!existingScanner && !scannerManuallyClosed.current) {
        const id = generateWindowId();
        scannerWindowId.current = id;
        const centerX = typeof window !== 'undefined' ? (window.innerWidth / 2 - 190) : 300;
        const centerY = typeof window !== 'undefined' ? (window.innerHeight / 2 - 150) : 200;

        setWindows(prev => [...prev, {
          id,
          type: 'libraryScanner',
          title: 'Scanning Library...',
          data: {},
          position: { x: centerX, y: centerY },
          minimized: false,
        }]);
        setActiveWindowId(id);
      }
    }

    // Auto-expand scanner if it was minimized when scan completes
    const wasLoading = prevIsLoadingRef.current;
    const justFinished = wasLoading && !spotify.isLoading && spotify.allAlbumsCount > 0;

    if (justFinished && scannerWindowId.current) {
      const scanner = windows.find(w => w.id === scannerWindowId.current);
      if (scanner?.minimized) {
        // Restore the scanner window
        setWindows(prev => prev.map(w =>
          w.id === scannerWindowId.current
            ? { ...w, minimized: false, title: 'Scan Complete' }
            : w
        ));
        // Only steal focus if no other visible windows exist
        const otherVisibleWindows = windows.filter(w =>
          w.id !== scannerWindowId.current && !w.minimized
        );
        if (otherVisibleWindows.length === 0) {
          setActiveWindowId(scannerWindowId.current);
        }
      } else if (scanner) {
        // Update title even if not minimized
        setWindows(prev => prev.map(w =>
          w.id === scannerWindowId.current
            ? { ...w, title: 'Scan Complete' }
            : w
        ));
      }
    }

    // Track loading state for next render
    prevIsLoadingRef.current = spotify.isLoading;
  }, [spotify.isLoading, spotify.allAlbumsCount, windows]);

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
  // PRE-LOGIN: Open initial windows (Minesweeper, Media Player muted)
  // -------------------------------------------------------------------------
  const [hasOpenedInitialWindows, setHasOpenedInitialWindows] = useState(false);

  useEffect(() => {
    if (!isLoggedIn && !hasOpenedInitialWindows) {
      // Mobile: don't open initial windows, let user explore via Start Menu
      if (isMobile) {
        setHasOpenedInitialWindows(true);
        return;
      }

      // Calculate positions: Minesweeper upper left, Media Player lower right
      const mediaPlayerX = window.innerWidth - 320 - 24;
      const mediaPlayerY = window.innerHeight - 48 - 200 - 24; // 48px taskbar, ~200px player height, 24px inset

      const minesweeperWindow = {
        id: generateWindowId(),
        type: 'minesweeper',
        title: 'Minesweeper',
        data: {},
        position: { x: 24, y: 24 }, // Upper left, 24px from edges
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

      // Use functional update to preserve any existing windows (like login modal)
      setWindows(prev => [...prev, minesweeperWindow, mediaPlayerWindow]);
      setActiveWindowId(mediaPlayerWindow.id);
      setHasOpenedInitialWindows(true);

      // Start local audio at middle volume (not muted) so play works immediately
      if (localAudio.setVolume) {
        localAudio.setVolume(50);
      }
    }
  }, [isLoggedIn, hasOpenedInitialWindows, localAudio, isMobile]);

  // -------------------------------------------------------------------------
  // POST-AUTH: Clean up pre-auth state (no auto-resume of demo audio)
  // -------------------------------------------------------------------------
  // After OAuth login, user is now on Spotify - don't auto-resume demo audio.
  // They can start fresh with their Spotify library.

  useEffect(() => {
    // Just clear any saved pre-auth state - don't try to resume demo audio
    const savedStateStr = sessionStorage.getItem('recordos_pre_auth_state');
    if (savedStateStr) {
      sessionStorage.removeItem('recordos_pre_auth_state');
    }
  }, []); // Run once on mount

  // -------------------------------------------------------------------------
  // WINDOW MANAGEMENT
  // -------------------------------------------------------------------------

  const openWindow = useCallback((type, data = {}) => {
    const existingWindow = windows.find(w => w.type === type && w.data?.id === data?.id);

    if (existingWindow) {
      // Focus existing window
      setActiveWindowId(existingWindow.id);
      if (isMobile) {
        // Mobile: keep persistent windows (player, scanner) + focused window
        const persistentTypes = ['mediaPlayer', 'libraryScanner'];
        setWindows(prev => {
          const persistentWindows = prev.filter(w =>
            persistentTypes.includes(w.type) && w.id !== existingWindow.id
          );
          const focusedWindow = { ...existingWindow, minimized: false };
          return [...persistentWindows, focusedWindow];
        });
      } else {
        setWindows(prev => prev.map(w => ({
          ...w,
          minimized: w.id === existingWindow.id ? false : w.minimized,
        })));
      }
      return;
    }

    const id = generateWindowId();

    // Game window sizes for proper centering (matches GameWindow.jsx GAME_CONFIG + borders/header)
    const gameWindowSizes = {
      minesweeper: { width: 264, height: 370 },  // 340 content + 30 header
      solitaire: { width: 704, height: 550 },
      snake: { width: 334, height: 420 },        // 390 content + 30 header
    };

    // Calculate position - center games/modals, cascade others
    let position;
    if (isMobile) {
      position = { x: 0, y: 0 };
    } else if (gameWindowSizes[type]) {
      // Center game windows based on their actual size
      const size = gameWindowSizes[type];
      position = {
        x: Math.max(20, (window.innerWidth - size.width) / 2),
        y: Math.max(20, (window.innerHeight - size.height - 44) / 2), // -44 for taskbar
      };
    } else {
      position = getInitialPosition(windows.length);
    }

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
        title = 'WMP[ish] Visualizations';
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

    // Mobile: allow Media Player + Scanner + one other window
    // Scanner and Player can coexist and be minimized; other windows replace each other
    if (isMobile) {
      const persistentTypes = ['mediaPlayer', 'libraryScanner'];
      if (persistentTypes.includes(type)) {
        // Opening a persistent window - add it, keep other persistent windows
        setWindows(prev => {
          const toKeep = prev.filter(w => persistentTypes.includes(w.type) && w.type !== type);
          return [...toKeep, newWindow];
        });
      } else {
        // Opening a regular window - keep persistent windows, replace other regular windows
        setWindows(prev => {
          const persistentWindows = prev.filter(w => persistentTypes.includes(w.type));
          return [...persistentWindows, newWindow];
        });
      }
    } else {
      setWindows(prev => [...prev, newWindow]);
    }
    setActiveWindowId(id);
  }, [windows, isMobile]);

  const closeWindow = useCallback((windowId) => {
    // Check if closing media player - stop music
    const windowToClose = windows.find(w => w.id === windowId);
    if (windowToClose?.type === 'mediaPlayer') {
      // Stop playback
      if (audio.isPlaying) {
        audio.pause?.();
      }
    }

    // Track if user manually closes scanner (prevents auto-reopen)
    if (windowToClose?.type === 'libraryScanner') {
      scannerManuallyClosed.current = true;
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

    // Get coordinates from mouse or touch event
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Get window element dimensions
    const windowEl = e.target.closest('[data-window]');
    const rect = windowEl?.getBoundingClientRect();

    // Prevent default touch behavior (scrolling) during drag
    if (e.touches) {
      e.preventDefault();
    }

    setDragging({
      windowId,
      startX: clientX - win.position.x,
      startY: clientY - win.position.y,
      width: rect?.width || 400,
      height: rect?.height || 300,
      initialX: win.position.x,
      initialY: win.position.y,
      isTouch: !!e.touches,
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

    // Handle both mouse and touch move events
    const handleMove = (e) => {
      // Get coordinates from mouse or touch event
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Prevent scrolling during touch drag
      if (e.touches) {
        e.preventDefault();
      }

      currentX = Math.max(0, clientX - dragging.startX);
      currentY = Math.max(0, clientY - dragging.startY);
      outline.style.left = `${currentX}px`;
      outline.style.top = `${currentY}px`;
    };

    // Handle both mouse and touch end events
    const handleEnd = () => {
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

    // Add both mouse and touch event listeners
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      outline.remove();
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragging]);


  // -------------------------------------------------------------------------
  // EVENT HANDLERS
  // -------------------------------------------------------------------------

  const handleAlbumClick = useCallback(async (album) => {
    // Fetch full album tracks with liked status
    const fullAlbum = await spotify.getFullAlbumTracks(album);
    setSelectedAlbum(fullAlbum || album);
    openWindow('trackList', fullAlbum || album);
  }, [openWindow, spotify]);

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

  const handleShowScanResults = useCallback(() => {
    openWindow('libraryScanner');
  }, [openWindow]);

  const handleOpenLogin = useCallback(() => {
    setLoginModalOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    spotify.logout();
    setHasCompletedSetup(false);
    setLoginModalOpen(true);
    setWindows([]);
    setSelectedAlbum(null);
    setDemoModeForced(false);
  }, [spotify]);

  // Enable demo mode fallback when Spotify playback fails
  const handleEnableDemoMode = useCallback(() => {
    setDemoModeForced(true);
    spotify.clearPlaybackError?.();
    // Start playing local audio demo tracks
    localAudio.play?.();
  }, [spotify, localAudio]);

  // Dismiss playback error without switching to demo mode
  const handleDismissPlaybackError = useCallback(() => {
    spotify.clearPlaybackError?.();
  }, [spotify]);

  const handleStartClick = useCallback(() => {
    setIsStartMenuOpen(prev => !prev);
  }, []);

  const handleRescanLibrary = useCallback(() => {
    // Reset manual close flag so scanner will auto-open
    scannerManuallyClosed.current = false;
    // Force refresh library - bypass cache
    spotify.refreshLibrary(true);
  }, [spotify]);

  // Handler for decade selection from LibraryScanner
  // Minimizes all windows and sets the decade filter
  const handleSelectDecade = useCallback((decade) => {
    // Set the decade filter
    spotify.setDecade(decade);
    // Minimize all windows so user can see their album grid
    setWindows(prev => prev.map(w => ({ ...w, minimized: true })));
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
        isLoading={
          // Show loading animation UNLESS user has selected a ready decade
          // This lets users browse ready decades while scan continues
          spotify.isLoading && (
            spotify.decade === 'all' ||
            spotify.decadeStatus[spotify.decade] !== 'ready'
          )
        }
        isInitializing={spotify.isInitializing}
        onAlbumClick={handleAlbumClick}
        onOpenGame={handleOpenGame}
      />

      {/* Windows (includes Login, Loading, and all other windows) */}
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
          isMobile,
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
                playbackError={!demoModeForced ? spotify.playbackError : null}
                albumEnded={!demoModeForced && spotify.albumEnded}
                onPlay={audio.play}
                onPause={audio.pause}
                onPrevious={audio.previous}
                onNext={audio.next}
                onSeek={audio.seek}
                onVolumeChange={audio.setVolume}
                onMuteToggle={audio.toggleMute}
                onOpenVisualizer={handleOpenTrippyGraphics}
                onEnableDemoMode={handleEnableDemoMode}
                onDismissError={handleDismissPlaybackError}
                onDismissAlbumEnded={spotify.clearAlbumEnded}
              />
            );

          case 'trippyGraphics':
            // Always use localAudio for visualizer (Spotify DRM blocks audio access)
            // Falls back to microphone if no audio context available
            return (
              <TrippyGraphics
                {...commonProps}
                size={w.size || { width: 600, height: 450 }}
                audioContext={localAudio.audioContext}
                audioAnalyser={localAudio.analyzer}
                initAudioContext={localAudio.initAudioContext}
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
                isLoggedIn={isLoggedIn}
                isLoading={spotify.isLoading}
                onRescanLibrary={handleRescanLibrary}
                onShowScanResults={handleShowScanResults}
                unavailableAlbums={spotify.unavailableAlbums}
              />
            );

          case 'login':
            return (
              <LoginModal
                {...commonProps}
                canClose={canCloseLogin}
                onBeforeAuth={async () => {
                  // Preserve audio state before auth redirect
                  const wasPlaying = localAudio.isPlaying;
                  sessionStorage.setItem('recordos_pre_auth_state', JSON.stringify({
                    wasPlaying,
                    trackPosition: localAudio.position,
                  }));
                  // Fade out audio gracefully
                  if (wasPlaying) {
                    await localAudio.fadeOut(500);
                  }
                }}
              />
            );

          case 'libraryScanner':
            return (
              <LibraryScanner
                {...commonProps}
                scanState={scanState}
                loadingProgress={spotify.loadingProgress}
                totalTracks={spotify.totalSavedTracks}
                albumCount={spotify.allAlbumsCount}
                decadeStatus={spotify.decadeStatus}
                albumsByDecade={spotify.albumsByDecade}
                decadeOrder={spotify.decadeOrder}
                decadeLabels={spotify.decadeLabels}
                topDecade={getTopDecade()}
                onSelectDecade={handleSelectDecade}
              />
            );

          default:
            return null;
        }
      })}

      {/* Taskbar */}
      <Taskbar
        albumCount={spotify.albums.length}
        openWindows={taskbarWindows}
        activeWindow={activeWindowId}
        onWindowClick={toggleWindowFromTaskbar}
        onStartClick={handleStartClick}
        isStartMenuOpen={isStartMenuOpen}
        isLoggedIn={isLoggedIn && hasCompletedSetup}
        isLoading={spotify.isLoading}
        loadingProgress={spotify.loadingProgress}
        decade={spotify.decade}
        onDecadeChange={spotify.setDecade}
        onLogout={handleLogout}
        onOpenMediaPlayer={handleOpenMediaPlayer}
        onOpenTrippyGraphics={handleOpenTrippyGraphics}
        onOpenGame={handleOpenGame}
        onOpenInfo={handleOpenInfo}
        onOpenSettings={handleOpenSettings}
        onOpenLogin={handleOpenLogin}
        decadeStatus={spotify.decadeStatus}
        isMobile={isMobile}
      />
    </ThemeProvider>
  );
}

export default App;
