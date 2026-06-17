// motion-ok: error boundary — failure state, no animation
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * ErrorBoundary — slot-scoped recovery surface for runtime render failures.
 * @category Feedback
 * @tier utility
 * @doc-exempt: runtime safety infra, not an LLM-facing layout primitive
 */

import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Button } from './button';
import { Stack } from './stack';
import { Surface } from './surface';

interface ErrorBoundaryProps {
  children: ReactNode;
  slotLabel?: string;
  minHeight?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  retryNonce: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    retryNonce: 0,
  };

  static getDerivedStateFromError(error: Error): Pick<ErrorBoundaryState, 'error'> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary] ${this.props.slotLabel ?? 'slot'} render failed`,
      error,
      errorInfo.componentStack,
    );
  }

  private handleRetry = () => {
    this.setState((state) => ({
      error: null,
      retryNonce: state.retryNonce + 1,
    }));
  };

  render() {
    const { children, slotLabel = 'section', minHeight = '240px' } = this.props;
    const { error, retryNonce } = this.state;

    if (!error) {
      return <Fragment key={retryNonce}>{children}</Fragment>;
    }

    return (
      <Surface
        padding="component"
        role="alert"
        aria-live="polite"
        style={{
          minHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack gap="gap" style={{ width: '100%', maxWidth: '32rem' }}>
          <span
            className="text-secondary"
            style={{
              ...hds.typeStyles.caption,
            }}
          >
            {slotLabel} unavailable
          </span>
          <h2
            className="text-primary"
            style={{
              ...hds.typeStyles.heading3,
              margin: 0,
            }}
          >
            This section failed to render.
          </h2>
          <p
            className="text-secondary"
            style={{
              ...hds.typeStyles.body,
              margin: 0,
            }}
          >
            {error.message || 'A runtime error interrupted this slot.'}
          </p>
          <div>
            <Button variant="secondary" onClick={this.handleRetry} aria-label={`Retry ${slotLabel}`}>
              Retry section
            </Button>
          </div>
        </Stack>
      </Surface>
    );
  }
}
