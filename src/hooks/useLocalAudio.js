/**
 * ============================================================================
 * useLocalAudio HOOK
 * ============================================================================
 *
 * Handles local audio playback for pre-login demo tracks.
 *
 * Uses the Web Audio API for:
 * - Playing local MP3 files
 * - Exposing audio data for visualizer
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { LOCAL_TRACKS, STORAGE_KEYS } from '../utils/constants';

export function useLocalAudio() {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  // Start with a random track
  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    () => Math.floor(Math.random() * LOCAL_TRACKS.length)
  );
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(
    parseInt(localStorage.getItem(STORAGE_KEYS.VOLUME) || '80')
  );
  const [isMuted, setIsMuted] = useState(
    localStorage.getItem(STORAGE_KEYS.MUTED) === 'true'
  );
  const [audioContextReady, setAudioContextReady] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const positionIntervalRef = useRef(null);

  // Current track
  const currentTrack = LOCAL_TRACKS[currentTrackIndex];

  // -------------------------------------------------------------------------
  // INITIALIZE AUDIO ELEMENT
  // -------------------------------------------------------------------------

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Event handlers
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration * 1000);
    });

    audio.addEventListener('ended', () => {
      // Auto-advance to next track
      setCurrentTrackIndex((prev) => (prev + 1) % LOCAL_TRACKS.length);
    });

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // -------------------------------------------------------------------------
  // LOAD TRACK WHEN INDEX CHANGES
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    const audio = audioRef.current;
    const wasPlaying = !audio.paused;

    audio.src = currentTrack.src;
    audio.volume = isMuted ? 0 : volume / 100;

    if (wasPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentTrackIndex, currentTrack]);

  // -------------------------------------------------------------------------
  // UPDATE POSITION WHILE PLAYING
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (isPlaying) {
      positionIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPosition(audioRef.current.currentTime * 1000);
        }
      }, 100);
    } else {
      clearInterval(positionIntervalRef.current);
    }

    return () => clearInterval(positionIntervalRef.current);
  }, [isPlaying]);

  // -------------------------------------------------------------------------
  // AUDIO CONTEXT FOR VISUALIZER
  // -------------------------------------------------------------------------

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 2048; // Higher for better visualizer quality
      analyzer.smoothingTimeConstant = 0.7;

      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      setAudioContextReady(true);
    } catch (err) {
      console.error('Failed to init audio context:', err);
    }
  }, []);

  // -------------------------------------------------------------------------
  // PLAYBACK CONTROLS
  // -------------------------------------------------------------------------

  const play = useCallback(() => {
    if (!audioRef.current) return;

    // Initialize audio context on first play (requires user interaction)
    initAudioContext();

    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    audioRef.current.play().catch(console.error);
  }, [initAudioContext]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const next = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % LOCAL_TRACKS.length);
  }, []);

  const previous = useCallback(() => {
    // If more than 3 seconds in, restart; otherwise go to previous
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setPosition(0);
    } else {
      setCurrentTrackIndex((prev) =>
        prev === 0 ? LOCAL_TRACKS.length - 1 : prev - 1
      );
    }
  }, []);

  const seek = useCallback((positionMs) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = positionMs / 1000;
    setPosition(positionMs);
  }, []);

  const handleVolumeChange = useCallback((newVolume) => {
    setVolumeState(newVolume);
    localStorage.setItem(STORAGE_KEYS.VOLUME, newVolume.toString());

    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }

    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem(STORAGE_KEYS.MUTED, 'false');
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(STORAGE_KEYS.MUTED, newMuted.toString());

    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume / 100;
    }
  }, [isMuted, volume]);

  // -------------------------------------------------------------------------
  // FADE IN/OUT FOR AUTH TRANSITIONS
  // -------------------------------------------------------------------------

  const fadeOut = useCallback((durationMs = 500) => {
    return new Promise((resolve) => {
      if (!audioRef.current || !isPlaying) {
        resolve();
        return;
      }

      const steps = 20;
      const stepDuration = durationMs / steps;
      const startVolume = audioRef.current.volume;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
        audioRef.current.volume = newVolume;

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audioRef.current.pause();
          resolve();
        }
      }, stepDuration);
    });
  }, [isPlaying]);

  const fadeIn = useCallback((durationMs = 500) => {
    return new Promise((resolve) => {
      if (!audioRef.current) {
        resolve();
        return;
      }

      // Initialize audio context if needed
      initAudioContext();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const targetVolume = isMuted ? 0 : volume / 100;
      audioRef.current.volume = 0;

      audioRef.current.play().then(() => {
        const steps = 20;
        const stepDuration = durationMs / steps;
        const volumeStep = targetVolume / steps;
        let currentStep = 0;

        const fadeInterval = setInterval(() => {
          currentStep++;
          const newVolume = Math.min(targetVolume, volumeStep * currentStep);
          audioRef.current.volume = newVolume;

          if (currentStep >= steps) {
            clearInterval(fadeInterval);
            resolve();
          }
        }, stepDuration);
      }).catch((err) => {
        console.error('Failed to play audio:', err);
        resolve();
      });
    });
  }, [initAudioContext, isMuted, volume]);

  // -------------------------------------------------------------------------
  // GET FREQUENCY DATA FOR VISUALIZER
  // -------------------------------------------------------------------------

  const getFrequencyData = useCallback(() => {
    if (!analyzerRef.current) return null;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteFrequencyData(dataArray);

    return dataArray;
  }, []);

  // -------------------------------------------------------------------------
  // LOAD INITIAL TRACK ON MOUNT
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Load the first track (don't autoplay - user will click play)
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.src;
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, []);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // Playback state
    isPlaying,
    currentTrack: currentTrack ? {
      id: currentTrack.id,
      name: currentTrack.name,
      artist: currentTrack.artist,
      album: 'Demo Tracks',
      albumArt: '/logo.png',
    } : null,
    position,
    duration,
    volume,
    isMuted,

    // Controls
    play,
    pause,
    next,
    previous,
    seek,
    setVolume: handleVolumeChange,
    toggleMute,
    fadeOut,
    fadeIn,

    // Visualizer data
    getFrequencyData,
    analyzer: audioContextReady ? analyzerRef.current : null,
    audioContext: audioContextReady ? audioContextRef.current : null,

    // For initializing audio context from user interaction
    initAudioContext,
  };
}

export default useLocalAudio;
