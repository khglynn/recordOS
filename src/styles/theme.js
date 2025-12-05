/**
 * ============================================================================
 * RECORD OS - CUSTOM THEME
 * ============================================================================
 *
 * Matrix-inspired, grungy 90s aesthetic with Win95 bones.
 * Think: Alien computer terminals meets Windows 95.
 *
 * Color palette:
 * - Primary green: #00ff41 (Matrix green)
 * - Dark background: #0a0a0a
 * - Grid lines: #1a1a1a with green glow
 * - Accent: #00cc33 (darker green for contrast)
 */

// Base React95 theme we'll customize
// We're using a dark theme as base and overriding colors
export const recordOSTheme = {
  // Main colors
  name: 'recordOS',

  // Desktop and window backgrounds
  desktopBackground: '#0a0a0a',
  material: '#1a1a1a',
  materialDark: '#0d0d0d',

  // The classic Win95 3D border colors - but darker/greener
  borderDark: '#0a0a0a',
  borderDarkest: '#000000',
  borderLight: '#2a2a2a',
  borderLightest: '#3a3a3a',

  // Canvas (input backgrounds, etc)
  canvas: '#0d0d0d',
  canvasText: '#00ff41',
  canvasTextDisabled: '#1a5a1a',
  canvasTextDisabledShadow: '#0a0a0a',
  canvasTextInvert: '#0a0a0a',

  // Header bars (title bars)
  headerBackground: 'linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%)',
  headerNotActiveBackground: 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)',
  headerNotActiveText: '#4a4a4a',
  headerText: '#00ff41',

  // Text colors
  materialText: '#00ff41',
  materialTextDisabled: '#2a5a2a',
  materialTextDisabledShadow: '#0a0a0a',
  materialTextInvert: '#0a0a0a',

  // Progress bars, selections
  progress: '#00ff41',
  progressBackground: '#0a2a0a',

  // Flat/anchor styles
  flatDark: '#1a3a1a',
  flatLight: '#2a4a2a',

  // Tooltip
  tooltip: '#0d1f0d',

  // Focus outline
  focusSecondary: '#00cc33',

  // Hover states
  hoverBackground: '#0a2a0a',

  // Checkmarks, etc
  checkmark: '#00ff41',
  checkmarkDisabled: '#2a5a2a',
};

/**
 * ============================================================================
 * CUSTOM STYLED-COMPONENTS HELPERS
 * ============================================================================
 */

// Matrix green glow effect for elements
export const matrixGlow = `
  box-shadow:
    0 0 5px rgba(0, 255, 65, 0.3),
    0 0 10px rgba(0, 255, 65, 0.2),
    0 0 20px rgba(0, 255, 65, 0.1);
`;

// Subtle scanline effect for that CRT feel
export const scanlineOverlay = `
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
`;

// Flicker animation for that unstable power feel
export const flickerAnimation = `
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.8; }
    94% { opacity: 1; }
    97% { opacity: 0.9; }
    98% { opacity: 1; }
  }
`;

// Grid pulse animation for the background
export const gridPulseAnimation = `
  @keyframes gridPulse {
    0%, 100% {
      opacity: 0.3;
      filter: brightness(1);
    }
    50% {
      opacity: 0.5;
      filter: brightness(1.2);
    }
  }
`;

export default recordOSTheme;
