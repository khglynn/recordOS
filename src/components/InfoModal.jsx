/**
 * ============================================================================
 * INFO MODAL COMPONENT
 * ============================================================================
 *
 * Windows 95-style info/about window.
 *
 * Contains:
 * - About Record OS
 * - Contact info
 * - Stripe donation button (link)
 */

import { useRef } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Fieldset,
  Anchor,
} from 'react95';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledWindow = styled(Window)`
  position: fixed;
  width: 340px;
  max-width: 95vw;
  z-index: 1000;

  /* Dark theme */
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 20px rgba(0, 255, 65, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.5) !important;

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
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderButton = styled(Button)`
  min-width: 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 10px;

  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
  color: #00ff41 !important;
  border-color: #4a4a4a !important;

  &:hover {
    background: linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%) !important;
  }
`;

const StyledWindowContent = styled(WindowContent)`
  background: #1a1a1a !important;
  padding: 16px !important;
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const Logo = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(0, 255, 65, 0.3));
`;

const TitleSection = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: 18px;
  color: #00ff41;
  margin: 0 0 4px;
  text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
`;

const Version = styled.span`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
`;

const Description = styled.p`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.8);
  line-height: 1.5;
  margin: 0 0 16px;
`;

const StyledFieldset = styled(Fieldset)`
  margin-bottom: 16px;
  background: #0d0d0d !important;
  border-color: #2a2a2a !important;

  legend {
    color: #00ff41 !important;
    font-size: 11px;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.8);

  &:last-child {
    margin-bottom: 0;
  }

  span:first-child {
    width: 20px;
    text-align: center;
  }
`;

const StyledLink = styled.a`
  color: #00ff41;
  text-decoration: underline;

  &:hover {
    color: #00cc33;
  }
`;

const DonateButton = styled(Button)`
  width: 100%;
  padding: 10px;
  font-size: 12px;
  margin-top: 8px;

  background: linear-gradient(180deg, #3a2a5a 0%, #2a1a4a 100%) !important;
  color: #b88aff !important;
  border-color: #5a4a7a !important;

  &:hover {
    background: linear-gradient(180deg, #4a3a6a 0%, #3a2a5a 100%) !important;
  }
`;

const Footer = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  text-align: center;
  margin-top: 16px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function InfoModal({
  isActive,
  onClose,
  onFocus,
  position,
  onDragStart,
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

  return (
    <StyledWindow
      style={{
        left: position?.x ?? 200,
        top: position?.y ?? 100,
      }}
      onMouseDown={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <span>ℹ️</span>
          <span>About Record OS</span>
        </HeaderTitle>
        <HeaderButton onClick={onClose}>×</HeaderButton>
      </StyledWindowHeader>

      <StyledWindowContent>
        <LogoSection>
          <Logo src="/logo.png" alt="Record OS" />
          <TitleSection>
            <Title>RECORD OS</Title>
            <Version>Version 3.0</Version>
          </TitleSection>
        </LogoSection>

        <Description>
          A nostalgic trip through your music collection.
          See your most-loved Spotify albums ranked by saved tracks,
          wrapped in Windows 95 aesthetics and 90s computer vibes.
        </Description>

        <StyledFieldset label="Contact">
          <ContactItem>
            <span>🐦</span>
            <StyledLink
              href="https://twitter.com/kevinhg"
              target="_blank"
              rel="noopener noreferrer"
            >
              @kevinhg
            </StyledLink>
          </ContactItem>
          <ContactItem>
            <span>🌐</span>
            <StyledLink
              href="https://kevin.fyi"
              target="_blank"
              rel="noopener noreferrer"
            >
              kevin.fyi
            </StyledLink>
          </ContactItem>
          <ContactItem>
            <span>💻</span>
            <StyledLink
              href="https://github.com/khglynn"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/khglynn
            </StyledLink>
          </ContactItem>
        </StyledFieldset>

        <StyledFieldset label="Support">
          <Description style={{ margin: 0 }}>
            If you enjoy Record OS, consider buying me a coffee!
          </Description>
          <DonateButton
            as="a"
            href="https://buy.stripe.com/test_placeholder"
            target="_blank"
            rel="noopener noreferrer"
          >
            ☕ Buy Me a Coffee
          </DonateButton>
        </StyledFieldset>

        <Footer>
          Built with React, React95, and Spotify API
          <br />
          © 2025 Kevin Glynn
        </Footer>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default InfoModal;
