/**
 * ============================================================================
 * SPOTIFY API UTILITIES
 * ============================================================================
 *
 * Handles all Spotify OAuth (PKCE flow) and API calls.
 *
 * IMPORTANT: This uses the PKCE flow which is secure for client-side apps.
 * No client secret needed - just the client ID.
 *
 * Flow:
 * 1. User clicks login
 * 2. We generate a code verifier + code challenge
 * 3. Redirect to Spotify auth
 * 4. Spotify redirects back with ?code=xxx
 * 5. We exchange code for tokens using the verifier
 * 6. Store tokens, refresh as needed
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

// Your Spotify App Client ID (safe to expose - PKCE doesn't need secret)
// TODO: Replace with your actual client ID
export const SPOTIFY_CLIENT_ID = '4b8e17e088014d58868966b640d26734';

// Redirect URI must match what's registered in Spotify Dashboard
// For local dev: http://127.0.0.1:5173/callback
// For production: https://your-vercel-domain.vercel.app/callback
export const REDIRECT_URI = import.meta.env.PROD
  ? `${window.location.origin}/callback`
  : 'http://127.0.0.1:5173/callback';

// Scopes we need for full functionality
export const SCOPES = [
  'user-read-private',           // User profile
  'user-read-email',             // User email
  'user-library-read',           // Saved tracks/albums
  'user-read-playback-state',    // Current playback
  'user-modify-playback-state',  // Control playback
  'user-read-currently-playing', // What's playing now
  'streaming',                   // Web Playback SDK
  'playlist-read-private',       // Private playlists
  'playlist-read-collaborative', // Collab playlists
].join(' ');

// ============================================================================
// PKCE HELPERS
// ============================================================================

/**
 * Generate a random string for the code verifier
 */
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * Hash the code verifier using SHA-256
 */
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

/**
 * Base64 URL encode the hash
 */
function base64UrlEncode(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate the code challenge from the verifier
 */
async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

/**
 * Start the Spotify OAuth flow
 * Redirects user to Spotify login
 */
export async function loginWithSpotify() {
  // Generate and store the code verifier
  // Use localStorage instead of sessionStorage - sessionStorage can be lost on redirect
  const codeVerifier = generateRandomString(128);
  localStorage.setItem('spotify_code_verifier', codeVerifier);

  // Generate the code challenge
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Build the auth URL
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    show_dialog: 'false', // Set to 'true' to force login dialog
  });

  // Redirect to Spotify
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange the auth code for tokens
 * Called after Spotify redirects back
 */
export async function exchangeCodeForTokens(code) {
  const codeVerifier = localStorage.getItem('spotify_code_verifier');

  if (!codeVerifier) {
    throw new Error('No code verifier found. Please try logging in again.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  const tokens = await response.json();

  // Store tokens
  saveTokens(tokens);

  // Clean up verifier
  localStorage.removeItem('spotify_code_verifier');

  return tokens;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Refresh token is invalid - clear everything
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const tokens = await response.json();
  saveTokens(tokens);

  return tokens;
}

/**
 * Save tokens to localStorage
 */
function saveTokens(tokens) {
  localStorage.setItem('spotify_access_token', tokens.access_token);
  localStorage.setItem('spotify_token_expiry', Date.now() + (tokens.expires_in * 1000));

  if (tokens.refresh_token) {
    localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
  }
}

/**
 * Get a valid access token (refreshes if needed)
 */
export async function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (!token) {
    return null;
  }

  // If token expires in less than 5 minutes, refresh it
  if (expiry && Date.now() > parseInt(expiry) - 300000) {
    try {
      const newTokens = await refreshAccessToken();
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return token;
}

/**
 * Check if user is logged in
 */
export function isLoggedIn() {
  return !!localStorage.getItem('spotify_access_token');
}

/**
 * Log out - clear all tokens
 */
export function logout() {
  clearTokens();
}

/**
 * Clear all stored tokens
 */
function clearTokens() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expiry');
}

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Make an authenticated request to the Spotify API
 */
export async function spotifyFetch(endpoint, options = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired - try to refresh
    try {
      await refreshAccessToken();
      return spotifyFetch(endpoint, options); // Retry
    } catch {
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================================================
// SPOTIFY API ENDPOINTS
// ============================================================================

/**
 * Get current user's profile
 */
export async function getCurrentUser() {
  return spotifyFetch('/me');
}

/**
 * Get user's saved tracks (liked songs)
 * Returns all tracks, paginated
 */
export async function getSavedTracks(limit = 50, offset = 0) {
  return spotifyFetch(`/me/tracks?limit=${limit}&offset=${offset}`);
}

/**
 * Get ALL saved tracks (handles pagination)
 */
export async function getAllSavedTracks(onProgress) {
  const tracks = [];
  let offset = 0;
  const limit = 50;
  let total = null;

  while (total === null || offset < total) {
    const response = await getSavedTracks(limit, offset);
    tracks.push(...response.items);
    total = response.total;
    offset += limit;

    if (onProgress) {
      onProgress({ loaded: tracks.length, total });
    }
  }

  return tracks;
}

/**
 * Get an album by ID
 */
export async function getAlbum(albumId) {
  return spotifyFetch(`/albums/${albumId}`);
}

/**
 * Get multiple albums by IDs (max 20)
 */
export async function getAlbums(albumIds) {
  if (albumIds.length === 0) return { albums: [] };
  return spotifyFetch(`/albums?ids=${albumIds.join(',')}`);
}

/**
 * Get audio analysis for a track (beats, bars, segments)
 */
export async function getAudioAnalysis(trackId) {
  return spotifyFetch(`/audio-analysis/${trackId}`);
}

/**
 * Get audio features for a track (danceability, energy, etc)
 */
export async function getAudioFeatures(trackId) {
  return spotifyFetch(`/audio-features/${trackId}`);
}

/**
 * Get current playback state
 */
export async function getPlaybackState() {
  return spotifyFetch('/me/player');
}

/**
 * Start/resume playback
 */
export async function play(deviceId, options = {}) {
  const body = {};

  if (options.contextUri) {
    body.context_uri = options.contextUri;
  }

  if (options.uris) {
    body.uris = options.uris;
  }

  if (options.offset !== undefined) {
    body.offset = typeof options.offset === 'number'
      ? { position: options.offset }
      : { uri: options.offset };
  }

  if (options.positionMs !== undefined) {
    body.position_ms = options.positionMs;
  }

  return spotifyFetch(`/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Pause playback
 */
export async function pause(deviceId) {
  return spotifyFetch(`/me/player/pause?device_id=${deviceId}`, {
    method: 'PUT',
  });
}

/**
 * Skip to next track
 */
export async function skipToNext(deviceId) {
  return spotifyFetch(`/me/player/next?device_id=${deviceId}`, {
    method: 'POST',
  });
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(deviceId) {
  return spotifyFetch(`/me/player/previous?device_id=${deviceId}`, {
    method: 'POST',
  });
}

/**
 * Seek to position in track
 */
export async function seek(deviceId, positionMs) {
  return spotifyFetch(`/me/player/seek?device_id=${deviceId}&position_ms=${positionMs}`, {
    method: 'PUT',
  });
}

/**
 * Set volume
 */
export async function setVolume(deviceId, volumePercent) {
  return spotifyFetch(`/me/player/volume?device_id=${deviceId}&volume_percent=${volumePercent}`, {
    method: 'PUT',
  });
}

/**
 * Transfer playback to a device
 */
export async function transferPlayback(deviceId, play = false) {
  return spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      device_ids: [deviceId],
      play,
    }),
  });
}
