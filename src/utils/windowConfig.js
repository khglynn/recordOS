/**
 * ============================================================================
 * WINDOW CONFIGURATION
 * ============================================================================
 *
 * Centralized configuration for all windows and modals.
 * Single source of truth for sizing, positioning, and mobile rules.
 *
 * Created: 2025-12-11
 */

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const TASKBAR_HEIGHT = 48; // Mobile taskbar height (44px + 2px border + 2px buffer)
export const TASKBAR_HEIGHT_DESKTOP = 50; // Desktop taskbar height (48px + 2px border)
export const MOBILE_PADDING = 8; // Padding around modals on mobile (px)
export const MOBILE_BREAKPOINT = 767; // CSS media query breakpoint (px)

// ============================================================================
// GAME WINDOW SIZES
// ============================================================================

// Used by both GameWindow.jsx and App.jsx for consistent sizing
export const GAME_SIZES = {
  minesweeper: {
    width: 260,
    height: 340, // 9x11 grid (264px) + controls bar + window chrome
  },
  solitaire: {
    width: 700,
    height: 520,
  },
  snake: {
    width: 330,   // Game board (320) + borders
    height: 390,  // Board (320px) + borders (6px) + controls bar (~50px) + margin
  },
};

// ============================================================================
// MODAL WINDOW SIZES (Desktop)
// ============================================================================

export const MODAL_SIZES = {
  trackList: {
    width: 600,
    height: 500,
    minHeight: 300,
  },
  info: {
    width: 480,
    height: 'auto', // Content-driven
    maxHeight: 600,
  },
  settings: {
    width: 400,
    height: 'auto',
    maxHeight: 500,
  },
  login: {
    width: 360,
    height: 'auto',
  },
  libraryScanner: {
    width: 400,
    height: 300,
  },
};

// ============================================================================
// MOBILE MODAL RULES
// ============================================================================

/**
 * Mobile modal sizing rules:
 * - Width: 100vw - (MOBILE_PADDING * 2)
 * - Max-height: 100vh - TASKBAR_HEIGHT - (MOBILE_PADDING * 2)
 * - Position: centered horizontally, centered vertically above taskbar
 *
 * Exception: Full-screen modals (like Solitaire) use 100vw x (100vh - TASKBAR_HEIGHT)
 */
export const getMobileModalStyles = (isFullScreen = false) => {
  if (isFullScreen) {
    return {
      width: '100vw',
      height: `calc(100vh - ${TASKBAR_HEIGHT}px)`,
      left: 0,
      top: 0,
    };
  }

  return {
    width: `calc(100vw - ${MOBILE_PADDING * 2}px)`,
    maxWidth: '100%',
    maxHeight: `calc(100vh - ${TASKBAR_HEIGHT}px - ${MOBILE_PADDING * 2}px)`,
    left: `${MOBILE_PADDING}px`,
    top: '50%',
    transform: 'translateY(-50%)',
  };
};

// ============================================================================
// WINDOW Z-INDEX LAYERS
// ============================================================================

export const Z_INDEX = {
  desktop: 1,
  window: 1000,
  modal: 5000,
  startMenu: 9000,
  taskbar: 10000,
  loginModal: 15000, // Above everything when shown
};

// ============================================================================
// PERSISTENT WINDOW TYPES
// ============================================================================

// Windows that should show in taskbar even on mobile
export const PERSISTENT_WINDOW_TYPES = ['mediaPlayer', 'libraryScanner'];

// Check if a window type should persist on mobile
export const isPersistentWindow = (type) => PERSISTENT_WINDOW_TYPES.includes(type);
