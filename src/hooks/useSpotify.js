/**
 * ============================================================================
 * useSpotify HOOK
 * ============================================================================
 *
 * Manages Spotify authentication, library fetching, and Web Playback SDK.
 *
 * Responsibilities:
 * - Handle OAuth callback
 * - Fetch user's saved tracks
 * - Process albums (filter by threshold, sort)
 * - Initialize and manage Web Playback SDK
 * - Playback controls
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  isLoggedIn,
  exchangeCodeForTokens,
  getAccessToken,
  logout as spotifyLogout,
  getAllSavedTracks,
  getAudioAnalysis,
  play,
  pause,
  skipToNext,
  skipToPrevious,
  seek,
  setVolume,
  transferPlayback,
  getCurrentUser,
} from '../utils/spotify';
import {
  DECADE_OPTIONS,
  getDecadeFromDate,
  DEFAULT_THRESHOLD,
  TARGET_ALBUM_COUNT,
  MIN_SAVED_TRACKS,
  STORAGE_KEYS,
  ALBUMS_CACHE_DURATION,
} from '../utils/constants';
import { setUser as setSentryUser } from '../utils/sentry';

// ============================================================================
// HOOK
// ============================================================================

export function useSpotify() {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  // Auth state
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Library state
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [loadingAlbums, setLoadingAlbums] = useState([]); // Album art discovered during loading

  // Playback state
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(
    parseInt(localStorage.getItem(STORAGE_KEYS.VOLUME) || '80')
  );
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem(STORAGE_KEYS.MUTED) === 'true'
  );

  // Audio analysis for visualizer
  const [audioAnalysis, setAudioAnalysis] = useState(null);

  // Settings
  const [decade, setDecade] = useState(
    () => localStorage.getItem(STORAGE_KEYS.DECADE) || DECADE_OPTIONS.ALL
  );

  // Refs for cleanup
  const playerRef = useRef(null);
  const positionIntervalRef = useRef(null);

  // -------------------------------------------------------------------------
  // HANDLE OAUTH CALLBACK
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      // Clean up URL IMMEDIATELY to prevent stale code issues on refresh
      if (code || error) {
        window.history.replaceState({}, '', '/');
      }

      if (error) {
        console.error('Spotify auth error:', error);
        // Map common Spotify errors to user-friendly messages
        const errorMessages = {
          'access_denied': 'ACCESS DENIED // User cancelled login',
          'invalid_client': 'INVALID CLIENT // Check app configuration',
          'invalid_request': 'INVALID REQUEST // Try again',
        };
        setAuthError(errorMessages[error] || `AUTH ERROR // ${error}`);
        return;
      }

      if (code) {
        try {
          console.log('Exchanging auth code for tokens...');
          await exchangeCodeForTokens(code);
          console.log('Token exchange successful!');
          setAuthError(null); // Clear any previous error
          setLoggedIn(true);
        } catch (err) {
          console.error('Failed to exchange code:', err);
          // Don't set error for "invalid code" - user likely just refreshed
          if (!err.message.includes('Invalid authorization code')) {
            setAuthError(`LOGIN FAILED // ${err.message}`);
          }
        }
      }
    };

    handleCallback();
  }, []);

  // -------------------------------------------------------------------------
  // FETCH USER PROFILE
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!loggedIn) return;

    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        // Set user context for Sentry error tracking
        setSentryUser(userData);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [loggedIn]);

  // -------------------------------------------------------------------------
  // FETCH & PROCESS LIBRARY
  // -------------------------------------------------------------------------

  const fetchLibrary = useCallback(async (forceRefresh = false) => {
    if (!loggedIn) return;

    // Check cache first - load immediately if valid (unless forcing refresh)
    if (!forceRefresh) {
      const cachedAlbums = localStorage.getItem(STORAGE_KEYS.ALBUMS_CACHE);
      const cacheTime = localStorage.getItem(STORAGE_KEYS.ALBUMS_CACHE_TIME);

      if (cachedAlbums && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < ALBUMS_CACHE_DURATION) {
          console.log('Loading albums from cache (age:', Math.round(age / 60000), 'min)');
          setAlbums(JSON.parse(cachedAlbums));
          return;
        }
      }
    } else {
      console.log('Force refresh requested - bypassing cache');
    }

    setIsLoading(true);
    setLoadingProgress({ loaded: 0, total: 0 });
    setLoadingAlbums([]); // Reset loading albums

    try {
      // Map to accumulate album data and liked track counts
      const albumDataMap = new Map();
      const seenAlbumImages = new Set(); // Track unique album images for loading display

      // Fetch all saved tracks with progress updates
      const savedTracks = await getAllSavedTracks(
        // Progress callback - update loading bar
        (progress) => {
          setLoadingProgress(progress);
        },
        // Album batch callback - stream album art for loading display
        (newAlbums) => {
          const newImages = newAlbums
            .filter(a => a.image && !seenAlbumImages.has(a.image))
            .map(a => {
              seenAlbumImages.add(a.image);
              return { id: a.id, image: a.image };
            });
          if (newImages.length > 0) {
            setLoadingAlbums(prev => [...prev, ...newImages]);
          }
        }
      );

      // Process all tracks to build album data with accurate liked counts
      for (const item of savedTracks) {
        const track = item.track;
        const album = track.album;

        if (!albumDataMap.has(album.id)) {
          albumDataMap.set(album.id, {
            id: album.id,
            name: album.name,
            artist: album.artists.map(a => a.name).join(', '),
            image: album.images[0]?.url || '',
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            uri: album.uri,
            likedTracks: 0,
            tracks: [],
          });
        }

        const albumData = albumDataMap.get(album.id);
        albumData.likedTracks += 1;
        albumData.tracks.push({
          id: track.id,
          name: track.name,
          duration: track.duration_ms,
          trackNumber: track.track_number,
          uri: track.uri,
          artist: track.artists.map(a => a.name).join(', '),
          isLiked: true, // All tracks in this list are liked
        });
      }

      // Sort tracks within each album by track number
      for (const album of albumDataMap.values()) {
        album.tracks.sort((a, b) => a.trackNumber - b.trackNumber);
      }

      // Sort albums by liked track count (descending)
      const albumsArray = Array.from(albumDataMap.values())
        .sort((a, b) => b.likedTracks - a.likedTracks);

      console.log(`Found ${albumsArray.length} albums from ${savedTracks.length} liked tracks`);

      // Cache the results
      localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE, JSON.stringify(albumsArray));
      localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE_TIME, Date.now().toString());

      setAlbums(albumsArray);
      setLoadingAlbums([]); // Clear loading albums
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setLoadingAlbums([]); // Clear loading albums on error too
      setIsLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // -------------------------------------------------------------------------
  // FILTER ALBUMS - TOP 48 BY LIKED TRACKS, OPTIONALLY BY DECADE
  // -------------------------------------------------------------------------

  /**
   * Album Selection Algorithm:
   * 1. Filter by decade (if selected)
   * 2. Sort by saved track count (most saved = most loved)
   * 3. Take the top N albums, prioritizing those with MIN_SAVED_TRACKS
   *    but filling up to TARGET_ALBUM_COUNT even with fewer liked tracks
   *
   * Memoized to prevent recalculation on every render
   */
  const displayAlbums = useMemo(() => {
    if (albums.length === 0) return [];

    // Step 1: Filter by decade if not "all"
    let candidates = albums;
    if (decade !== DECADE_OPTIONS.ALL) {
      candidates = albums.filter(a => getDecadeFromDate(a.releaseDate) === decade);
    }

    // Step 2: Sort all candidates by liked track count (highest first)
    const sorted = [...candidates].sort((a, b) => b.likedTracks - a.likedTracks);

    // Step 3: Get albums with minimum saved track count first
    const qualifyingAlbums = sorted.filter(a => a.likedTracks >= MIN_SAVED_TRACKS);

    // Step 4: If we don't have enough qualifying albums, fill with remaining candidates
    let result;
    if (qualifyingAlbums.length >= TARGET_ALBUM_COUNT) {
      result = qualifyingAlbums.slice(0, TARGET_ALBUM_COUNT);
    } else {
      // Take all qualifying albums, then fill with next best candidates
      const remaining = sorted.filter(a => a.likedTracks < MIN_SAVED_TRACKS);
      result = [...qualifyingAlbums, ...remaining].slice(0, TARGET_ALBUM_COUNT);
    }

    console.log(`Top ${TARGET_ALBUM_COUNT} (${decade}): ${albums.length} total -> ${candidates.length} in decade -> ${qualifyingAlbums.length} qualifying (${MIN_SAVED_TRACKS}+ tracks) -> ${result.length} selected`);

    return result;
  }, [albums, decade]);

  // -------------------------------------------------------------------------
  // SETTINGS HANDLERS
  // -------------------------------------------------------------------------

  const handleDecadeChange = useCallback((newDecade) => {
    setDecade(newDecade);
    localStorage.setItem(STORAGE_KEYS.DECADE, newDecade);
  }, []);

  // -------------------------------------------------------------------------
  // SPOTIFY WEB PLAYBACK SDK
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!loggedIn) return;

    // Load Spotify SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = async () => {
      const token = await getAccessToken();
      if (!token) return;

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Record OS',
        getOAuthToken: async (cb) => {
          const t = await getAccessToken();
          cb(t);
        },
        volume: isMuted ? 0 : volume / 100,
      });

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Spotify init error:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Spotify auth error:', message);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
      });

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Spotify player ready, device ID:', device_id);
        setDeviceId(device_id);
        // Transfer playback to this device
        transferPlayback(device_id, false);
      });

      // Not ready
      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify player not ready:', device_id);
      });

      // State changes
      spotifyPlayer.addListener('player_state_changed', (state) => {
        if (!state) return;

        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);

        const track = state.track_window.current_track;
        if (track) {
          setCurrentTrack({
            id: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            albumArt: track.album.images[0]?.url,
            uri: track.uri,
          });

          // Fetch audio analysis for visualizer
          getAudioAnalysis(track.id).then(setAudioAnalysis).catch(() => {});
        }
      });

      await spotifyPlayer.connect();
      playerRef.current = spotifyPlayer;
      setPlayer(spotifyPlayer);
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      script.remove();
    };
  }, [loggedIn]);

  // Update position while playing
  useEffect(() => {
    if (isPlaying && player) {
      positionIntervalRef.current = setInterval(async () => {
        const state = await player.getCurrentState();
        if (state) {
          setPosition(state.position);
        }
      }, 1000);
    } else {
      clearInterval(positionIntervalRef.current);
    }

    return () => clearInterval(positionIntervalRef.current);
  }, [isPlaying, player]);

  // -------------------------------------------------------------------------
  // PLAYBACK CONTROLS
  // -------------------------------------------------------------------------

  const handlePlay = useCallback(async () => {
    if (!deviceId) return;
    await play(deviceId, {});
  }, [deviceId]);

  const handlePause = useCallback(async () => {
    if (!deviceId) return;
    await pause(deviceId);
  }, [deviceId]);

  const handleNext = useCallback(async () => {
    if (!deviceId) return;
    await skipToNext(deviceId);
  }, [deviceId]);

  const handlePrevious = useCallback(async () => {
    if (!deviceId) return;
    await skipToPrevious(deviceId);
  }, [deviceId]);

  const handleSeek = useCallback(async (positionMs) => {
    if (!deviceId) return;
    await seek(deviceId, Math.floor(positionMs));
    setPosition(positionMs);
  }, [deviceId]);

  const handleVolumeChange = useCallback(async (newVolume) => {
    setVolumeState(newVolume);
    localStorage.setItem(STORAGE_KEYS.VOLUME, newVolume.toString());

    if (player) {
      await player.setVolume(newVolume / 100);
    }

    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem(STORAGE_KEYS.MUTED, 'false');
    }
  }, [player, isMuted]);

  const handleMuteToggle = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(STORAGE_KEYS.MUTED, newMuted.toString());

    if (player) {
      await player.setVolume(newMuted ? 0 : volume / 100);
    }
  }, [player, isMuted, volume]);

  const playTrack = useCallback(async (track, album) => {
    if (!deviceId) return;

    try {
      await play(deviceId, {
        contextUri: album.uri,
        offset: track.uri,
      });
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  }, [deviceId]);

  const playAlbum = useCallback(async (album) => {
    if (!deviceId) return;

    try {
      await play(deviceId, {
        contextUri: album.uri,
      });
    } catch (err) {
      console.error('Failed to play album:', err);
    }
  }, [deviceId]);

  // -------------------------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------------------------

  const handleLogout = useCallback(() => {
    spotifyLogout();
    setLoggedIn(false);
    setUser(null);
    setAlbums([]);
    localStorage.removeItem(STORAGE_KEYS.ALBUMS_CACHE);
    localStorage.removeItem(STORAGE_KEYS.ALBUMS_CACHE_TIME);

    // Clear Sentry user context
    setSentryUser(null);

    if (playerRef.current) {
      playerRef.current.disconnect();
    }
  }, []);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // Auth
    loggedIn,
    user,
    authError,
    clearAuthError: () => setAuthError(null),
    logout: handleLogout,

    // Library
    albums: displayAlbums,
    allAlbumsCount: albums.length,
    isLoading,
    loadingProgress,
    loadingAlbums,
    refreshLibrary: fetchLibrary,

    // Settings
    decade,
    setDecade: handleDecadeChange,

    // Playback
    isPlaying,
    currentTrack,
    position,
    duration,
    volume,
    isMuted,
    audioAnalysis,

    // Playback controls
    play: handlePlay,
    pause: handlePause,
    next: handleNext,
    previous: handlePrevious,
    seek: handleSeek,
    setVolume: handleVolumeChange,
    toggleMute: handleMuteToggle,
    playTrack,
    playAlbum,

    // SDK status
    playerReady: !!deviceId,
  };
}

export default useSpotify;
