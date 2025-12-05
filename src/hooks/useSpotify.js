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

import { useState, useEffect, useCallback, useRef } from 'react';
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
  SORT_OPTIONS,
  DEFAULT_THRESHOLD,
  TARGET_ALBUM_COUNT,
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

  // Library state
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

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
  const [threshold, setThreshold] = useState(
    () => {
      const saved = localStorage.getItem(STORAGE_KEYS.THRESHOLD);
      if (saved === 'all' || saved === 'auto') return saved;
      // If a numeric value was saved from old version, use 'auto' instead
      return saved && !isNaN(parseInt(saved)) ? 'auto' : DEFAULT_THRESHOLD;
    }
  );
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem(STORAGE_KEYS.SORT_BY) || SORT_OPTIONS.RELEASE_DATE
  );
  const [sortDesc, setSortDesc] = useState(
    () => localStorage.getItem(STORAGE_KEYS.SORT_DESC) !== 'false'
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
        return;
      }

      if (code) {
        try {
          console.log('Exchanging auth code for tokens...');
          await exchangeCodeForTokens(code);
          console.log('Token exchange successful!');
          setLoggedIn(true);
        } catch (err) {
          console.error('Failed to exchange code:', err);
          // Don't show alert for "invalid code" - user likely just refreshed
          if (!err.message.includes('Invalid authorization code')) {
            alert(`Login failed: ${err.message}`);
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

  const fetchLibrary = useCallback(async () => {
    if (!loggedIn) return;

    // Check cache first - load immediately if valid
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

    setIsLoading(true);
    setLoadingProgress({ loaded: 0, total: 0 });

    try {
      // Map to accumulate album data and liked track counts
      const albumDataMap = new Map();

      // Fetch all saved tracks with progress updates
      const savedTracks = await getAllSavedTracks(
        // Progress callback - update loading bar
        (progress) => {
          setLoadingProgress(progress);
        },
        // Album batch callback - called as new albums are discovered
        // We DON'T show albums here because likedTracks count is incomplete
        null
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
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setIsLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // -------------------------------------------------------------------------
  // FILTER & SORT ALBUMS - "TOP 50" ALGORITHM
  // -------------------------------------------------------------------------

  /**
   * Top 50 Algorithm:
   * 1. Start with albums that have 100% liked tracks
   * 2. If we don't have enough, add albums with lower percentage
   * 3. Stop once we reach TARGET_ALBUM_COUNT
   *
   * This gives a meaningful collection of your "most loved" albums
   * without requiring manual threshold picking.
   */
  const filteredAlbums = useCallback(() => {
    if (albums.length === 0) return [];

    // If 'all' mode, show everything (legacy behavior)
    if (threshold === 'all') {
      let result = [...albums];
      result.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case SORT_OPTIONS.RELEASE_DATE:
            comparison = new Date(a.releaseDate) - new Date(b.releaseDate);
            break;
          case SORT_OPTIONS.ARTIST:
            comparison = a.artist.localeCompare(b.artist);
            break;
          case SORT_OPTIONS.ALBUM:
            comparison = a.name.localeCompare(b.name);
            break;
          case SORT_OPTIONS.TRACK_COUNT:
            comparison = a.likedTracks - b.likedTracks;
            break;
          default:
            comparison = 0;
        }
        return sortDesc ? -comparison : comparison;
      });
      return result;
    }

    // Top 50 algorithm (default 'auto' mode or any other value)
    // Calculate liked percentage for each album
    const albumsWithPercent = albums.map(a => ({
      ...a,
      likedPercent: a.totalTracks > 0 ? a.likedTracks / a.totalTracks : 0,
    }));

    // Sort by liked percentage (highest first), then by total liked tracks as tiebreaker
    albumsWithPercent.sort((a, b) => {
      const percentDiff = b.likedPercent - a.likedPercent;
      if (Math.abs(percentDiff) > 0.001) return percentDiff;
      return b.likedTracks - a.likedTracks;
    });

    // Take the top N albums
    let result = albumsWithPercent.slice(0, TARGET_ALBUM_COUNT);

    console.log(`Top ${TARGET_ALBUM_COUNT} algorithm: ${albums.length} total -> ${result.length} selected`);
    if (result.length > 0) {
      const minPercent = Math.round(result[result.length - 1].likedPercent * 100);
      const maxPercent = Math.round(result[0].likedPercent * 100);
      console.log(`  Range: ${maxPercent}% to ${minPercent}% liked`);
    }

    // Now sort the selected albums by user preference
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case SORT_OPTIONS.RELEASE_DATE:
          comparison = new Date(a.releaseDate) - new Date(b.releaseDate);
          break;
        case SORT_OPTIONS.ARTIST:
          comparison = a.artist.localeCompare(b.artist);
          break;
        case SORT_OPTIONS.ALBUM:
          comparison = a.name.localeCompare(b.name);
          break;
        case SORT_OPTIONS.TRACK_COUNT:
          comparison = a.likedTracks - b.likedTracks;
          break;
        default:
          comparison = 0;
      }
      return sortDesc ? -comparison : comparison;
    });

    return result;
  }, [albums, threshold, sortBy, sortDesc]);

  // -------------------------------------------------------------------------
  // SETTINGS HANDLERS
  // -------------------------------------------------------------------------

  const handleThresholdChange = useCallback((newThreshold) => {
    setThreshold(newThreshold);
    localStorage.setItem(STORAGE_KEYS.THRESHOLD, newThreshold.toString());
  }, []);

  const handleSortChange = useCallback((newSortBy, newSortDesc) => {
    setSortBy(newSortBy);
    setSortDesc(newSortDesc);
    localStorage.setItem(STORAGE_KEYS.SORT_BY, newSortBy);
    localStorage.setItem(STORAGE_KEYS.SORT_DESC, newSortDesc.toString());
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
    logout: handleLogout,

    // Library
    albums: filteredAlbums(),
    allAlbumsCount: albums.length,
    isLoading,
    loadingProgress,
    refreshLibrary: fetchLibrary,

    // Settings
    threshold,
    setThreshold: handleThresholdChange,
    sortBy,
    sortDesc,
    setSortOptions: handleSortChange,

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
