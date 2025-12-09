/**
 * ============================================================================
 * CONSTANTS
 * ============================================================================
 *
 * App-wide constants and configuration.
 */

// ============================================================================
// LOCAL MUSIC TRACKS (for pre-login demo)
// ============================================================================

export const LOCAL_TRACKS = [
  {
    id: 'local-1',
    name: 'Bit Bouncer',
    artist: 'Envato Elements',
    src: '/music/Bit Bouncer.mp3',
    duration: 180000,
  },
  {
    id: 'local-2',
    name: 'Eurodance Music',
    artist: 'Envato Elements',
    src: '/music/Eurodance Music (143 BPM) (03-04 SEC).mp3',
    duration: 200000,
  },
  {
    id: 'local-3',
    name: 'Upbeat Synthwave Movie',
    artist: 'Envato Elements',
    src: '/music/Upbeat Synthwave Movie.mp3',
    duration: 160000,
  },
  {
    id: 'local-4',
    name: 'Country',
    artist: 'Envato Elements',
    src: '/music/Country.mp3',
    duration: 180000,
  },
  {
    id: 'local-5',
    name: 'Grunge Punk',
    artist: 'Envato Elements',
    src: '/music/Grunge Punk.mp3',
    duration: 150000,
  },
];

// ============================================================================
// ALBUM SELECTION CONFIG
// ============================================================================

// Target number of albums to show (Top N algorithm)
// 48 divides cleanly by 2,3,4,6,8,12,16,24 - good for responsive grids
export const TARGET_ALBUM_COUNT = 48;

// Minimum saved tracks required to include album in Top N
export const MIN_SAVED_TRACKS = 8;

// Legacy threshold options (kept for backwards compatibility)
export const THRESHOLD_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 'all'];
export const DEFAULT_THRESHOLD = 'auto'; // 'auto' uses Top 50 algorithm

// ============================================================================
// DECADE FILTER OPTIONS
// ============================================================================

export const DECADE_OPTIONS = {
  ALL: 'all',
  D2020: '2020s',
  D2010: '2010s',
  D2000: '2000s',
  D1990: '1990s',
  D1980: '1980s',
  CLASSIC: 'classic', // Pre-1980
};

export const DECADE_LABELS = {
  [DECADE_OPTIONS.ALL]: 'All Decades',
  [DECADE_OPTIONS.D2020]: '2020s',
  [DECADE_OPTIONS.D2010]: '2010s',
  [DECADE_OPTIONS.D2000]: '2000s',
  [DECADE_OPTIONS.D1990]: '1990s',
  [DECADE_OPTIONS.D1980]: '1980s',
  [DECADE_OPTIONS.CLASSIC]: 'Pre-1980',
};

// Ordered list of decades (newest to oldest) for progressive loading
export const DECADE_ORDER = [
  DECADE_OPTIONS.D2020,
  DECADE_OPTIONS.D2010,
  DECADE_OPTIONS.D2000,
  DECADE_OPTIONS.D1990,
  DECADE_OPTIONS.D1980,
  DECADE_OPTIONS.CLASSIC,
];

// Get saved year threshold for decade completion detection
// When we see a track saved before this year, that decade is complete
export const getDecadeCompletionThreshold = (decade) => {
  switch (decade) {
    case DECADE_OPTIONS.D2020: return 2020; // If saved before 2020, 2020s is complete
    case DECADE_OPTIONS.D2010: return 2010;
    case DECADE_OPTIONS.D2000: return 2000;
    case DECADE_OPTIONS.D1990: return 1990;
    case DECADE_OPTIONS.D1980: return 1980;
    default: return 0; // Classic never completes via threshold
  }
};

// Helper to get decade from release date
export const getDecadeFromDate = (releaseDate) => {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.split('-')[0]);
  if (year >= 2020) return DECADE_OPTIONS.D2020;
  if (year >= 2010) return DECADE_OPTIONS.D2010;
  if (year >= 2000) return DECADE_OPTIONS.D2000;
  if (year >= 1990) return DECADE_OPTIONS.D1990;
  if (year >= 1980) return DECADE_OPTIONS.D1980;
  return DECADE_OPTIONS.CLASSIC;
};

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

// Album grid sizing
// Min 225px ensures nice large tiles, max 50vw prevents > 2 per row on mobile
export const GRID_ALBUM_MIN_SIZE = 225; // px - minimum tile size
export const GRID_ALBUM_MAX_SIZE = '50vw'; // max tile size (string for CSS)
export const GRID_GAP = 0; // px - no gap between albums (edge to edge)

// ============================================================================
// GAME URLS (classic 90s versions via iframes)
// ============================================================================

export const GAME_URLS = {
  minesweeper: 'https://minesweeper.online/game/1', // Classic minesweeper
  solitaire: 'https://www.solitr.com/', // Classic solitaire
  snake: 'https://playsnake.org/', // Snake game
};

// ============================================================================
// VISUALIZER PRESETS
// ============================================================================

// Butterchurn presets that look good
export const VISUALIZER_PRESETS = [
  'Flexi - when monopoly goes wrong',
  'Geiss - Cauldron - painterly 2',
  'martin - castle in the air',
  'Unchained - Beat Demo 2.3',
  'Zylot - The Inner Workings of my New Computer',
];

// ============================================================================
// LOCALSTORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  DECADE: 'recordos_decade',
  VOLUME: 'recordos_volume',
  MUTED: 'recordos_muted',
  ALBUMS_CACHE: 'recordos_albums_cache',
  ALBUMS_CACHE_TIME: 'recordos_albums_cache_time',
};

// Cache albums for 1 hour
export const ALBUMS_CACHE_DURATION = 60 * 60 * 1000;
