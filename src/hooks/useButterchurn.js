/**
 * ============================================================================
 * USE BUTTERCHURN HOOK
 * ============================================================================
 *
 * Manages Butterchurn (MilkDrop-style) audio visualizer.
 *
 * Approach:
 * - Accepts an external audio analyser node (from useLocalAudio)
 * - Falls back to microphone input if no analyser provided
 * - Renders to a WebGL canvas
 * - Cycles through presets
 * - Optimized for performance: lower resolution, capped framerate
 *
 * Usage:
 * 1. Pass an external analyser from the audio hook
 * 2. Initialize with canvas element
 * 3. Visualizer renders automatically
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Performance settings
const RENDER_WIDTH = 480;  // Low res for retro CRT aesthetic + performance
const RENDER_HEIGHT = 360;
const TARGET_FPS = 24;
const FRAME_TIME = 1000 / TARGET_FPS;

// Curated presets that look good and perform well
const GOOD_PRESETS = [
  'Flexi - when monopoly goes wrong',
  'Geiss - Cauldron - painterly 2',
  'martin - castle in the air',
  'Unchained - Beat Demo 2.3',
  'Zylot - The Inner Workings of my New Computer',
  'Rovastar - Fractopia (Galaxy Quest Mix)',
  'Geiss - Cauldron',
  'ORB - Waaa',
  'shifter - tumbling cubes (ripples)',
  'Unchained - Unified Drag',
];

// ============================================================================
// HOOK
// ============================================================================

export function useButterchurn() {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPreset, setCurrentPreset] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs
  const visualizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const presetIndexRef = useRef(0);

  // -------------------------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context - but only if we created it (not external)
    // Don't close external contexts as they're managed elsewhere
    if (streamRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;

    visualizerRef.current = null;
    analyserRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // -------------------------------------------------------------------------
  // RENDER LOOP (must be defined before initialize)
  // -------------------------------------------------------------------------

  const startRenderLoop = useCallback(() => {
    const render = (timestamp) => {
      // Throttle to target FPS
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < FRAME_TIME) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTimeRef.current = timestamp - (elapsed % FRAME_TIME);

      // Render frame
      if (visualizerRef.current) {
        visualizerRef.current.render();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
  }, []);

  // -------------------------------------------------------------------------
  // INITIALIZE
  // -------------------------------------------------------------------------

  const initialize = useCallback(async (canvas, externalAudioContext, externalAnalyser) => {
    if (!canvas) {
      setError('No canvas provided');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      let audioContext;
      let analyser;

      // Use external audio source if provided (from local audio playback)
      if (externalAudioContext && externalAnalyser) {
        audioContext = externalAudioContext;
        analyser = externalAnalyser;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        setHasPermission(true); // No permission needed for external source
      } else {
        // Fall back to microphone (legacy behavior)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });

        streamRef.current = stream;
        setHasPermission(true);

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      // Resume audio context if needed
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Initialize Butterchurn
      canvasRef.current = canvas;
      const visualizer = butterchurn.createVisualizer(
        audioContext,
        canvas,
        {
          width: RENDER_WIDTH,
          height: RENDER_HEIGHT,
          pixelRatio: 1, // Lower for performance
          textureRatio: 1,
        }
      );

      // Connect audio to visualizer
      visualizer.connectAudio(analyser);

      // Load first preset
      const presets = butterchurnPresets.getPresets();
      const presetNames = Object.keys(presets);

      // Try to use a curated preset, fall back to random
      let initialPreset = GOOD_PRESETS.find(name => presetNames.includes(name));
      if (!initialPreset) {
        initialPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
      }

      visualizer.loadPreset(presets[initialPreset], 0);
      setCurrentPreset(initialPreset);
      presetIndexRef.current = GOOD_PRESETS.indexOf(initialPreset);

      visualizerRef.current = visualizer;
      setIsEnabled(true);
      setIsLoading(false);

      // Start render loop
      startRenderLoop();

      return true;
    } catch (err) {
      console.error('Butterchurn init error:', err);

      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError(err.message || 'Failed to initialize visualizer');
      }

      setIsLoading(false);
      cleanup();
      return false;
    }
  }, [cleanup, startRenderLoop]);

  // -------------------------------------------------------------------------
  // PRESET CYCLING
  // -------------------------------------------------------------------------

  const nextPreset = useCallback(() => {
    if (!visualizerRef.current) return;

    const presets = butterchurnPresets.getPresets();
    const presetNames = Object.keys(presets);

    // Try curated presets first, then fall back to all
    let nextName;
    if (presetIndexRef.current < GOOD_PRESETS.length - 1) {
      presetIndexRef.current++;
      nextName = GOOD_PRESETS[presetIndexRef.current];
      // Verify it exists
      if (!presetNames.includes(nextName)) {
        nextName = presetNames[Math.floor(Math.random() * presetNames.length)];
      }
    } else {
      // Random preset
      nextName = presetNames[Math.floor(Math.random() * presetNames.length)];
    }

    // Smooth transition (2 seconds)
    visualizerRef.current.loadPreset(presets[nextName], 2.0);
    setCurrentPreset(nextName);
  }, []);

  const randomPreset = useCallback(() => {
    if (!visualizerRef.current) return;

    const presets = butterchurnPresets.getPresets();
    const presetNames = Object.keys(presets);
    const randomName = presetNames[Math.floor(Math.random() * presetNames.length)];

    visualizerRef.current.loadPreset(presets[randomName], 2.0);
    setCurrentPreset(randomName);
  }, []);

  // -------------------------------------------------------------------------
  // DISABLE
  // -------------------------------------------------------------------------

  const disable = useCallback(() => {
    cleanup();
    setIsEnabled(false);
    setCurrentPreset(null);
  }, [cleanup]);

  // -------------------------------------------------------------------------
  // RESIZE
  // -------------------------------------------------------------------------

  const resize = useCallback((width, height) => {
    if (visualizerRef.current && canvasRef.current) {
      canvasRef.current.width = Math.min(width, RENDER_WIDTH);
      canvasRef.current.height = Math.min(height, RENDER_HEIGHT);
      visualizerRef.current.setRendererSize(
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, []);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // State
    isEnabled,
    isLoading,
    error,
    currentPreset,
    hasPermission,

    // Actions
    initialize,
    disable,
    nextPreset,
    randomPreset,
    resize,
  };
}

export default useButterchurn;
