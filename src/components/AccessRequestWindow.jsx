/**
 * ============================================================================
 * ACCESS REQUEST WINDOW COMPONENT
 * ============================================================================
 *
 * Shown to new users before Spotify auth.
 * Spotify Development Mode requires manual whitelisting - this window:
 * 1. Collects user's Spotify email
 * 2. Sends notification to admin (Kevin) via Slack
 * 3. Polls for approval status
 * 4. Proceeds to Spotify auth when approved
 *
 * States: idle → submitting → pending → approved
 *
 * Created: 2025-12-15
 * Updated: 2025-12-15 - Refactored to use WindowFrame (OS metaphor)
 */

import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button, TextInput } from 'react95';
import WindowFrame from './WindowFrame';
import PixelIcon from './PixelIcon';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLL_INTERVAL = 5000; // Poll every 5 seconds
const LOCAL_STORAGE_KEY = 'access_request_email';

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

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StatusBlock = styled.div`
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  padding: 12px;
  margin-bottom: 16px;
  font-family: 'Consolas', 'Courier New', monospace;
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InputLabel = styled.label`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  margin-bottom: -4px;
`;

const StyledInput = styled(TextInput)`
  width: 100%;
  background: #0a0a0a !important;
  color: #00ff41 !important;
  border-color: #2a2a2a !important;
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 13px !important;

  &:focus {
    border-color: #00ff41 !important;
    box-shadow: 0 0 0 1px rgba(0, 255, 65, 0.3) !important;
  }

  &::placeholder {
    color: rgba(0, 255, 65, 0.3) !important;
  }
`;

const SubmitButton = styled(Button)`
  width: 100%;
  padding: 10px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 2px;
  margin-top: 4px;

  background: linear-gradient(180deg, #0a2a0a 0%, #0d3d0d 100%) !important;
  color: #00ff41 !important;
  border-color: #00ff41 !important;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #0d3d0d 0%, #1a4a1a 100%) !important;
    text-shadow: 0 0 6px rgba(0, 255, 65, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProceedButton = styled(SubmitButton)`
  background: linear-gradient(180deg, #0d3d0d 0%, #1a5a1a 100%) !important;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const WaitingBlock = styled.div`
  text-align: center;
  padding: 16px 0;
`;

const WaitingEmail = styled.div`
  font-size: 11px;
  color: #00ff41;
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 12px;
  padding: 10px;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  word-break: break-all;
`;

const WaitingStatus = styled.div`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 16px;

  span {
    color: #ffaa00;
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 12px;
  background: #00ff41;
  margin-left: 4px;
  animation: ${blink} 1s step-end infinite;
`;

const Note = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.6;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #1a1a1a;
`;

const ErrorText = styled.div`
  font-size: 10px;
  color: #ff4141;
  font-family: 'Consolas', 'Courier New', monospace;
  padding: 8px;
  background: rgba(255, 65, 65, 0.1);
  border: 1px solid rgba(255, 65, 65, 0.3);
`;

const CancelLink = styled.button`
  background: none;
  border: none;
  color: rgba(0, 255, 65, 0.5);
  font-size: 9px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  margin-top: 12px;
  text-decoration: underline;

  &:hover {
    color: #00ff41;
  }
`;

// Games section for pending state
const IdleProcesses = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #1a1a1a;
`;

const IdleHeader = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.5);
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 8px;
  letter-spacing: 1px;
`;

const GameLinks = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const GameLink = styled.button`
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  color: rgba(0, 255, 65, 0.7);
  padding: 6px 10px;
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    border-color: #00ff41;
    color: #00ff41;
    background: #0d1a0d;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function AccessRequestWindow({
  // Standard window props from window management system
  isActive,
  zIndex,
  position,
  onClose,
  onMinimize,
  onFocus,
  onDragStart,
  isMobile,
  // Access-specific props
  onApproved,
  onOpenGame, // For playing games while waiting
}) {
  const [state, setState] = useState('idle'); // idle, submitting, pending, approved, error
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Check for existing request on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      // Check status immediately
      checkStatus(savedEmail);
    }
  }, []);

  // Poll for approval when pending
  useEffect(() => {
    if (state !== 'pending') return;

    const interval = setInterval(() => {
      checkStatus(email);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [state, email]);

  // Check status from API
  const checkStatus = useCallback(async (emailToCheck) => {
    try {
      const response = await fetch(`/api/check-status?email=${encodeURIComponent(emailToCheck)}`);
      const data = await response.json();

      if (data.status === 'approved') {
        setState('approved');
      } else if (data.status === 'pending') {
        setState('pending');
      }
      // not_found means they need to submit the form
    } catch (err) {
      console.error('Status check failed:', err);
    }
  }, []);

  // Submit access request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email required');
      return;
    }

    setState('submitting');

    try {
      const response = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      // Save email locally
      localStorage.setItem(LOCAL_STORAGE_KEY, email.trim().toLowerCase());

      if (data.status === 'approved') {
        setState('approved');
      } else {
        setState('pending');
      }
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  // Cancel and start over
  const handleCancel = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setEmail('');
    setState('idle');
    setError('');
  };

  // Proceed to Spotify auth
  const handleProceed = () => {
    onApproved?.();
  };

  return (
    <WindowFrame
      title="//ACCESS AUTHORIZATION"
      icon="lock"
      isActive={isActive}
      zIndex={zIndex}
      position={position}
      width={340}
      isMobile={isMobile}
      showMinimize={!isMobile}
      onClose={onClose}
      onMinimize={onMinimize}
      onFocus={onFocus}
      onDragStart={onDragStart}
    >
      {/* IDLE STATE - Show form */}
      {(state === 'idle' || state === 'submitting' || state === 'error') && (
        <>
          <StatusBlock>
            <StatusLine>
              <span className="prompt">//</span>CORP DIRECTIVE: MAX 25 USERS
            </StatusLine>
            <StatusLine>
              <span className="prompt">//</span>INDIE DEVELOPERS: EXPENDABLE
            </StatusLine>
            <StatusLine>
              <span className="prompt">//</span>API ACCESS: SHAREHOLDERS ONLY
            </StatusLine>
          </StatusBlock>

          <Form onSubmit={handleSubmit}>
            <InputLabel>SPOTIFY EMAIL FOR FLESH REVIEW</InputLabel>
            <StyledInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={state === 'submitting'}
            />

            {error && <ErrorText>//ERROR: {error}</ErrorText>}

            <SubmitButton
              type="submit"
              disabled={state === 'submitting'}
            >
              <PixelIcon name="send" size={12} color="currentColor" />
              {' '}
              {state === 'submitting' ? 'TRANSMITTING...' : 'REQUEST ACCESS'}
            </SubmitButton>
          </Form>

          <Note>
            //THE COMPANY PRIORITIZES THE COMPANY
            <br />
            //CHEAP HUMAN LABOR PINGED. EST WAIT: {'<'}3 MIN
          </Note>

          {onClose && (
            <CancelLink onClick={onClose}>
              //CONTINUE WITHOUT CONNECTING
            </CancelLink>
          )}
        </>
      )}

      {/* PENDING STATE - Waiting for approval */}
      {state === 'pending' && (
        <>
          <StatusBlock>
            <StatusLine $highlight>
              <span className="prompt">//</span>ACCESS REQUEST TRANSMITTED
            </StatusLine>
            <StatusLine>
              <span className="prompt">//</span>AWAITING ADMINISTRATOR APPROVAL
            </StatusLine>
          </StatusBlock>

          <WaitingBlock>
            <WaitingEmail>{email}</WaitingEmail>
            <WaitingStatus>
              STATUS: <span>PENDING</span>
              <Cursor />
            </WaitingStatus>
          </WaitingBlock>

          {/* Games while waiting */}
          <IdleProcesses>
            <IdleHeader>//IDLE PROCESSES AVAILABLE</IdleHeader>
            <GameLinks>
              <GameLink onClick={() => { onOpenGame?.('minesweeper'); onClose?.(); }}>
                <PixelIcon name="flag" size={12} color="currentColor" />
                MINESWEEPER
              </GameLink>
              <GameLink onClick={() => { onOpenGame?.('solitaire'); onClose?.(); }}>
                <PixelIcon name="card" size={12} color="currentColor" />
                SOLITAIRE
              </GameLink>
              <GameLink onClick={() => { onOpenGame?.('snake'); onClose?.(); }}>
                <PixelIcon name="gamepad" size={12} color="currentColor" />
                SNAKE
              </GameLink>
            </GameLinks>
          </IdleProcesses>

          <Note>
            //WINDOW MAY BE MINIMIZED
            <br />
            //SYSTEM WILL AUTO-DETECT AUTHORIZATION
          </Note>

          <CancelLink onClick={handleCancel}>
            //USE DIFFERENT EMAIL
          </CancelLink>
        </>
      )}

      {/* APPROVED STATE - Ready to proceed */}
      {state === 'approved' && (
        <>
          <StatusBlock>
            <StatusLine $highlight>
              <span className="prompt">//</span>AUTHORIZATION CONFIRMED
            </StatusLine>
            <StatusLine $highlight>
              <span className="prompt">//</span>USER CREDENTIALS VALIDATED
            </StatusLine>
          </StatusBlock>

          <ProceedButton onClick={handleProceed}>
            <PixelIcon name="login" size={12} color="currentColor" />
            {' '}
            PROCEED TO SPOTIFY LOGIN
          </ProceedButton>

          <Note>
            //WELCOME TO RECORD OS
            <br />
            //BUILDING BETTER WORLDS
          </Note>
        </>
      )}
    </WindowFrame>
  );
}

export default AccessRequestWindow;
