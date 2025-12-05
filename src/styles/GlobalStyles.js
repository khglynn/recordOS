/**
 * ============================================================================
 * GLOBAL STYLES
 * ============================================================================
 *
 * Base styles for Record OS. Sets up the dark background, fonts,
 * and overrides some React95 defaults for our grungy aesthetic.
 */

import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  /* -------------------------------------------------------------------------
   * CSS RESET & BASE
   * ------------------------------------------------------------------------- */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Global CRT scanline overlay - covers EVERYTHING including modals */
  #root::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.1) 2px,
      rgba(0, 0, 0, 0.1) 4px
    );
    pointer-events: none;
    z-index: 999999;
    transition: opacity 0.2s ease;
  }

  /* Hide scanlines when toggle is off */
  body.scanlines-disabled #root::after {
    opacity: 0;
  }

  body {
    /* Dark background - the albums will pop */
    background: #0a0a0a;
    color: #00ff41;

    /* Classic Win95 fonts with fallbacks */
    font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;

    /* Prevent text selection for that app-like feel */
    user-select: none;

    /* Smooth font rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* -------------------------------------------------------------------------
   * SCROLLBAR STYLING (Win95-ish)
   * ------------------------------------------------------------------------- */
  ::-webkit-scrollbar {
    width: 16px;
    height: 16px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1a1a;
    border: 1px solid #0a0a0a;
  }

  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 1px solid #3a3a3a;
    border-right-color: #0a0a0a;
    border-bottom-color: #0a0a0a;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  }

  ::-webkit-scrollbar-corner {
    background: #1a1a1a;
  }

  /* -------------------------------------------------------------------------
   * LINK STYLES
   * ------------------------------------------------------------------------- */
  a {
    color: #00ff41;
    text-decoration: underline;
  }

  a:hover {
    color: #00cc33;
  }

  /* -------------------------------------------------------------------------
   * BUTTON RESETS (let React95 handle styling)
   * ------------------------------------------------------------------------- */
  button {
    font-family: inherit;
    cursor: pointer;
  }

  /* -------------------------------------------------------------------------
   * IMAGE DEFAULTS
   * ------------------------------------------------------------------------- */
  img {
    max-width: 100%;
    display: block;
  }

  /* -------------------------------------------------------------------------
   * CUSTOM ANIMATIONS
   * ------------------------------------------------------------------------- */

  /* Subtle flicker for CRT effect */
  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.85; }
    94% { opacity: 1; }
    97% { opacity: 0.9; }
    98% { opacity: 1; }
  }

  /* Grid line pulse */
  @keyframes gridPulse {
    0%, 100% {
      opacity: 0.2;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Subtle static noise */
  @keyframes staticNoise {
    0% { background-position: 0 0; }
    100% { background-position: 100% 100%; }
  }

  /* Window appear animation */
  @keyframes windowAppear {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* -------------------------------------------------------------------------
   * REACT95 OVERRIDES
   * ------------------------------------------------------------------------- */

  /* Make windows have that Matrix glow */
  [class*="Window"] {
    box-shadow:
      inset 1px 1px 0 #3a3a3a,
      inset -1px -1px 0 #0a0a0a,
      0 0 20px rgba(0, 255, 65, 0.1),
      0 4px 20px rgba(0, 0, 0, 0.5) !important;
  }

  /* Style all buttons with green accent */
  [class*="Button"]:not(:disabled):hover {
    background: linear-gradient(180deg, #2a3a2a 0%, #1a2a1a 100%) !important;
  }

  /* Taskbar overrides handled in component */
`;

export default GlobalStyles;
