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
    artist: 'Stock Music',
    src: '/music/Bit Bouncer.mp3',
    duration: 180000, // ~3 min estimate
  },
  {
    id: 'local-2',
    name: 'Eurodance Music',
    artist: 'Stock Music',
    src: '/music/Eurodance Music (143 BPM) (03-04 SEC).mp3',
    duration: 200000,
  },
  {
    id: 'local-3',
    name: 'Upbeat Synthwave Movie',
    artist: 'Stock Music',
    src: '/music/Upbeat Synthwave Movie.mp3',
    duration: 160000,
  },
];

// ============================================================================
// ALBUM SELECTION CONFIG
// ============================================================================

// Target number of albums to show (Top N algorithm)
// 72 divides cleanly by 2,3,4,6,8,9,12,18,24,36
export const TARGET_ALBUM_COUNT = 72;

// Minimum saved tracks required to include album in Top N
export const MIN_SAVED_TRACKS = 8;

// Legacy threshold options (kept for backwards compatibility)
export const THRESHOLD_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10, 'all'];
export const DEFAULT_THRESHOLD = 'auto'; // 'auto' uses Top 50 algorithm

// ============================================================================
// SORT OPTIONS
// ============================================================================

export const SORT_OPTIONS = {
  RELEASE_DATE: 'release_date',
  ARTIST: 'artist',
  ALBUM: 'album',
  TRACK_COUNT: 'track_count',
};

export const SORT_LABELS = {
  [SORT_OPTIONS.RELEASE_DATE]: 'Release Date',
  [SORT_OPTIONS.ARTIST]: 'Artist Name',
  [SORT_OPTIONS.ALBUM]: 'Album Name',
  [SORT_OPTIONS.TRACK_COUNT]: '# of Liked Songs',
};

// ============================================================================
// GRID CONFIGURATION
// ============================================================================

// Album grid sizing - larger tiles, clear gaps, full album art visible
export const GRID_ALBUM_SIZE = 150; // px - base size for album covers
export const GRID_GAP = 8; // px - gap between albums

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
  THRESHOLD: 'recordos_threshold',
  SORT_BY: 'recordos_sort_by',
  SORT_DESC: 'recordos_sort_desc',
  VOLUME: 'recordos_volume',
  MUTED: 'recordos_muted',
  ALBUMS_CACHE: 'recordos_albums_cache',
  ALBUMS_CACHE_TIME: 'recordos_albums_cache_time',
};

// Cache albums for 1 hour
export const ALBUMS_CACHE_DURATION = 60 * 60 * 1000;
