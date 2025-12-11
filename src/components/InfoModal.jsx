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
import PixelIcon from './PixelIcon';
import Tooltip from './Tooltip';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

// Standard modal width for mobile compatibility
const MODAL_WIDTH = 340;

const StyledWindow = styled(Window)`
  position: fixed;
  width: ${MODAL_WIDTH}px;
  max-width: 95vw;
  max-height: 85vh;
  z-index: ${props => props.$zIndex || 1000};

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

  /* Mobile: centered, hug content */
  ${props => props.$isMobile && `
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    max-height: calc(100vh - 44px - 16px) !important;
    left: 8px !important;
    top: 50% !important;
    transform: translateY(-50%);
    border-radius: 0;
  `}
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
  padding: 12px !important;
  overflow-y: auto;
  max-height: calc(85vh - 30px);

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 12px;
  }
  &::-webkit-scrollbar-track {
    background: #0d0d0d;
  }
  &::-webkit-scrollbar-thumb {
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #3a3a3a;
  }
`;

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const Logo = styled.img`
  width: 48px;
  height: 48px;
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
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 2px;
`;

const Version = styled.span`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  font-family: 'Consolas', 'Courier New', monospace;
`;

const SystemMessage = styled.div`
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  padding: 10px;
  margin-bottom: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.85);
  line-height: 1.6;

  .prompt {
    color: #00ff41;
    margin-right: 6px;
  }
`;

const Description = styled.p`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.8);
  line-height: 1.5;
  margin: 0 0 16px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const StyledFieldset = styled(Fieldset)`
  margin-bottom: 12px;
  background: #0d0d0d !important;
  border-color: #2a2a2a !important;
  padding: 10px !important;

  legend {
    color: #00ff41 !important;
    font-size: 10px;
    padding: 0 4px;
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.8);
  font-family: 'Consolas', 'Courier New', monospace;

  &:last-child {
    margin-bottom: 0;
  }

  span:first-child {
    width: 16px;
    text-align: center;
  }
`;

const StyledLink = styled.a`
  color: #00ff41;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    color: #00cc33;
  }
`;

const DonateButton = styled(Button)`
  width: 100%;
  padding: 10px;
  font-size: 11px;
  margin-top: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }
`;

const CreditsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const CreditItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.7);
  font-family: 'Consolas', 'Courier New', monospace;

  .lib-name {
    color: #00ff41;
  }

  .lib-license {
    color: rgba(0, 255, 65, 0.4);
    font-size: 9px;
  }
`;

const Footer = styled.div`
  font-size: 8px;
  color: rgba(0, 255, 65, 0.4);
  text-align: center;
  margin-top: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

function InfoModal({
  isActive,
  zIndex,
  onClose,
  onFocus,
  position,
  onDragStart,
  isMobile,
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
      data-window
      $zIndex={zIndex}
      $isMobile={isMobile}
      style={isMobile ? {} : {
        left: position?.x ?? 200,
        top: position?.y ?? 100,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <StyledWindowHeader ref={headerRef} $active={isActive}>
        <HeaderTitle>
          <PixelIcon name="info" size={14} />
          <span>About Record OS</span>
        </HeaderTitle>
        <Tooltip text="Close">
          <HeaderButton onClick={onClose}>×</HeaderButton>
        </Tooltip>
      </StyledWindowHeader>

      <StyledWindowContent>
        <LogoSection>
          <Logo src="/logo.png" alt="Record OS" />
          <TitleSection>
            <Title>RECORD OS</Title>
            <Version>BUILD 3.0.48 //STABLE</Version>
          </TitleSection>
        </LogoSection>

        <SystemMessage>
          <span className="prompt">//</span>
          AUDIO VISUALIZATION SYSTEM
          <br />
          <span className="prompt">//</span>
          ALBUMS RANKED BY SAVED TRACKS
          <br />
          <span className="prompt">//</span>
          ALL PROCESSING LOCAL
          <br />
          <span className="prompt">//</span>
          OPTIMIZED FOR CHROME
        </SystemMessage>

        <StyledFieldset label="SYSTEM ADMINISTRATOR">
          <ContactItem>
            <span>◉</span>
            <StyledLink
              href="mailto:hello@kevinhg.com"
            >
              hello@kevinhg.com
            </StyledLink>
          </ContactItem>
          <ContactItem>
            <span>◉</span>
            <StyledLink
              href="https://kevinhg.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              kevinhg.com
            </StyledLink>
          </ContactItem>
          <ContactItem>
            <span>◉</span>
            <StyledLink
              href="https://github.com/khglynn/recordOS"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/khglynn/recordOS
            </StyledLink>
          </ContactItem>
        </StyledFieldset>

        <StyledFieldset label="LIBRARIES & CREDITS">
          <CreditsList>
            <CreditItem>
              <StyledLink href="https://github.com/react95-org/react95" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">React95</span>
              </StyledLink>
              <span className="lib-license">MIT</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://pixelarticons.com" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Pixelarticons</span>
              </StyledLink>
              <span className="lib-license">MIT</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://github.com/nicholasyager/minesweeper" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Minesweeper</span>
              </StyledLink>
              <span className="lib-license">MIT</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://github.com/Two9A/solitaire-js" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Solitaire</span>
              </StyledLink>
              <span className="lib-license">Unlicense</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://github.com/cribbles/snake" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Snake</span>
              </StyledLink>
              <span className="lib-license">MIT</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://github.com/jberg/butterchurn" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Butterchurn</span>
              </StyledLink>
              <span className="lib-license">MIT (planned)</span>
            </CreditItem>
            <CreditItem>
              <StyledLink href="https://elements.envato.com" target="_blank" rel="noopener noreferrer">
                <span className="lib-name">Pre-loaded Music</span>
              </StyledLink>
              <span className="lib-license">Envato Elements</span>
            </CreditItem>
          </CreditsList>
        </StyledFieldset>

        <StyledFieldset label="SYSTEM MAINTENANCE">
          <Description style={{ margin: '0 0 8px 0', fontSize: '9px', color: 'rgba(0, 255, 65, 0.6)' }}>
            //OPERATIONAL COSTS SUBSIDIZED BY USERS
          </Description>
          <DonateButton
            as="a"
            href="https://buymeacoffee.com/kevinhg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <PixelIcon name="dollar" size={12} /> FUND OPERATIONS
          </DonateButton>
        </StyledFieldset>

        <Footer>
          // WEYLAND-YUTANI CORP // BUILDING BETTER WORLDS //
          <br />
          // © 2025 // ALL RIGHTS RESERVED //
        </Footer>
      </StyledWindowContent>
    </StyledWindow>
  );
}

export default InfoModal;
