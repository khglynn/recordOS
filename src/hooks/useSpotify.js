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
  getAlbum,
  getAlbums,
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
      if (saved === 'all') return 'all';
      return saved ? parseInt(saved) : DEFAULT_THRESHOLD;
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

      if (error) {
        console.error('Spotify auth error:', error);
        window.history.replaceState({}, '', '/');
        return;
      }

      if (code) {
        try {
          console.log('Exchanging auth code for tokens...');
          await exchangeCodeForTokens(code);
          console.log('Token exchange successful!');
          setLoggedIn(true);
          // Clean up URL
          window.history.replaceState({}, '', '/');
        } catch (err) {
          console.error('Failed to exchange code:', err);
          // Clean up URL even on error
          window.history.replaceState({}, '', '/');
          alert(`Login failed: ${err.message}`);
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

    setIsLoading(true);
    setLoadingProgress({ loaded: 0, total: 0 });

    try {
      // Check cache first
      const cachedAlbums = localStorage.getItem(STORAGE_KEYS.ALBUMS_CACHE);
      const cacheTime = localStorage.getItem(STORAGE_KEYS.ALBUMS_CACHE_TIME);

      if (cachedAlbums && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < ALBUMS_CACHE_DURATION) {
          setAlbums(JSON.parse(cachedAlbums));
          setIsLoading(false);
          return;
        }
      }

      // Fetch all saved tracks
      const savedTracks = await getAllSavedTracks((progress) => {
        setLoadingProgress(progress);
      });

      // Group tracks by album
      const albumMap = new Map();

      for (const item of savedTracks) {
        const track = item.track;
        const album = track.album;

        if (!albumMap.has(album.id)) {
          albumMap.set(album.id, {
            id: album.id,
            name: album.name,
            artist: album.artists.map(a => a.name).join(', '),
            image: album.images[0]?.url || '',
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            uri: album.uri,
            likedTracks: 0,
            tracks: [],
            likedTrackIds: new Set(),
          });
        }

        const albumData = albumMap.get(album.id);
        albumData.likedTracks += 1;
        albumData.likedTrackIds.add(track.id);
      }

      // Convert to array and fetch full track lists for albums
      const albumsArray = Array.from(albumMap.values());

      // Fetch full album details in batches of 20
      const batchSize = 20;
      for (let i = 0; i < albumsArray.length; i += batchSize) {
        const batch = albumsArray.slice(i, i + batchSize);
        const ids = batch.map(a => a.id);

        try {
          const { albums: fullAlbums } = await getAlbums(ids);

          for (const fullAlbum of fullAlbums) {
            if (!fullAlbum) continue;

            const albumData = albumMap.get(fullAlbum.id);
            if (albumData) {
              albumData.tracks = fullAlbum.tracks.items.map(t => ({
                id: t.id,
                name: t.name,
                duration: t.duration_ms,
                trackNumber: t.track_number,
                uri: t.uri,
                isLiked: albumData.likedTrackIds.has(t.id),
              }));
            }
          }
        } catch (err) {
          console.warn('Failed to fetch album batch:', err);
        }
      }

      // Clean up the Set (not serializable)
      albumsArray.forEach(a => delete a.likedTrackIds);

      // Cache the results
      localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE, JSON.stringify(albumsArray));
      localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE_TIME, Date.now().toString());

      setAlbums(albumsArray);
    } catch (err) {
      console.error('Failed to fetch library:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // -------------------------------------------------------------------------
  // FILTER & SORT ALBUMS
  // -------------------------------------------------------------------------

  const filteredAlbums = useCallback(() => {
    let result = [...albums];

    // Filter by threshold
    if (threshold !== 'all') {
      result = result.filter(a => a.likedTracks >= threshold);
    }

    // Sort
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
