/**
 * ============================================================================
 * ERROR BOUNDARY COMPONENT
 * ============================================================================
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Also reports errors to Sentry if configured.
 *
 * Win95-styled "Blue Screen of Death" error display.
 */

import { Component } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
import { captureException } from '../utils/sentry';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const ErrorContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0000aa;
  color: #ffffff;
  font-family: 'Consolas', 'Courier New', monospace;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  z-index: 99999;
`;

const Title = styled.div`
  background: #aaaaaa;
  color: #0000aa;
  padding: 4px 12px;
  font-weight: bold;
  margin-bottom: 24px;
  font-size: 14px;
`;

const Message = styled.div`
  font-size: 14px;
  line-height: 1.8;
  max-width: 600px;
  margin-bottom: 24px;
`;

const ErrorDetails = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  font-size: 11px;
  max-width: 600px;
  max-height: 150px;
  overflow: auto;
  text-align: left;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const StyledButton = styled(Button)`
  background: #c0c0c0 !important;
  color: #000000 !important;
  font-family: 'Consolas', 'Courier New', monospace;
  padding: 8px 24px;
`;

// ============================================================================
// COMPONENT
// ============================================================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
    });

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Clear localStorage and reload
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <Title>RECORD OS</Title>

          <Message>
            A fatal exception has occurred at {new Date().toLocaleTimeString()}
            <br /><br />
            The current application will be terminated
            <br /><br />
            * Press RELOAD to restart the application.
            <br />
            * Press RESET to clear all data and restart.
          </Message>

          {this.state.error && (
            <ErrorDetails>
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack?.slice(0, 500)}
            </ErrorDetails>
          )}

          <ButtonRow>
            <StyledButton onClick={this.handleReload}>
              RELOAD
            </StyledButton>
            <StyledButton onClick={this.handleReset}>
              RESET
            </StyledButton>
          </ButtonRow>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
