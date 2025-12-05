/**
 * ============================================================================
 * LOGIN MODAL COMPONENT
 * ============================================================================
 *
 * Two-step authentication flow:
 * 1. Connect to Spotify (OAuth)
 * 2. Configure display threshold (post-auth)
 *
 * Voice: Retro-corporate with alien computer undertones
 */

import { useState } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Select,
  Fieldset,
  ProgressBar,
} from 'react95';
import { THRESHOLD_OPTIONS, DEFAULT_THRESHOLD } from '../utils/constants';
import { loginWithSpotify } from '../utils/spotify';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;

  /* Scanline effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.1) 0px,
      rgba(0, 0, 0, 0.1) 1px,
      transparent 1px,
      transparent 3px
    );
    pointer-events: none;
  }
`;

const StyledWindow = styled(Window)`
  width: 420px;
  max-width: 90vw;
  animation: windowAppear 0.2s ease-out;

  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 30px rgba(0, 255, 65, 0.15),
    0 10px 40px rgba(0, 0, 0, 0.6) !important;

  @keyframes windowAppear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const StyledWindowHeader = styled(WindowHeader)`
  background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
  color: #00ff41 !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

  .highlight {
    color: #00ff41;
    font-weight: bold;
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

const ExecuteButton = styled(Button)`
  width: 100%;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  margin-top: 16px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
  }

  &:disabled {
    cursor: wait;
    /* Keep text visible when loading */
    color: #00ff41 !important;
    background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  }
`;

const LoadingBar = styled.div`
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  text-align: center;
`;

const LoadingText = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  color: #00ff41;
  margin-bottom: 12px;
  letter-spacing: 1px;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 20px;
  background: #1a1a1a;
  border: 1px solid #00ff41;
  position: relative;
  overflow: hidden;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #00ff41 0%, #00cc33 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
`;

const ProgressPercent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: #000;
  font-weight: bold;
  text-shadow: 0 0 2px rgba(0, 255, 65, 0.8);
`;

const StyledFieldset = styled(Fieldset)`
  width: 100%;
  margin-top: 16px;
  background: #0d0d0d !important;
  border-color: #2a2a2a !important;
  padding: 16px;

  legend {
    color: #00ff41 !important;
    font-size: 11px;
    font-family: 'Consolas', 'Courier New', monospace;
    letter-spacing: 1px;
  }
`;

const ThresholdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ThresholdLabel = styled.label`
  color: rgba(0, 255, 65, 0.85);
  font-size: 13px;
  flex: 1;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const StyledSelect = styled(Select)`
  width: 90px;

  background: #0d0d0d !important;
  color: #00ff41 !important;
  border-color: #2a2a2a !important;
`;

const ThresholdExplainer = styled.p`
  font-size: 12px;
  color: rgba(0, 255, 65, 0.6);
  margin: 12px 0 0;
  line-height: 1.6;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const Footer = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.4);
  margin-top: 20px;
  text-align: center;
  font-family: 'Consolas', 'Courier New', monospace;
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

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  margin-bottom: 16px;
`;

const UserAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid #00ff41;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 12px;
  color: #00ff41;
  font-weight: bold;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const UserStatus = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function LoginModal({
  isOpen,
  onClose,
  threshold,
  onThresholdChange,
  onExecute,
  user,
  isPostAuth,
  isLoading,
  loadingProgress,
  canClose,
}) {
  const [localThreshold, setLocalThreshold] = useState(threshold);

  const handleLogin = async () => {
    try {
      await loginWithSpotify();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleExecute = () => {
    onThresholdChange(localThreshold);
    onExecute?.();
  };

  const thresholdOptions = THRESHOLD_OPTIONS.map(opt => ({
    value: opt,
    label: opt === 'all' ? 'ALL' : `${opt}+`,
  }));

  if (!isOpen) return null;

  // STEP 2: Post-auth configuration
  if (isPostAuth) {
    return (
      <Overlay>
        <StyledWindow>
          <StyledWindowHeader>
            <HeaderTitle>
              <span>⚙</span>
              <span>SYSTEM CONFIGURATION</span>
            </HeaderTitle>
          </StyledWindowHeader>

          <StyledWindowContent>
            {user && (
              <UserInfo>
                {user.images?.[0]?.url && (
                  <UserAvatar src={user.images[0].url} alt={user.display_name} />
                )}
                <UserDetails>
                  <UserName>{user.display_name}</UserName>
                  <UserStatus>CONNECTION ESTABLISHED</UserStatus>
                </UserDetails>
              </UserInfo>
            )}

            <SystemMessage>
              <span className="prompt">&gt;</span>
              Audio library access granted.
              <br />
              <span className="prompt">&gt;</span>
              Configure <span className="highlight">display threshold</span> to filter album results.
              <br />
              <span className="prompt">&gt;</span>
              Only albums with <span className="highlight">N+ saved tracks</span> will be rendered.
            </SystemMessage>

            <StyledFieldset label="THRESHOLD PARAMETER">
              <ThresholdRow>
                <ThresholdLabel>
                  Minimum saved tracks per album:
                </ThresholdLabel>
                <StyledSelect
                  value={localThreshold}
                  options={thresholdOptions}
                  onChange={(e) => setLocalThreshold(e.value)}
                  width={90}
                />
              </ThresholdRow>
              <ThresholdExplainer>
                Higher values = fewer albums displayed.
                <br />
                Recommended: 7+ for curated collection view.
              </ThresholdExplainer>
            </StyledFieldset>

            {isLoading ? (
              <LoadingBar>
                <LoadingText>
                  SCANNING LIBRARY... {loadingProgress?.loaded || 0} / {loadingProgress?.total || '?'} tracks
                </LoadingText>
                <ProgressBarContainer>
                  <ProgressBarFill
                    style={{
                      width: loadingProgress?.total
                        ? `${(loadingProgress.loaded / loadingProgress.total) * 100}%`
                        : '0%'
                    }}
                  />
                  {loadingProgress?.total > 0 && (
                    <ProgressPercent>
                      {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%
                    </ProgressPercent>
                  )}
                </ProgressBarContainer>
              </LoadingBar>
            ) : (
              <ExecuteButton onClick={handleExecute}>
                ▶ EXECUTE
              </ExecuteButton>
            )}

            <Footer>
              RECORD OS v3.0 // AUDIO VISUALIZATION SYSTEM
            </Footer>
          </StyledWindowContent>
        </StyledWindow>
      </Overlay>
    );
  }

  // STEP 1: Initial connection
  return (
    <Overlay onClick={canClose ? onClose : undefined}>
      <StyledWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <HeaderTitle>
            <span>◉</span>
            <span>RECORD OS // INITIALIZE</span>
          </HeaderTitle>
          {canClose && <CloseButton onClick={onClose}>×</CloseButton>}
        </StyledWindowHeader>

        <StyledWindowContent>
          <Logo src="/logo.png" alt="Record OS" />

          <Title>RECORD OS</Title>

          <StatusText>
            AUDIO VISUALIZATION TERMINAL
            <br />
            SYSTEM STATUS: AWAITING CONNECTION
          </StatusText>

          <SystemMessage>
            <span className="prompt">&gt;</span>
            This system displays your most-loved albums
            <br />
            <span className="prompt">&gt;</span>
            ranked by saved track count.
            <br />
            <span className="prompt">&gt;</span>
            Establish connection to begin...
          </SystemMessage>

          <SpotifyButton onClick={handleLogin}>
            ◉ CONNECT TO SPOTIFY
          </SpotifyButton>

          <Footer>
            Requires Spotify Premium for audio playback.
            <br />
            All data processed locally.
          </Footer>
        </StyledWindowContent>
      </StyledWindow>
    </Overlay>
  );
}

export default LoginModal;
