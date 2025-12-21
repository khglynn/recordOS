/**
 * ============================================================================
 * LOGIN MODAL COMPONENT
 * ============================================================================
 *
 * Pre-auth login screen for connecting to Spotify.
 * After OAuth completes, this modal closes and LibraryScanner takes over.
 *
 * Includes ACCESS REQUEST OVERLAY - a green CRT overlay that appears on top
 * of the login window when user needs to request Spotify whitelist access.
 * The overlay shows form → pending → approved states while the dripping
 * logo remains dimly visible behind.
 *
 * Voice: Retro-corporate with alien computer undertones
 *
 * Updated: 2025-12-21 - Added access request overlay (was separate window)
 */

import { useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
} from 'react95';
import { loginWithSpotify } from '../utils/spotify';
import PixelIcon from './PixelIcon';
import Tooltip from './Tooltip';

// ============================================================================
// ANIMATIONS
// ============================================================================

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

const scanlineMove = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
`;

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
// ACCESS OVERLAY STYLED COMPONENTS
// ============================================================================

// The green CRT overlay that appears on top of login content
const AccessOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 12, 0, 0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  font-family: 'Consolas', 'Courier New', monospace;
  z-index: 10;
  overflow-y: auto;

  /* CRT scanline effect */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 1;
    animation: ${scanlineMove} 0.5s linear infinite;
  }
`;

const OverlayTitle = styled.h2`
  font-size: 12px;
  color: #00ff41;
  letter-spacing: 2px;
  margin: 0 0 20px;
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.4);
  text-align: center;
  position: relative;
  z-index: 2;
`;

const StatusBlock = styled.div`
  width: 100%;
  max-width: 280px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.2);
  padding: 12px 16px;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;
`;

const StatusLine = styled.div`
  font-size: 10px;
  color: ${props => props.$highlight ? '#00ff41' : 'rgba(0, 255, 65, 0.7)'};
  line-height: 1.8;

  .prompt {
    color: #00ff41;
    margin-right: 6px;
  }
`;

const FormSection = styled.div`
  width: 100%;
  max-width: 280px;
  position: relative;
  z-index: 2;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const StyledInput = styled(TextInput)`
  width: 100%;
  background: rgba(0, 0, 0, 0.5) !important;
  color: #00ff41 !important;
  border: 1px solid rgba(0, 255, 65, 0.3) !important;
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 13px !important;
  padding: 10px !important;

  &:focus {
    border-color: #00ff41 !important;
    box-shadow: 0 0 8px rgba(0, 255, 65, 0.3) !important;
  }

  &::placeholder {
    color: rgba(0, 255, 65, 0.3) !important;
  }
`;

const ActionButton = styled.button`
  width: 100%;
  max-width: 280px;
  padding: 12px;
  margin-top: 16px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 2px;
  cursor: pointer;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%);
  color: #00ff41;
  border: 1px solid #00ff41;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%);
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProceedButton = styled(ActionButton)`
  animation: ${pulse} 2s ease-in-out infinite;
`;

const EmailDisplay = styled.div`
  width: 100%;
  max-width: 280px;
  font-size: 13px;
  color: #00ff41;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.3);
  text-align: center;
  word-break: break-all;
  margin-bottom: 12px;
  position: relative;
  z-index: 2;
`;

const StatusDisplay = styled.div`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.7);
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 2;

  span {
    color: #ffaa00;
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 13px;
  background: #00ff41;
  margin-left: 4px;
  animation: ${blink} 1s step-end infinite;
`;

const IdleSection = styled.div`
  width: 100%;
  max-width: 280px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 255, 65, 0.2);
  position: relative;
  z-index: 2;
`;

const IdleHeader = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: 1px;
`;

const GameButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`;

const GameButton = styled.button`
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.3);
  color: rgba(0, 255, 65, 0.7);
  padding: 6px 12px;
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #00ff41;
    color: #00ff41;
    background: rgba(0, 255, 65, 0.1);
  }
`;

const FinePrint = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  text-align: center;
  margin-top: 16px;
  line-height: 1.6;
  position: relative;
  z-index: 2;
`;

const CancelLink = styled.button`
  background: none;
  border: none;
  color: rgba(0, 255, 65, 0.5);
  font-size: 9px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  margin-top: 16px;
  text-decoration: underline;
  position: relative;
  z-index: 2;

  &:hover {
    color: #00ff41;
  }
`;

const ErrorText = styled.div`
  font-size: 10px;
  color: #ff4141;
  padding: 8px;
  background: rgba(255, 65, 65, 0.1);
  border: 1px solid rgba(255, 65, 65, 0.3);
  margin-top: 8px;
  text-align: center;
  position: relative;
  z-index: 2;
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
  // Access overlay props (the green CRT overlay for Spotify whitelist requests)
  showAccessOverlay,      // boolean - show the overlay
  accessState,            // 'idle' | 'submitting' | 'pending' | 'approved' | 'error'
  accessEmail,            // string - user's email
  accessError,            // string - error message if any
  onAccessEmailChange,    // (email) => void
  onAccessSubmit,         // () => void - submit access request
  onAccessCancel,         // () => void - cancel and start over
  onAccessProceed,        // () => void - proceed to Spotify auth after approved
  onAccessDismiss,        // () => void - close overlay without connecting
  onOpenGame,             // (game) => void - open a game while waiting
  onShowAccessOverlay,    // () => void - show overlay when user needs to request access
  accessApproved,         // boolean - whether user is already approved
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
    // If user hasn't been approved for Spotify access, show the overlay first
    if (!accessApproved) {
      onShowAccessOverlay?.();
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

      <StyledWindowContent style={{ position: 'relative', padding: 0 }}>
        {/* Original login content - dimmed when overlay shows */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          opacity: showAccessOverlay ? 0.15 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          <Logo src="/logo.png" alt="Record OS" />

          <Title>RECORD OS</Title>

          <StatusText>
            AUDIO VISUALIZATION TERMINAL
            <br />
            IDENTITY VERIFICATION: PENDING
          </StatusText>

          <SpotifyButton onClick={handleLogin} disabled={showAccessOverlay}>
            <PixelIcon name="login" size={14} color="currentColor" /> CONNECT TO SPOTIFY
          </SpotifyButton>

          <Footer>
            // AUDIO PRIVILEGES / PREMIUM TIER ONLY //
            <br />
            // CHROME BOX OPTIMAL / PHONES TOLERATED //
          </Footer>
        </div>

        {/* ACCESS OVERLAY - Green CRT overlay for Spotify whitelist requests */}
        {showAccessOverlay && (
          <AccessOverlay>
            <OverlayTitle>ACCESS AUTHORIZATION</OverlayTitle>

            {/* IDLE / SUBMITTING / ERROR STATE - Show form */}
            {(accessState === 'idle' || accessState === 'submitting' || accessState === 'error') && (
              <>
                <StatusBlock>
                  <StatusLine><span className="prompt">//</span>CORP DIRECTIVE: MAX 25 USERS</StatusLine>
                  <StatusLine><span className="prompt">//</span>THE COMPANY PRIORITIZES THE COMPANY</StatusLine>
                  <StatusLine><span className="prompt">//</span>INDIE DEVELOPERS: EXPENDABLE</StatusLine>
                </StatusBlock>

                <FormSection>
                  <InputLabel>SPOTIFY EMAIL FOR FLESH REVIEW</InputLabel>
                  <StyledInput
                    type="email"
                    value={accessEmail || ''}
                    onChange={(e) => onAccessEmailChange?.(e.target.value)}
                    placeholder="user@example.com"
                    disabled={accessState === 'submitting'}
                  />
                  {accessError && <ErrorText>// ERROR: {accessError}</ErrorText>}
                </FormSection>

                <ActionButton
                  onClick={onAccessSubmit}
                  disabled={accessState === 'submitting'}
                >
                  <PixelIcon name="send" size={12} color="currentColor" />
                  {accessState === 'submitting' ? 'TRANSMITTING...' : 'REQUEST ACCESS'}
                </ActionButton>

                <FinePrint>// AUTHORIZATION REQUIRED FOR SPOTIFY ACCESS //</FinePrint>

                <CancelLink onClick={onAccessDismiss}>
                  // CONTINUE WITHOUT CONNECTING //
                </CancelLink>
              </>
            )}

            {/* PENDING STATE - Waiting for approval */}
            {accessState === 'pending' && (
              <>
                <StatusBlock>
                  <StatusLine $highlight><span className="prompt">//</span>CHEAP HUMAN LABOR PINGED</StatusLine>
                  <StatusLine><span className="prompt">//</span>EST TIME TO COMPLETE: {'<'}3 MIN</StatusLine>
                </StatusBlock>

                <EmailDisplay>{accessEmail}</EmailDisplay>
                <StatusDisplay>
                  STATUS: <span>PENDING</span>
                  <Cursor />
                </StatusDisplay>

                <IdleSection>
                  <IdleHeader>IDLE PROCESSES AVAILABLE</IdleHeader>
                  <GameButtons>
                    <GameButton onClick={() => { onOpenGame?.('minesweeper'); onAccessDismiss?.(); }}>
                      <PixelIcon name="flag" size={12} color="currentColor" />
                      MINESWEEPER
                    </GameButton>
                    <GameButton onClick={() => { onOpenGame?.('solitaire'); onAccessDismiss?.(); }}>
                      <PixelIcon name="cards" size={12} color="currentColor" />
                      SOLITAIRE
                    </GameButton>
                    <GameButton onClick={() => { onOpenGame?.('snake'); onAccessDismiss?.(); }}>
                      <PixelIcon name="gamepad" size={12} color="currentColor" />
                      SNAKE
                    </GameButton>
                  </GameButtons>
                </IdleSection>

                <CancelLink onClick={onAccessCancel}>
                  // WRONG EMAIL? RETRY //
                </CancelLink>
              </>
            )}

            {/* APPROVED STATE - Ready to proceed */}
            {accessState === 'approved' && (
              <>
                <StatusBlock>
                  <StatusLine $highlight><span className="prompt">//</span>AUTHORIZATION CONFIRMED</StatusLine>
                  <StatusLine $highlight><span className="prompt">//</span>USER CREDENTIALS VALIDATED</StatusLine>
                </StatusBlock>

                <ProceedButton onClick={onAccessProceed}>
                  <PixelIcon name="login" size={12} color="currentColor" />
                  PROCEED TO SPOTIFY LOGIN
                </ProceedButton>

                <FinePrint>
                  // WELCOME TO RECORD OS //
                  <br />
                  // BUILDING BASSIER WORLDS //
                </FinePrint>
              </>
            )}
          </AccessOverlay>
        )}
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default LoginModal;
