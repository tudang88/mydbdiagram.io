import { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Enhanced error logging
    const errorDetails = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };
    console.error('Error caught by boundary:', JSON.stringify(errorDetails, null, 2));
    
    // In production, you could send this to an error tracking service
    // Example: errorTrackingService.log(errorDetails);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="error-actions">
              <button className="error-reset-button" onClick={this.handleReset}>
                Try Again
              </button>
              <button
                className="error-reload-button"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <details className="error-stack">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

