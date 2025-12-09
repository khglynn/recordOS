/**
 * ============================================================================
 * LOADED MODAL COMPONENT
 * ============================================================================
 *
 * Shown after library scanning completes. Displays stats and allows user
 * to close other windows and explore their grid.
 *
 * Voice: Deadpan corporate Windows 95 with hacky Alien computer undertones.
 */

import styled, { keyframes } from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
} from 'react95';
import PixelIcon from './PixelIcon';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const scanLine = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 0 4px; }
`;

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
  z-index: 9999;

  /* Scanline overlay */
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
    animation: ${scanLine} 0.2s linear infinite;
  }
`;

const StyledWindow = styled(Window)`
  min-width: 380px;
  max-width: 420px;
  position: relative;
  z-index: 10000;

  /* Dark theme */
  background: #1a1a1a !important;
  box-shadow:
    inset 1px 1px 0 #3a3a3a,
    inset -1px -1px 0 #0a0a0a,
    0 0 40px rgba(0, 255, 65, 0.2),
    0 8px 32px rgba(0, 0, 0, 0.5) !important;

  animation: windowAppear 0.3s ease-out;

  @keyframes windowAppear {
    from { opacity: 0; transform: scale(0.9) translateY(20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

const StyledWindowHeader = styled(WindowHeader)`
  background: linear-gradient(90deg, #0a2a0a 0%, #0d3d0d 50%, #0a2a0a 100%) !important;
  color: #00ff41 !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const StyledWindowContent = styled(WindowContent)`
  background: #0d0d0d !important;
  padding: 20px !important;
`;

const StatusMessage = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: #00ff41;
  margin-bottom: 20px;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.4);
  letter-spacing: 0.5px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
`;

const StatBox = styled.div`
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  padding: 12px;
  text-align: center;
`;

const StatValue = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 24px;
  font-weight: bold;
  color: #00ff41;
  text-shadow: 0 0 12px rgba(0, 255, 65, 0.5);
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 255, 65, 0.3) 20%,
    rgba(0, 255, 65, 0.3) 80%,
    transparent 100%
  );
  margin: 20px 0;
`;

const ActionText = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  color: rgba(0, 255, 65, 0.6);
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.5;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const ActionButton = styled(Button)`
  padding: 8px 20px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  text-transform: uppercase;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }
`;

const SecondaryButton = styled(Button)`
  padding: 8px 16px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 0.5px;

  background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%) !important;
  color: rgba(0, 255, 65, 0.7) !important;
  border-color: #3a3a3a !important;

  &:hover {
    background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%) !important;
    color: #00ff41 !important;
  }
`;

const SystemNote = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 9px;
  color: rgba(0, 255, 65, 0.35);
  text-align: center;
  margin-top: 16px;
  letter-spacing: 0.5px;
`;

const DecadePickerSection = styled.div`
  margin-top: 8px;
`;

const DecadePickerLabel = styled.div`
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 10px;
  color: rgba(0, 255, 65, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
  text-align: center;
`;

const DecadeButtonGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

const DecadeButton = styled.button`
  padding: 8px 14px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.5px;
  border: 1px solid ${props => props.$isAll ? '#00ff41' : '#3a3a3a'};
  background: ${props => props.$isAll
    ? 'linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%)'
    : 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)'};
  color: ${props => props.$isAll ? '#00ff41' : 'rgba(0, 255, 65, 0.7)'};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &:hover {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%);
    border-color: #00ff41;
    color: #00ff41;
  }
`;

const DecadeButtonCount = styled.span`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
`;

// ============================================================================
// COMPONENT
// ============================================================================

function LoadedModal({
  isOpen,
  savedTracksCount,
  albumCount,
  topDecade,
  onExplore,
  onKeepWindows,
  // New decade picker props
  decadeStatus = {},
  albumsByDecade = {},
  decadeOrder = [],
  decadeLabels = {},
  onDecadeSelect,
}) {
  if (!isOpen) return null;

  // Get available decades (those with albums)
  const availableDecades = decadeOrder.filter(d => albumsByDecade[d]?.length > 0);

  return (
    <Overlay>
      <StyledWindow>
        <StyledWindowHeader>
          <HeaderTitle>
            <PixelIcon name="check" size={14} />
            <span>Scan Complete</span>
          </HeaderTitle>
        </StyledWindowHeader>

        <StyledWindowContent>
          <StatusMessage>
            Library analysis complete // System ready
          </StatusMessage>

          <StatsGrid>
            <StatBox>
              <StatValue>{savedTracksCount.toLocaleString()}</StatValue>
              <StatLabel>Songs Saved</StatLabel>
            </StatBox>
            <StatBox>
              <StatValue>{albumCount.toLocaleString()}</StatValue>
              <StatLabel>Across Albums</StatLabel>
            </StatBox>
          </StatsGrid>

          {topDecade && (
            <StatBox style={{ marginBottom: '20px' }}>
              <StatValue>{topDecade}</StatValue>
              <StatLabel>Dominant Era Detected</StatLabel>
            </StatBox>
          )}

          <Divider />

          {/* Decade picker */}
          {availableDecades.length > 0 && (
            <DecadePickerSection>
              <DecadePickerLabel>Start Exploring</DecadePickerLabel>
              <DecadeButtonGrid>
                {/* ALL button first */}
                <DecadeButton
                  $isAll
                  onClick={() => {
                    onDecadeSelect?.('all');
                    onExplore?.();
                  }}
                >
                  ALL
                  <DecadeButtonCount>{albumCount} albums</DecadeButtonCount>
                </DecadeButton>

                {/* Individual decades */}
                {availableDecades.map(decade => (
                  <DecadeButton
                    key={decade}
                    onClick={() => {
                      onDecadeSelect?.(decade);
                      onExplore?.();
                    }}
                  >
                    {decadeLabels[decade] || decade}
                    <DecadeButtonCount>{albumsByDecade[decade]?.length || 0}</DecadeButtonCount>
                  </DecadeButton>
                ))}
              </DecadeButtonGrid>
            </DecadePickerSection>
          )}

          {/* Fallback if no decades (shouldn't happen) */}
          {availableDecades.length === 0 && (
            <>
              <ActionText>
                Your collection has been mapped to the grid<br />
                Select an album to access track data
              </ActionText>

              <ButtonGroup>
                <ActionButton onClick={onExplore}>
                  <PixelIcon name="monitor" size={12} style={{ marginRight: '6px' }} />
                  Minimize & Explore
                </ActionButton>
              </ButtonGroup>
            </>
          )}

          <SystemNote>
            // RECORD_OS v3.0 // WEYLAND-YUTANI AUDIO DIVISION //
          </SystemNote>
        </StyledWindowContent>
      </StyledWindow>
    </Overlay>
  );
}

export default LoadedModal;
