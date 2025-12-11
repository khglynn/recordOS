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
  getAlbumTracks,
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
  DECADE_ORDER,
  DECADE_LABELS,
  getDecadeFromDate,
  getDecadeCompletionThreshold,
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
  const [unavailableAlbums, setUnavailableAlbums] = useState([]); // Albums that threw 403 errors (full details for error log)
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // True until first cache check completes
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [loadingAlbums, setLoadingAlbums] = useState([]); // Album art discovered during loading

  // Progressive decade loading state
  const [scanPhase, setScanPhase] = useState('idle'); // 'idle' | 'scanning' | 'complete'
  const [decadeStatus, setDecadeStatus] = useState({}); // { '2020s': 'ready', '2010s': 'scanning', ... }
  const [albumsByDecade, setAlbumsByDecade] = useState({}); // { '2020s': [...], '2010s': [...] }
  const [completedDecades, setCompletedDecades] = useState(new Set()); // Tracks which decades are finalized

  // Compute dominant decade (memoized)
  const dominantDecade = useMemo(() => {
    let max = 0;
    let dominant = null;
    for (const [dec, decadeAlbums] of Object.entries(albumsByDecade)) {
      if (decadeAlbums.length > max) {
        max = decadeAlbums.length;
        dominant = dec;
      }
    }
    return dominant ? DECADE_LABELS[dominant] : null;
  }, [albumsByDecade]);

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
  const [playbackError, setPlaybackError] = useState(null);
  const [albumEnded, setAlbumEnded] = useState(false); // True when album finishes playing

  // Audio analysis for visualizer
  const [audioAnalysis, setAudioAnalysis] = useState(null);

  // Settings
  const [decade, setDecade] = useState(
    () => localStorage.getItem(STORAGE_KEYS.DECADE) || DECADE_OPTIONS.ALL
  );

  // Refs for cleanup and album tracking
  const playerRef = useRef(null);
  const positionIntervalRef = useRef(null);
  const originalAlbumUriRef = useRef(null);  // Track album we started playing
  const albumEndTriggeredRef = useRef(false); // Prevent multiple triggers

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

      // Safari cache debug - helps diagnose why cache might not persist
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      console.log('[Cache Debug]', {
        browser: isSafari ? 'Safari' : 'Other',
        cachedAlbumsExists: !!cachedAlbums,
        cachedAlbumsLength: cachedAlbums?.length || 0,
        cacheTimeExists: !!cacheTime,
        cacheAge: cacheTime ? Math.round((Date.now() - parseInt(cacheTime)) / 60000) + 'min' : 'N/A',
        localStorageAvailable: typeof localStorage !== 'undefined',
      });

      if (cachedAlbums && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < ALBUMS_CACHE_DURATION) {
          console.log('Loading albums from cache (age:', Math.round(age / 60000), 'min)');
          try {
            const parsed = JSON.parse(cachedAlbums);
            // Add missing fields that weren't cached (to save space)
            // tracks and likedTrackIds will be fetched on demand
            const albumsWithDefaults = parsed.map(album => ({
              ...album,
              tracks: album.tracks || [],
              likedTrackIds: album.likedTrackIds || [],
              needsTrackRefresh: !album.tracks || album.tracks.length === 0,
            }));
            console.log(`Parsed ${albumsWithDefaults.length} albums from cache`);
            setAlbums(albumsWithDefaults);
            setIsInitializing(false); // Cache loaded successfully
            return;
          } catch (parseErr) {
            console.error('Failed to parse cached albums:', parseErr);
            // Continue to fetch fresh data
          }
        }
      }
    } else {
      console.log('Force refresh requested - bypassing cache');
    }

    // No valid cache - mark as done initializing (but about to start loading)
    setIsInitializing(false);

    setIsLoading(true);
    setScanPhase('scanning');
    setLoadingProgress({ loaded: 0, total: 0 });
    setLoadingAlbums([]); // Reset loading albums
    setDecadeStatus({}); // Reset decade status
    setAlbumsByDecade({}); // Reset albums by decade
    setCompletedDecades(new Set()); // Reset completed decades

    try {
      // Map to accumulate album data and liked track counts
      const albumDataMap = new Map();
      const seenAlbumImages = new Set(); // Track unique album images for loading display

      // Progressive decade tracking (local state for callbacks)
      const localAlbumsByDecade = {}; // { '2020s': Map<id, album>, ... }
      const localCompletedDecades = new Set();
      let lowestSavedYear = 9999; // Track oldest save year seen

      console.log('[Safari Debug] Starting getAllSavedTracks...');

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

          // Process albums by decade
          for (const album of newAlbums) {
            const decade = getDecadeFromDate(album.releaseDate);
            if (decade) {
              if (!localAlbumsByDecade[decade]) {
                localAlbumsByDecade[decade] = new Map();
              }
              if (!localAlbumsByDecade[decade].has(album.id)) {
                localAlbumsByDecade[decade].set(album.id, {
                  ...album,
                  likedTracks: 0,
                  likedTrackIds: new Set(),
                });
              }
            }
          }
        },
        // Track batch callback - detect decade completion via added_at
        (trackItems) => {
          // Process each track to update decade status
          for (const item of trackItems) {
            const savedYear = new Date(item.added_at).getFullYear();
            if (savedYear < lowestSavedYear) {
              lowestSavedYear = savedYear;

              // Check if any decades should be marked complete
              for (const dec of DECADE_ORDER) {
                if (!localCompletedDecades.has(dec)) {
                  const threshold = getDecadeCompletionThreshold(dec);
                  if (threshold > 0 && lowestSavedYear < threshold) {
                    localCompletedDecades.add(dec);
                    console.log(`[Decade Complete] ${dec} is now complete (saw save from ${lowestSavedYear})`);
                  }
                }
              }
            }

            // Update album liked track count in real-time
            const album = item.track.album;
            const decade = getDecadeFromDate(album.release_date);
            if (decade && localAlbumsByDecade[decade]) {
              const albumData = localAlbumsByDecade[decade].get(album.id);
              if (albumData && !albumData.likedTrackIds.has(item.track.id)) {
                albumData.likedTrackIds.add(item.track.id);
                albumData.likedTracks += 1;
              }
            }
          }

          // Update React state with current decade status
          const newStatus = {};
          for (const dec of DECADE_ORDER) {
            if (localAlbumsByDecade[dec] && localAlbumsByDecade[dec].size > 0) {
              newStatus[dec] = localCompletedDecades.has(dec) ? 'ready' : 'scanning';
            }
          }
          setDecadeStatus(newStatus);

          // Update albums by decade (convert Maps to sorted arrays)
          const newAlbumsByDecade = {};
          for (const [dec, albumMap] of Object.entries(localAlbumsByDecade)) {
            newAlbumsByDecade[dec] = Array.from(albumMap.values())
              .sort((a, b) => b.likedTracks - a.likedTracks);
          }
          setAlbumsByDecade(newAlbumsByDecade);
          setCompletedDecades(new Set(localCompletedDecades));
        }
      );

      console.log(`[Safari Debug] getAllSavedTracks returned ${savedTracks.length} tracks`);

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
            likedTrackIds: new Set(), // Track IDs that are liked
            tracks: [],
          });
        }

        const albumData = albumDataMap.get(album.id);
        albumData.likedTracks += 1;
        albumData.likedTrackIds.add(track.id); // Track which songs are liked
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
      // Convert Sets to Arrays for caching
      const albumsArray = Array.from(albumDataMap.values())
        .map(album => ({
          ...album,
          likedTrackIds: Array.from(album.likedTrackIds), // Convert Set to Array for JSON
        }))
        .sort((a, b) => b.likedTracks - a.likedTracks);

      console.log(`[Safari Debug] Processing complete:`);
      console.log(`  - albumDataMap size: ${albumDataMap.size}`);
      console.log(`  - albumsArray length: ${albumsArray.length}`);
      console.log(`  - First 3 albums:`, albumsArray.slice(0, 3).map(a => `${a.name} (${a.likedTracks} liked)`));

      // Cache the results (with Safari-safe error handling)
      // Only cache essential fields to stay within localStorage quota (~5MB)
      // Full tracks data is kept in memory, but not cached
      try {
        const cacheData = albumsArray.map(album => ({
          id: album.id,
          name: album.name,
          artist: album.artist,
          image: album.image,
          releaseDate: album.releaseDate,
          totalTracks: album.totalTracks,
          uri: album.uri,
          likedTracks: album.likedTracks,
          // Omit: tracks, likedTrackIds - too large for localStorage
          // These will be fetched on demand when user opens album
        }));
        const jsonData = JSON.stringify(cacheData);
        console.log(`Caching ${jsonData.length} bytes to localStorage (minimal data)...`);
        localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE, jsonData);
        localStorage.setItem(STORAGE_KEYS.ALBUMS_CACHE_TIME, Date.now().toString());
        console.log('Cache saved successfully');
      } catch (cacheErr) {
        console.warn('Failed to cache albums (localStorage may be full or disabled):', cacheErr);
        // Continue without caching - albums will still work this session
      }

      // IMPORTANT: Set albums state regardless of cache success
      console.log(`[Safari Debug] Calling setAlbums with ${albumsArray.length} albums...`);
      setAlbums(albumsArray);
      console.log(`[Safari Debug] setAlbums called, clearing loading state...`);
      setLoadingAlbums([]); // Clear loading albums
      setIsLoading(false);
      setScanPhase('complete');

      // Mark all decades with albums as 'ready' now that scan is complete
      const finalDecadeStatus = {};
      for (const dec of DECADE_ORDER) {
        if (localAlbumsByDecade[dec] && localAlbumsByDecade[dec].size > 0) {
          finalDecadeStatus[dec] = 'ready';
        }
      }
      setDecadeStatus(finalDecadeStatus);

      // Final albums by decade with properly sorted data
      const finalAlbumsByDecade = {};
      for (const [dec, albumMap] of Object.entries(localAlbumsByDecade)) {
        finalAlbumsByDecade[dec] = Array.from(albumMap.values())
          .map(a => ({
            ...a,
            likedTrackIds: Array.from(a.likedTrackIds),
          }))
          .sort((a, b) => b.likedTracks - a.likedTracks);
      }
      setAlbumsByDecade(finalAlbumsByDecade);

      console.log(`[Safari Debug] fetchLibrary complete! Decades:`, Object.keys(finalDecadeStatus));
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setLoadingAlbums([]); // Clear loading albums on error too
      setIsLoading(false);
      setScanPhase('idle');
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
    // During scan: if user selected a ready decade, use albumsByDecade directly
    // This allows browsing ready decades before full scan completes
    const useProgressiveData = isLoading &&
      decade !== DECADE_OPTIONS.ALL &&
      decadeStatus[decade] === 'ready' &&
      albumsByDecade[decade]?.length > 0;

    let candidates;

    if (useProgressiveData) {
      // Use progressive scan data for this specific decade
      candidates = [...albumsByDecade[decade]];
      console.log(`[displayAlbums] Using progressive data for ${decade}: ${candidates.length} albums`);
    } else {
      // Normal flow: filter from complete albums array
      if (albums.length === 0) return [];

      // Step 0: Filter out unavailable albums (403 errors)
      const unavailableIds = new Set(unavailableAlbums.map(a => a.id));
      candidates = albums.filter(a => !unavailableIds.has(a.id));

      // Step 1: Filter by decade if not "all"
      if (decade !== DECADE_OPTIONS.ALL) {
        candidates = candidates.filter(a => getDecadeFromDate(a.releaseDate) === decade);
      }
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

    console.log(`[Safari Debug] displayAlbums filter:`);
    console.log(`  - Using progressive: ${useProgressiveData}`);
    console.log(`  - Input albums: ${useProgressiveData ? albumsByDecade[decade]?.length : albums.length}`);
    console.log(`  - Decade filter: "${decade}"`);
    console.log(`  - After decade filter: ${candidates.length}`);
    console.log(`  - Qualifying (${MIN_SAVED_TRACKS}+ tracks): ${qualifyingAlbums.length}`);
    console.log(`  - Final result: ${result.length}`);

    return result;
  }, [albums, decade, unavailableAlbums, isLoading, decadeStatus, albumsByDecade]);

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
        setPlaybackError({
          code: 'PLAYBACK_FAILURE',
          message: 'EXTERNAL AUDIO STREAM INTERRUPTED',
          detail: message,
        });
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

        // Detect album end: track when we leave the original album context
        // This handles Spotify autoplay queuing similar tracks after album ends
        const currentTrackAlbumUri = track?.album?.uri;
        const originalAlbumUri = originalAlbumUriRef.current;
        const leftOriginalAlbum = originalAlbumUri && currentTrackAlbumUri &&
                                  currentTrackAlbumUri !== originalAlbumUri;

        // Also detect natural end: last track + playback stopped
        const nextTracks = state.track_window.next_tracks || [];
        const isLastTrack = nextTracks.length === 0;
        const positionAtEnd = state.position === 0 || (state.duration > 0 && state.position >= state.duration - 500);
        const trackEndedNaturally = state.paused && positionAtEnd && state.duration > 0 && isLastTrack;

        console.log(`[Album End Check] orig=${originalAlbumUri?.split(':')[2]}, curr=${currentTrackAlbumUri?.split(':')[2]}, left=${leftOriginalAlbum}, naturalEnd=${trackEndedNaturally}`);

        // Trigger album end if we left original album OR natural end occurred
        if ((leftOriginalAlbum || trackEndedNaturally) && !albumEndTriggeredRef.current) {
          console.log(`[Album End] Album finished! Reason: ${leftOriginalAlbum ? 'left album context' : 'natural end'}`);
          albumEndTriggeredRef.current = true;
          setAlbumEnded(true);

          // Play turntable end sound effect (licensed via Envato)
          // Plays once, then again after a short delay for that authentic vinyl feel
          const playTurntableSound = () => {
            try {
              const endSound = new Audio('/sounds/turntable.mp3');
              endSound.volume = 0.4;
              return endSound.play().catch(() => {
                console.log('[Album End] Could not play end sound');
              });
            } catch (e) {
              console.log('[Album End] Audio not available');
            }
          };

          // Play once immediately, then once more after 2 seconds
          playTurntableSound();
          setTimeout(playTurntableSound, 2000);
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
  // MEDIA SESSION API - System media keys (play/pause/next/prev)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Update metadata when track changes
    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: currentTrack.albumArt ? [
          { src: currentTrack.albumArt, sizes: '300x300', type: 'image/jpeg' },
          { src: currentTrack.albumArt, sizes: '640x640', type: 'image/jpeg' },
        ] : [],
      });
    }

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !deviceId) return;

    // Set up action handlers for media keys
    navigator.mediaSession.setActionHandler('play', async () => {
      await play(deviceId, {});
    });

    navigator.mediaSession.setActionHandler('pause', async () => {
      await pause(deviceId);
    });

    navigator.mediaSession.setActionHandler('nexttrack', async () => {
      await skipToNext(deviceId);
    });

    navigator.mediaSession.setActionHandler('previoustrack', async () => {
      await skipToPrevious(deviceId);
    });

    // Cleanup
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [deviceId]);

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
    if (!deviceId) {
      setPlaybackError({
        code: 'DEVICE_UNAVAILABLE',
        message: 'PLAYBACK SUBSTRATE OFFLINE',
        detail: 'Spotify Premium required for web playback',
      });
      return;
    }

    try {
      setPlaybackError(null); // Clear any previous error
      setAlbumEnded(false);   // Clear album-ended state for new playback
      originalAlbumUriRef.current = album.uri;  // Track this album for end detection
      albumEndTriggeredRef.current = false;     // Reset trigger flag
      await play(deviceId, {
        contextUri: album.uri,
        offset: track.uri,
      });
    } catch (err) {
      console.error('Failed to play track:', err);
      setPlaybackError({
        code: 'PLAYBACK_FAILURE',
        message: 'TRACK INITIALIZATION FAILED',
        detail: err.message,
      });
    }
  }, [deviceId]);

  const playAlbum = useCallback(async (album) => {
    if (!deviceId) {
      setPlaybackError({
        code: 'DEVICE_UNAVAILABLE',
        message: 'PLAYBACK SUBSTRATE OFFLINE',
        detail: 'Spotify Premium required for web playback',
      });
      return;
    }

    try {
      setPlaybackError(null); // Clear any previous error
      setAlbumEnded(false);   // Clear album-ended state for new album
      originalAlbumUriRef.current = album.uri;  // Track this album for end detection
      albumEndTriggeredRef.current = false;     // Reset trigger flag
      await play(deviceId, {
        contextUri: album.uri,
      });
    } catch (err) {
      console.error('Failed to play album:', err);
      console.log('[Play Error Debug] Error message:', err.message);
      console.log('[Play Error Debug] Error status:', err.status);

      // Check if this is a 403 error (album unavailable/restricted)
      // Spotify returns 403 for region-restricted, unavailable albums
      const is403Error = err.message?.includes('403') ||
                         err.message?.includes('Forbidden') ||
                         err.message?.includes('restricted') ||
                         err.status === 403;

      if (is403Error) {
        console.log(`[Album Unavailable] Marking album "${album.name}" (${album.id}) as unavailable - REMOVING FROM GRID`);
        setUnavailableAlbums(prev => {
          // Check if already in list
          if (prev.some(a => a.id === album.id)) return prev;
          const newList = [...prev, {
            id: album.id,
            name: album.name,
            artist: album.artist,
            reason: 'Region restricted (403 Forbidden)',
            timestamp: new Date().toISOString(),
          }];
          console.log(`[Album Unavailable] Unavailable albums count: ${newList.length}`);
          return newList;
        });
        setPlaybackError({
          code: 'ALBUM_UNAVAILABLE',
          message: 'ALBUM RESTRICTED',
          detail: 'This album is not available in your region',
        });
      } else {
        setPlaybackError({
          code: 'PLAYBACK_FAILURE',
          message: 'ALBUM INITIALIZATION FAILED',
          detail: err.message,
        });
      }
    }
  }, [deviceId]);

  // -------------------------------------------------------------------------
  // GET FULL ALBUM TRACKS (with liked status)
  // -------------------------------------------------------------------------

  const getFullAlbumTracks = useCallback(async (album) => {
    if (!album?.id) return null;

    try {
      // Fetch all tracks from Spotify API
      const allTracks = await getAlbumTracks(album.id);

      // Get the liked track IDs (stored as array in cache, may need to convert)
      const likedIds = new Set(album.likedTrackIds || []);

      // Mark which tracks are liked
      const tracksWithLikedStatus = allTracks.map(track => ({
        ...track,
        isLiked: likedIds.has(track.id),
      }));

      return {
        ...album,
        tracks: tracksWithLikedStatus,
      };
    } catch (err) {
      console.error('Failed to fetch album tracks:', err);
      // Fall back to stored liked tracks
      return album;
    }
  }, []);

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
    totalSavedTracks: albums.reduce((sum, a) => sum + (a.likedTracks || 0), 0),
    unavailableAlbums, // Albums hidden due to 403 errors
    isLoading,
    isInitializing,
    loadingProgress,
    loadingAlbums,
    refreshLibrary: fetchLibrary,

    // Progressive decade loading
    scanPhase,
    decadeStatus,
    albumsByDecade,
    hasReadyDecade: Object.values(decadeStatus).some(s => s === 'ready'),
    dominantDecade,
    decadeOrder: DECADE_ORDER,
    decadeLabels: DECADE_LABELS,

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
    playbackError,
    clearPlaybackError: () => setPlaybackError(null),
    albumEnded,
    clearAlbumEnded: () => setAlbumEnded(false),

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
    getFullAlbumTracks,

    // SDK status
    playerReady: !!deviceId,
  };
}

export default useSpotify;
