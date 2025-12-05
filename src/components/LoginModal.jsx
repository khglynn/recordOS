/**
 * ============================================================================
 * LOGIN MODAL COMPONENT
 * ============================================================================
 *
 * Windows 95-style modal for Spotify OAuth login.
 *
 * Shows on initial load (unless already logged in).
 * Contains:
 * - Record OS logo
 * - Login with Spotify button
 * - Threshold selector
 * - Brief explanation text
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;

  /* Slight scanline effect */
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
  width: 360px;
  max-width: 90vw;
  animation: windowAppear 0.2s ease-out;

  /* Dark theme overrides */
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
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const Logo = styled.img`
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 16px;
  filter: drop-shadow(0 0 20px rgba(0, 255, 65, 0.3));
`;

const Title = styled.h1`
  font-size: 24px;
  color: #00ff41;
  margin: 0 0 8px;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
  font-weight: bold;
  letter-spacing: 2px;
`;

const Subtitle = styled.p`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.7);
  margin: 0 0 20px;
  text-align: center;
  line-height: 1.5;
`;

const SpotifyButton = styled(Button)`
  width: 100%;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  /* Spotify green styling */
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

const SpotifyIcon = styled.span`
  font-size: 18px;
`;

const StyledFieldset = styled(Fieldset)`
  width: 100%;
  margin-top: 16px;
  background: #0d0d0d !important;
  border-color: #2a2a2a !important;

  legend {
    color: #00ff41 !important;
    font-size: 11px;
  }
`;

const ThresholdRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ThresholdLabel = styled.label`
  color: rgba(0, 255, 65, 0.8);
  font-size: 11px;
  flex: 1;
`;

const StyledSelect = styled(Select)`
  width: 80px;

  /* Dark theme */
  background: #0d0d0d !important;
  color: #00ff41 !important;
  border-color: #2a2a2a !important;
`;

const InfoText = styled.p`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  margin: 16px 0 0;
  text-align: center;
  line-height: 1.4;
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

function LoginModal({ onClose, threshold, onThresholdChange, isOpen }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithSpotify();
      // The page will redirect, so loading state stays
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const thresholdOptions = THRESHOLD_OPTIONS.map(opt => ({
    value: opt,
    label: opt === 'all' ? 'ALL' : `${opt}+`,
  }));

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <StyledWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <HeaderTitle>
            <span>🔐</span>
            <span>Welcome to Record OS</span>
          </HeaderTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </StyledWindowHeader>

        <StyledWindowContent>
          <Logo src="/logo.png" alt="Record OS" />

          <Title>RECORD OS</Title>

          <Subtitle>
            Your music collection, visualized.
            <br />
            See your most-loved Spotify albums ranked by saved tracks.
          </Subtitle>

          <SpotifyButton
            onClick={handleLogin}
            disabled={isLoading}
          >
            <SpotifyIcon>🎵</SpotifyIcon>
            {isLoading ? 'Connecting...' : 'Connect with Spotify'}
          </SpotifyButton>

          <StyledFieldset label="Settings">
            <ThresholdRow>
              <ThresholdLabel>
                Minimum liked tracks per album:
              </ThresholdLabel>
              <StyledSelect
                value={threshold}
                options={thresholdOptions}
                onChange={(e) => onThresholdChange(e.value)}
                width={80}
              />
            </ThresholdRow>
          </StyledFieldset>

          <InfoText>
            Requires Spotify Premium for full playback.
            <br />
            Your data stays in your browser.
          </InfoText>
        </StyledWindowContent>
      </StyledWindow>
    </Overlay>
  );
}

export default LoginModal;
