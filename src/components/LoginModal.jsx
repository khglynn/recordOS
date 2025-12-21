/**
 * ============================================================================
 * LOGIN MODAL COMPONENT
 * ============================================================================
 *
 * Pre-auth login screen for connecting to Spotify.
 * After OAuth completes, this modal closes and LibraryScanner takes over.
 *
 * Voice: Retro-corporate with alien computer undertones
 *
 * Updated: 2025-12-10 - Removed post-auth config step (now handled by LibraryScanner)
 */

import { useRef } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';
import { loginWithSpotify } from '../utils/spotify';
import PixelIcon from './PixelIcon';
import Tooltip from './Tooltip';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  width: 340px;
  max-width: 95vw;
  z-index: ${props => props.$zIndex || 1000};

  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 30px rgba(0, 255, 65, 0.15),
    0 10px 40px rgba(0, 0, 0, 0.6) !important;

  animation: windowAppear 0.15s ease-out;

  @keyframes windowAppear {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

const StyledWindowHeader = styled(WindowHeader)`
  background: ${props => props.$active
    ? 'linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%)'
    : 'linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)'} !important;
  color: ${props => props.$active ? '#00ff41' : '#4a4a4a'} !important;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
`;

const Logo = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 20px rgba(0, 255, 65, 0.3));
`;

const Title = styled.h1`
  font-size: 22px;
  color: #00ff41;
  margin: 0 0 8px;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  font-weight: bold;
  letter-spacing: 3px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const StatusText = styled.p`
  font-size: 13px;
  color: rgba(0, 255, 65, 0.7);
  margin: 0 0 20px;
  text-align: center;
  line-height: 1.6;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const SystemMessage = styled.div`
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  padding: 16px;
  margin-bottom: 20px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  color: rgba(0, 255, 65, 0.85);
  line-height: 1.8;

  .prompt {
    color: #00ff41;
    margin-right: 8px;
  }
`;

const SpotifyButton = styled(Button)`
  width: 100%;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;

  background: linear-gradient(180deg, #1ed760 0%, #1db954 100%) !important;
  color: #000 !important;
  border-color: #1ed760 !important;

  &:hover {
    background: linear-gradient(180deg, #2ee870 0%, #1ed760 100%) !important;
  }

  &:active {
    background: linear-gradient(180deg, #1db954 0%, #169c46 100%) !important;
  }
`;

const Footer = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.4);
  margin-top: 20px;
  text-align: center;
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.4;

  .warning-icon {
    color: rgba(0, 255, 65, 0.5);
  }
`;

const CloseButton = styled(Button)`
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;
  font-weight: bold;

  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
  color: #00ff41 !important;
  border-color: #4a4a4a !important;

  &:hover {
    background: linear-gradient(180deg, #4a3a3a 0%, #3a2a2a 100%) !important;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function LoginModal({
  // Standard window props from window management system
  isActive,
  zIndex,
  position,
  onClose,
  onMinimize,
  onFocus,
  onDragStart,
  isMobile,
  // Login-specific props
  canClose,
  onBeforeAuth,
  onAccessNeeded, // Called when user needs to request access before auth
}) {
  const headerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target === headerRef.current || headerRef.current.contains(e.target)) {
      if (e.target.tagName !== 'BUTTON') {
        onDragStart?.(e);
      }
    }
    onFocus?.();
  };

  const handleLogin = async () => {
    // If access check callback exists and returns true, user needs to request access first
    if (onAccessNeeded?.()) {
      return;
    }

    try {
      // Fade out audio and preserve state before redirect
      if (onBeforeAuth) {
        await onBeforeAuth();
      }
      await loginWithSpotify();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <StyledWindow
      data-window
      $zIndex={zIndex}
      style={{ left: position?.x ?? 200, top: position?.y ?? 100 }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <StyledWindowHeader
        ref={headerRef}
        $active={isActive}
        style={{ cursor: 'grab' }}
      >
        <HeaderTitle>
          <PixelIcon name="power" size={14} />
          <span>RECORD OS // INITIALIZE</span>
        </HeaderTitle>
        <div style={{ display: 'flex', gap: '2px' }}>
          {/* Hide minimize on mobile - only Scanner/MediaPlayer get minimize on mobile */}
          {!isMobile && (
            <Tooltip text="Minimize">
              <CloseButton onClick={onMinimize}>_</CloseButton>
            </Tooltip>
          )}
          {canClose && (
            <Tooltip text="Close">
              <CloseButton onClick={onClose}>×</CloseButton>
            </Tooltip>
          )}
        </div>
      </StyledWindowHeader>

      <StyledWindowContent>
        <Logo src="/logo.png" alt="Record OS" />

        <Title>RECORD OS</Title>

        <StatusText>
          AUDIO VISUALIZATION TERMINAL
          <br />
          IDENTITY VERIFICATION: PENDING
        </StatusText>

        <SpotifyButton onClick={handleLogin}>
          <PixelIcon name="login" size={14} color="currentColor" /> CONNECT TO SPOTIFY
        </SpotifyButton>

        <Footer>
          // AUDIO PRIVILEGES / PREMIUM TIER ONLY //
          <br />
          // CHROME DESKTOP OPTIMAL / PHONES TOLERATED //
        </Footer>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LoginModal;
