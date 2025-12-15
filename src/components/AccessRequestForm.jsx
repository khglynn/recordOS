/**
 * ============================================================================
 * ACCESS REQUEST FORM COMPONENT
 * ============================================================================
 *
 * Shown to new users before Spotify auth.
 * Spotify Development Mode requires manual whitelisting - this form:
 * 1. Collects user's Spotify email
 * 2. Sends notification to admin (Kevin) via Slack
 * 3. Polls for approval status
 * 4. Proceeds to Spotify auth when approved
 *
 * States: idle → submitting → pending → approved
 *
 * Created: 2025-12-15
 */

import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button, TextInput } from 'react95';

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

const scanline = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 10000;

  /* CRT scanline effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: rgba(0, 255, 65, 0.03);
    animation: ${scanline} 8s linear infinite;
    pointer-events: none;
  }
`;

const Terminal = styled.div`
  max-width: 420px;
  width: 100%;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  padding: 30px;

  @media (max-width: 480px) {
    padding: 20px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #1a1a1a;
`;

const Logo = styled.img`
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 8px rgba(0, 255, 65, 0.3));
`;

const TitleBlock = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-size: 16px;
  color: #00ff41;
  margin: 0 0 4px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 3px;
  text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
`;

const Subtitle = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
`;

const StatusBlock = styled.div`
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
  padding: 16px;
  margin-bottom: 20px;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const StatusLine = styled.div`
  font-size: 11px;
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
  gap: 16px;
`;

const InputLabel = styled.label`
  font-size: 10px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 1px;
  margin-bottom: -8px;
`;

const StyledInput = styled(TextInput)`
  width: 100%;
  background: #0a0a0a !important;
  color: #00ff41 !important;
  border-color: #2a2a2a !important;
  font-family: 'Consolas', 'Courier New', monospace !important;
  font-size: 14px !important;

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
  padding: 12px;
  font-size: 12px;
  font-family: 'Consolas', 'Courier New', monospace;
  letter-spacing: 2px;
  margin-top: 8px;

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
  padding: 20px 0;
`;

const WaitingEmail = styled.div`
  font-size: 12px;
  color: #00ff41;
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 16px;
  padding: 12px;
  background: #0a0a0a;
  border: 1px solid #1a1a1a;
`;

const WaitingStatus = styled.div`
  font-size: 11px;
  color: rgba(0, 255, 65, 0.6);
  font-family: 'Consolas', 'Courier New', monospace;
  margin-bottom: 20px;

  span {
    color: #ffaa00;
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 8px;
  height: 14px;
  background: #00ff41;
  margin-left: 4px;
  animation: ${blink} 1s step-end infinite;
`;

const Note = styled.div`
  font-size: 9px;
  color: rgba(0, 255, 65, 0.4);
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.6;
  margin-top: 16px;
  padding-top: 16px;
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
  font-size: 10px;
  font-family: 'Consolas', 'Courier New', monospace;
  cursor: pointer;
  margin-top: 16px;
  text-decoration: underline;

  &:hover {
    color: #00ff41;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

function AccessRequestForm({ onApproved }) {
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
    <Container>
      <Terminal>
        <Header>
          <Logo src="/logo.png" alt="recordOS" />
          <TitleBlock>
            <Title>RECORD OS</Title>
            <Subtitle>AUTHENTICATION SUBSYSTEM</Subtitle>
          </TitleBlock>
        </Header>

        {/* IDLE STATE - Show form */}
        {(state === 'idle' || state === 'submitting' || state === 'error') && (
          <>
            <StatusBlock>
              <StatusLine>
                <span className="prompt">//</span>ACCESS RESTRICTED
              </StatusLine>
              <StatusLine>
                <span className="prompt">//</span>SYSTEM REQUIRES AUTHORIZATION
              </StatusLine>
            </StatusBlock>

            <Form onSubmit={handleSubmit}>
              <InputLabel>SPOTIFY ACCOUNT EMAIL</InputLabel>
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
                {state === 'submitting' ? 'TRANSMITTING...' : 'REQUEST ACCESS'}
              </SubmitButton>
            </Form>

            <Note>
              //YOUR EMAIL WILL BE TRANSMITTED TO SYSTEM ADMINISTRATOR
              <br />
              //MANUAL VERIFICATION REQUIRED
            </Note>
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

            <Note>
              //DO NOT CLOSE THIS WINDOW
              <br />
              //SYSTEM WILL AUTO-DETECT AUTHORIZATION
              <br />
              //POLLING INTERVAL: 5 SECONDS
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
              PROCEED TO SPOTIFY LOGIN
            </ProceedButton>

            <Note>
              //WELCOME TO RECORD OS
              <br />
              //BUILDING BETTER WORLDS
            </Note>
          </>
        )}
      </Terminal>
    </Container>
  );
}

export default AccessRequestForm;
