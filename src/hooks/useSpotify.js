/**
 * ============================================================================
 * useSpotify HOOK
 * ============================================================================
 *
 * Manages Spotify authentication, library fetching, and playback control.
 *
 * Responsibilities:
 * - Handle OAuth callback
 * - Fetch user's saved tracks
 * - Process albums (top 50 per decade, sorted by liked tracks, name-based dedupe)
 * - Playback controls via Spotify Connect (controls external Spotify device)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  isLoggedIn,
  exchangeCodeForTokens,
  getAccessToken,
  logout as spotifyLogout,
  getAllSavedTracks,
  getAlbumTracks,
  play,
  pause,
  skipToNext,
  skipToPrevious,
  seek,
  setVolume,
  getCurrentUser,
  getDevices,
  getPlaybackState,
  transferPlayback,
} from '../utils/spotify';
import {
  DECADE_OPTIONS,
  DECADE_ORDER,
  DECADE_LABELS,
  getDecadeFromDate,
  getDecadeCompletionThreshold,
  TARGET_ALBUM_COUNT,
  STORAGE_KEYS,
  ALBUMS_CACHE_DURATION,
} from '../utils/constants';
import { setUser as setSentryUser, addBreadcrumb, captureException } from '../utils/sentry';

// ============================================================================
// HOOK
// ============================================================================

export function useSpotify(isMobile = false) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  // Auth state
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Connect mode - controls Spotify on user's device (phone, desktop app, etc.)
  // Web Playback SDK removed - Connect is simpler and works everywhere
  const [activeDeviceName, setActiveDeviceName] = useState(null);

  // Library state
  const [albums, setAlbums] = useState([]);
  const [unavailableAlbums, setUnavailableAlbums] = useState([]); // Albums that threw 403 errors (full details for error log)
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // True until first cache check completes
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [loadingAlbums, setLoadingAlbums] = useState([]); // Album art discovered during loading
  const [scanError, setScanError] = useState(null); // Captures 403 whitelist errors or other scan failures

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

  // Playback state (Connect mode - controls external Spotify device)
  const [deviceId, setDeviceId] = useState(null);
  const [deviceReady, setDeviceReady] = useState(false); // True once we detect an active device
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

  // Auth circuit breaker - stops cascade of errors when auth fails
  const authInvalidRef = useRef(false);

  // Settings
  const [decade, setDecade] = useState(
    () => localStorage.getItem(STORAGE_KEYS.DECADE) || DECADE_OPTIONS.ALL
  );

  // Refs for cleanup and album tracking
  const connectPollIntervalRef = useRef(null); // Polling for playback state
  const originalAlbumUriRef = useRef(null);  // Track album we started playing
  const albumEndTriggeredRef = useRef(false); // Prevent multiple triggers
  const lastDeviceCheckRef = useRef(0); // Track last device check for idle polling

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
          authInvalidRef.current = false; // Reset circuit breaker on successful login
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

        // Check for 403 - means user isn't whitelisted in Spotify Dashboard
        const is403 = err.message?.includes('403') ||
                      err.message?.includes('Forbidden') ||
                      err.status === 403;

        if (is403) {
          console.log('[Auth] 403 detected - user not whitelisted');
          captureException(err, { context: 'fetchUser_403_whitelist' });
          setScanError({
            code: 'NOT_WHITELISTED',
            message: 'ACCESS PENDING AUTHORIZATION',
            detail: 'Your Spotify account has not been whitelisted yet. Check back soon!',
          });
        }
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

            // Populate albumsByDecade from cache (fixes missing export button)
            const cachedByDecade = {};
            for (const album of albumsWithDefaults) {
              const dec = getDecadeFromDate(album.releaseDate);
              if (dec) {
                if (!cachedByDecade[dec]) cachedByDecade[dec] = [];
                cachedByDecade[dec].push(album);
              }
            }
            // Sort each decade by likedTracks
            for (const dec of Object.keys(cachedByDecade)) {
              cachedByDecade[dec].sort((a, b) => b.likedTracks - a.likedTracks);
            }
            setAlbumsByDecade(cachedByDecade);
            // Mark all cached decades as ready
            const cachedDecadeStatus = {};
            for (const dec of Object.keys(cachedByDecade)) {
              cachedDecadeStatus[dec] = 'ready';
            }
            setDecadeStatus(cachedDecadeStatus);
            setScanPhase('complete');

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
          likedTrackIds: album.likedTrackIds, // Needed to highlight liked tracks
          // Omit: tracks - fetched on demand when user opens album
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
      setAlbums(albumsArray);
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
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setLoadingAlbums([]); // Clear loading albums on error too
      setIsLoading(false);
      setScanPhase('idle');

      // Check for 403 - means user isn't whitelisted in Spotify Dashboard
      const is403 = err.message?.includes('403') ||
                    err.message?.includes('Forbidden') ||
                    err.status === 403;

      if (is403) {
        console.log('[Library] 403 detected - user not whitelisted');
        captureException(err, { context: 'fetchLibrary_403_whitelist' });
        setScanError({
          code: 'NOT_WHITELISTED',
          message: 'ACCESS PENDING AUTHORIZATION',
          detail: 'Your Spotify account has not been whitelisted yet. Check back soon!',
        });
      } else {
        // Generic scan error
        captureException(err, { context: 'fetchLibrary_error' });
        setScanError({
          code: 'SCAN_FAILED',
          message: 'LIBRARY SCAN INTERRUPTED',
          detail: err.message || 'An unexpected error occurred during library scan',
        });
      }
    }
  }, [loggedIn]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // -------------------------------------------------------------------------
  // FILTER ALBUMS - TOP 50 BY LIKED TRACKS, OPTIONALLY BY DECADE
  // -------------------------------------------------------------------------

  /**
   * Album Selection Algorithm:
   * 1. Filter by decade (if selected)
   * 2. Deduplicate by album name + artist (keeps version with most liked tracks)
   * 3. Sort by saved track count (most saved = most loved)
   * 4. Take top 50 albums
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

    // Step 2: Deduplicate by album name + artist (Spotify sometimes has multiple IDs for same album)
    // Keep the version with most liked tracks
    // Normalize names: strip parentheticals like "(Deluxe)", "(Remastered)", "(Original Broadway Cast Recording)"
    const normalizeName = (name) => {
      return name
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, '') // Remove (...) parentheticals
        .replace(/\s*\[[^\]]*\]\s*/g, '') // Remove [...] brackets
        .replace(/\s+-\s+.*(deluxe|remaster|edition|version|expanded|anniversary).*/i, '') // Remove " - Deluxe Edition" suffixes
        .trim();
    };

    const deduped = [];
    const seen = new Map(); // key: normalized name (artist excluded - too unreliable for cast recordings)
    for (const album of candidates) {
      const key = normalizeName(album.name);
      if (seen.has(key)) {
        const existingIdx = seen.get(key);
        // Replace if this version has more liked tracks
        if (album.likedTracks > deduped[existingIdx].likedTracks) {
          deduped[existingIdx] = album;
        }
      } else {
        seen.set(key, deduped.length);
        deduped.push(album);
      }
    }

    // Step 3: Sort by liked track count (highest first)
    const sorted = deduped.sort((a, b) => b.likedTracks - a.likedTracks);

    // Step 4: Take top albums (slightly more than 50 to allow row rounding in Desktop)
    // Desktop.jsx will slice to complete rows based on viewport columns
    return sorted.slice(0, TARGET_ALBUM_COUNT + 10);
  }, [albums, decade, unavailableAlbums, isLoading, decadeStatus, albumsByDecade]);

  // -------------------------------------------------------------------------
  // SETTINGS HANDLERS
  // -------------------------------------------------------------------------

  const handleDecadeChange = useCallback((newDecade) => {
    console.log('[useSpotify] handleDecadeChange called:', newDecade);
    setDecade(newDecade);
    localStorage.setItem(STORAGE_KEYS.DECADE, newDecade);
  }, []);

  // -------------------------------------------------------------------------
  // CONNECT MODE INITIALIZATION
  // -------------------------------------------------------------------------
  // All playback uses Spotify Connect - controls user's Spotify app/device.
  // No Web Playback SDK needed - simpler and works on all browsers.

  useEffect(() => {
    if (!loggedIn) return;
    if (!user) return;

    // Check Premium status
    if (user.product !== 'premium') {
      console.log('[Connect] User does not have Spotify Premium:', user.product);
      setAuthError({
        code: 'PREMIUM_REQUIRED',
        message: 'SPOTIFY PREMIUM REQUIRED',
        detail: 'Playback control requires a Spotify Premium subscription. You can still browse your library.',
      });
      return;
    }

    // Mark ready for Connect mode - device ID will be detected on first poll
    console.log('[Connect] Premium user detected - enabling playback control');
    setDeviceReady(true);
  }, [loggedIn, user]);

  // -------------------------------------------------------------------------
  // CONNECT MODE POLLING - Playback state sync
  // -------------------------------------------------------------------------
  // Poll Spotify API for current playback state. Updates UI to reflect
  // what's playing on user's active Spotify device.

  useEffect(() => {
    if (!loggedIn || !deviceReady) {
      clearInterval(connectPollIntervalRef.current);
      return;
    }

    console.log('[Connect] Starting playback state polling');

    const pollPlaybackState = async () => {
      try {
        const state = await getPlaybackState();

        // No active playback - check for new devices periodically
        if (!state || !state.item) {
          // Poll for new devices every 10s when idle (user may have opened Spotify)
          const now = Date.now();
          if (now - lastDeviceCheckRef.current > 10000) {
            lastDeviceCheckRef.current = now;
            const devices = await getDevices();
            const activeDevice = devices.find(d => d.is_active);
            if (activeDevice && activeDevice.id !== deviceId) {
              console.log('[Connect] New active device detected while idle:', activeDevice.name);
              setDeviceId(activeDevice.id);
              setActiveDeviceName(activeDevice.name);
            }
          }
          return;
        }

        // Update device ID for controls (play/pause/next/prev)
        if (state.device?.id && state.device.id !== deviceId) {
          console.log('[Connect] Active device:', state.device.name);
          setDeviceId(state.device.id);
          setActiveDeviceName(state.device.name);
        }

        // Update playback state
        setIsPlaying(state.is_playing);
        setPosition(state.progress_ms || 0);
        setDuration(state.item.duration_ms || 0);

        // Update current track
        const track = state.item;
        setCurrentTrack({
          id: track.id,
          name: track.name,
          artist: track.artists?.map(a => a.name).join(', ') || '',
          album: track.album?.name || '',
          albumArt: track.album?.images?.[0]?.url || '',
          uri: track.uri,
        });

        // Album end detection - simplified, just log
        const currentTrackAlbumUri = track.album?.uri;
        const originalAlbumUri = originalAlbumUriRef.current;

        if (originalAlbumUri && currentTrackAlbumUri &&
            currentTrackAlbumUri !== originalAlbumUri &&
            !albumEndTriggeredRef.current) {
          console.log('[Connect] Album ended - context changed');
          albumEndTriggeredRef.current = true;
        }
      } catch (err) {
        // Silently ignore polling errors (network hiccups, etc.)
        console.log('[Connect] Poll error:', err.message);
      }
    };

    // Poll immediately, then every 1 second
    pollPlaybackState();
    connectPollIntervalRef.current = setInterval(pollPlaybackState, 1000);

    return () => {
      console.log('[Connect] Stopping playback state polling');
      clearInterval(connectPollIntervalRef.current);
    };
  }, [loggedIn, deviceReady, deviceId]);

  // -------------------------------------------------------------------------
  // VISIBILITY-BASED DEVICE REFRESH
  // -------------------------------------------------------------------------
  // When user returns from Spotify app (switches back to browser),
  // immediately check for new active devices.

  useEffect(() => {
    if (!loggedIn || !deviceReady) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Connect] Page visible - refreshing devices');
        try {
          const devices = await getDevices();
          const activeDevice = devices.find(d => d.is_active);
          if (activeDevice) {
            console.log('[Connect] Found active device on return:', activeDevice.name);
            setDeviceId(activeDevice.id);
            setActiveDeviceName(activeDevice.name);
            // Clear any previous NO_DEVICE error since we found one
            if (playbackError?.code === 'NO_DEVICE') {
              setPlaybackError(null);
            }
          }
        } catch (err) {
          console.log('[Connect] Visibility refresh error:', err.message);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loggedIn, deviceReady, playbackError]);

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
    if (!deviceId) {
      // No active device - open Spotify app/web to establish connection
      const link = document.createElement('a');
      link.href = 'spotify://';
      link.click();
      // Fallback to web player in new tab
      setTimeout(() => {
        window.open('https://open.spotify.com', '_blank');
      }, 1500);
      return;
    }
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

    // Set volume via Spotify API (works with Connect mode)
    if (deviceId) {
      try {
        await setVolume(deviceId, newVolume);
      } catch (err) {
        console.log('[Volume] API error:', err.message);
      }
    }

    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem(STORAGE_KEYS.MUTED, 'false');
    }
  }, [deviceId, isMuted]);

  const handleMuteToggle = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(STORAGE_KEYS.MUTED, newMuted.toString());

    // Set volume via Spotify API (works with Connect mode)
    if (deviceId) {
      try {
        await setVolume(deviceId, newMuted ? 0 : volume);
      } catch (err) {
        console.log('[Volume] API error:', err.message);
      }
    }
  }, [deviceId, isMuted, volume]);

  const playTrack = useCallback(async (track, album) => {
    // Circuit breaker - stop cascading errors when auth is known to be invalid
    if (authInvalidRef.current) {
      return;
    }

    try {
      addBreadcrumb(`Playing track: ${track.name}`, 'spotify', 'info');

      // Find a device to play on
      let targetDeviceId = deviceId;
      let needsTransfer = false;

      if (!targetDeviceId) {
        let devices = await getDevices();

        // On mobile, retry device discovery if no devices found
        // User may have just opened Spotify app and devices take a moment to register
        if (devices.length === 0 && isMobile) {
          console.log('[Connect] No devices found on mobile - retrying in 1s...');
          await new Promise(r => setTimeout(r, 1000));
          devices = await getDevices();
        }

        // On mobile, prefer smartphone devices (play on user's phone)
        // On desktop, prefer active device or first available
        let targetDevice;
        if (isMobile) {
          // Try: smartphone → active device → first device
          targetDevice = devices.find(d => d.type === 'Smartphone') ||
                         devices.find(d => d.is_active) ||
                         devices[0];
          console.log('[Connect] Mobile mode - looking for smartphone device');
        } else {
          // Desktop: active device → first device
          targetDevice = devices.find(d => d.is_active) || devices[0];
        }

        if (!targetDevice) {
          setPlaybackError({
            code: 'NO_DEVICE',
            message: 'NO ACTIVE SPOTIFY CLIENT DETECTED',
            detail: isMobile
              ? '// OPEN SPOTIFY APP ON THIS DEVICE\n// THEN RETURN HERE TO PLAY'
              : '// LAUNCH SPOTIFY ON ANY DEVICE\n// DESKTOP APP, MOBILE, OR WEB PLAYER',
            action: isMobile ? 'OPEN_SPOTIFY' : null,
          });
          return;
        }

        console.log('[Connect] Using device:', targetDevice.name, `(${targetDevice.type})`);
        targetDeviceId = targetDevice.id;
        setDeviceId(targetDevice.id);
        setActiveDeviceName(targetDevice.name);

        // If device isn't active, we need to transfer playback first
        needsTransfer = !targetDevice.is_active;
      }

      setPlaybackError(null);
      originalAlbumUriRef.current = album.uri;
      albumEndTriggeredRef.current = false;

      // Transfer playback to wake up device if needed
      if (needsTransfer) {
        console.log('[Connect] Transferring playback to device...');
        await transferPlayback(targetDeviceId, false);
        // Delay to let device wake up - 500ms for reliability
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await play(targetDeviceId, {
        contextUri: album.uri,
        offset: track.uri,
      });
    } catch (err) {
      console.error('[Connect] Failed to play track:', err);

      // Trip circuit breaker on auth errors to stop cascade
      const isAuthError = err.message?.includes('Not authenticated') ||
                          err.message?.includes('Session expired') ||
                          err.message?.includes('Access denied');
      if (isAuthError) {
        authInvalidRef.current = true;
      }

      // Check for "Restriction violated" - device is controlled by another app
      // or has Premium restrictions (is_restricted: true on device)
      const isRestricted = err.message?.includes('Restriction violated') ||
                           err.message?.includes('restricted');

      // Clear stale device ID on device-related errors
      // Next play attempt will fetch fresh device list
      const isDeviceError = err.message?.includes('Device not found') ||
                            err.message?.includes('No active device') ||
                            isRestricted;
      if (isDeviceError) {
        console.log('[Connect] Clearing stale device ID due to error');
        setDeviceId(null);
        setActiveDeviceName(null);
      }

      captureException(err, { context: 'playTrack', trackId: track.id });

      if (isAuthError) {
        setPlaybackError({
          code: 'AUTH_EXPIRED',
          message: 'SESSION EXPIRED',
          detail: 'Please log in again',
        });
      } else if (isRestricted) {
        setPlaybackError({
          code: 'DEVICE_RESTRICTED',
          message: 'DEVICE LOCKED BY EXTERNAL PROCESS',
          detail: '// ANOTHER APP CONTROLS THIS DEVICE\n// CLOSE OTHER SPOTIFY CLIENTS AND RETRY',
        });
      } else {
        setPlaybackError({
          code: 'PLAYBACK_FAILURE',
          message: 'TRACK INITIALIZATION FAILED',
          detail: err.message,
        });
      }
    }
  }, [deviceId, isMobile]);

  const playAlbum = useCallback(async (album) => {
    // Circuit breaker - stop cascading errors when auth is known to be invalid
    if (authInvalidRef.current) {
      return;
    }

    try {
      addBreadcrumb(`Playing album: ${album.name}`, 'spotify', 'info');

      // Find a device to play on
      let targetDeviceId = deviceId;
      let needsTransfer = false;

      if (!targetDeviceId) {
        let devices = await getDevices();

        // On mobile, retry device discovery if no devices found
        // User may have just opened Spotify app and devices take a moment to register
        if (devices.length === 0 && isMobile) {
          console.log('[Connect] No devices found on mobile - retrying in 1s...');
          await new Promise(r => setTimeout(r, 1000));
          devices = await getDevices();
        }

        // On mobile, prefer smartphone devices (play on user's phone)
        // On desktop, prefer active device or first available
        let targetDevice;
        if (isMobile) {
          // Try: smartphone → active device → first device
          targetDevice = devices.find(d => d.type === 'Smartphone') ||
                         devices.find(d => d.is_active) ||
                         devices[0];
          console.log('[Connect] Mobile mode - looking for smartphone device');
        } else {
          // Desktop: active device → first device
          targetDevice = devices.find(d => d.is_active) || devices[0];
        }

        if (!targetDevice) {
          setPlaybackError({
            code: 'NO_DEVICE',
            message: 'NO ACTIVE SPOTIFY CLIENT DETECTED',
            detail: isMobile
              ? '// OPEN SPOTIFY APP ON THIS DEVICE\n// THEN RETURN HERE TO PLAY'
              : '// LAUNCH SPOTIFY ON ANY DEVICE\n// DESKTOP APP, MOBILE, OR WEB PLAYER',
            action: isMobile ? 'OPEN_SPOTIFY' : null,
          });
          return;
        }

        console.log('[Connect] Using device:', targetDevice.name, `(${targetDevice.type})`);
        targetDeviceId = targetDevice.id;
        setDeviceId(targetDevice.id);
        setActiveDeviceName(targetDevice.name);

        // If device isn't active, we need to transfer playback first
        needsTransfer = !targetDevice.is_active;
      }

      setPlaybackError(null);
      originalAlbumUriRef.current = album.uri;
      albumEndTriggeredRef.current = false;

      // Transfer playback to wake up device if needed
      if (needsTransfer) {
        console.log('[Connect] Transferring playback to device...');
        await transferPlayback(targetDeviceId, false);
        // Delay to let device wake up - 500ms for reliability
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await play(targetDeviceId, {
        contextUri: album.uri,
      });
    } catch (err) {
      console.error('[Connect] Failed to play album:', err);

      // Check for auth errors first - trip circuit breaker to stop cascade
      const isAuthError = err.message?.includes('Not authenticated') ||
                          err.message?.includes('Session expired') ||
                          err.message?.includes('Access denied');
      if (isAuthError) {
        authInvalidRef.current = true;
        captureException(err, { context: 'playAlbum_auth', albumId: album.id });
        setPlaybackError({
          code: 'AUTH_EXPIRED',
          message: 'SESSION EXPIRED',
          detail: 'Please log in again',
        });
        return;
      }

      // Check for "Restriction violated" - device is controlled by another app
      // or has Premium restrictions (is_restricted: true on device)
      // Must check BEFORE 403 check since both contain "restricted"
      const isDeviceRestricted = err.message?.includes('Restriction violated');

      // Clear stale device ID on device-related errors
      // Next play attempt will fetch fresh device list
      const isDeviceError = err.message?.includes('Device not found') ||
                            err.message?.includes('No active device') ||
                            isDeviceRestricted;
      if (isDeviceError) {
        console.log('[Connect] Clearing stale device ID due to error');
        setDeviceId(null);
        setActiveDeviceName(null);
      }

      if (isDeviceRestricted) {
        captureException(err, { context: 'playAlbum_restricted', albumId: album.id });
        setPlaybackError({
          code: 'DEVICE_RESTRICTED',
          message: 'DEVICE LOCKED BY EXTERNAL PROCESS',
          detail: '// ANOTHER APP CONTROLS THIS DEVICE\n// CLOSE OTHER SPOTIFY CLIENTS AND RETRY',
        });
        return;
      }

      // Check if this is a 403 error (album unavailable/region restricted)
      const is403Error = err.message?.includes('403') ||
                         err.message?.includes('Forbidden') ||
                         err.status === 403;

      if (is403Error) {
        console.log(`[Album Unavailable] Marking album "${album.name}" (${album.id}) as unavailable`);
        captureException(err, { context: 'playAlbum_403', albumId: album.id });
        setUnavailableAlbums(prev => {
          if (prev.some(a => a.id === album.id)) return prev;
          return [...prev, {
            id: album.id,
            name: album.name,
            artist: album.artist,
            reason: 'Region restricted (403 Forbidden)',
            timestamp: new Date().toISOString(),
          }];
        });
        setPlaybackError({
          code: 'ALBUM_UNAVAILABLE',
          message: 'ALBUM RESTRICTED',
          detail: 'This album is not available in your region',
        });
      } else {
        captureException(err, { context: 'playAlbum', albumId: album.id });
        setPlaybackError({
          code: 'PLAYBACK_FAILURE',
          message: 'ALBUM INITIALIZATION FAILED',
          detail: err.message,
        });
      }
    }
  }, [deviceId, isMobile]);

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
  }, []);

  // -------------------------------------------------------------------------
  // DEVICE CHECK & TRANSFER (for post-auth connection flow)
  // -------------------------------------------------------------------------
  // Exposed for App.jsx to check if Spotify is ready before starting scan

  const checkAndConnectDevice = useCallback(async () => {
    try {
      const devices = await getDevices();
      console.log('[Connect] Device check:', devices.length, 'devices found');

      if (devices.length === 0) {
        console.log('[Connect] No devices found - show connection overlay');
        return { connected: false, devices: [] };
      }

      // Find best device (active > smartphone > first)
      const activeDevice = devices.find(d => d.is_active);
      const smartphoneDevice = devices.find(d => d.type === 'Smartphone');
      const targetDevice = activeDevice || smartphoneDevice || devices[0];

      // If device exists but not active, try to activate it
      if (!activeDevice && targetDevice) {
        console.log('[Connect] Activating device:', targetDevice.name);
        try {
          await transferPlayback(targetDevice.id, false);
          setDeviceId(targetDevice.id);
          setActiveDeviceName(targetDevice.name);
          return { connected: true, devices, activeDevice: targetDevice };
        } catch (err) {
          // Transfer failed - user needs to manually open Spotify and play something
          // This is the common case after OAuth: user has Spotify but isn't playing
          console.log('[Connect] Failed to activate device:', err.message);
          console.log('[Connect] Transfer failed - show connection overlay');
          return { connected: false, devices, error: 'Device exists but could not be activated' };
        }
      } else if (activeDevice) {
        // Device is already active and playing - we're good
        setDeviceId(activeDevice.id);
        setActiveDeviceName(activeDevice.name);
        return { connected: true, devices, activeDevice };
      }

      // Fallback: device exists but couldn't determine status
      console.log('[Connect] Could not determine device status');
      return { connected: false, devices };
    } catch (err) {
      console.error('[Connect] Device check failed:', err);
      return { connected: false, devices: [], error: err.message };
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
    // During scan: compute live count from progressive albumsByDecade
    // After scan: use final albums.length
    allAlbumsCount: isLoading
      ? Object.values(albumsByDecade).reduce((sum, decadeAlbums) => sum + (decadeAlbums?.length || 0), 0)
      : albums.length,
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
    deviceReady, // True only after SDK transfer completes - safe to play
    isPlaying,
    currentTrack,
    position,
    duration,
    volume,
    isMuted,
    playbackError,
    clearPlaybackError: () => setPlaybackError(null),

    // Connect mode (controls external Spotify device)
    activeDeviceName,

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

    // Scan errors (403 whitelist issues)
    scanError,
    clearScanError: () => setScanError(null),

    // Device connection (for post-auth flow)
    checkAndConnectDevice,
  };
}

export default useSpotify;
