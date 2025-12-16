import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  type?: 'error' | 'warning';
}

/**
 * Enhanced error message component with improved user experience
 * Displays user-friendly error messages with clear actions
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  type = 'error',
}) => {
  // Format error message for better readability
  const formatMessage = (msg: string): string => {
    // Capitalize first letter
    return msg.charAt(0).toUpperCase() + msg.slice(1);
  };

  return (
    <div className={`error-message-container error-message-${type}`}>
      <div className="error-message-content">
        <span className="error-icon" role="img" aria-label={type}>
          {type === 'error' ? '⚠️' : '⚠'}
        </span>
        <span className="error-text">{formatMessage(message)}</span>
        {onDismiss && (
          <button className="error-dismiss-button" onClick={onDismiss} aria-label="Dismiss error">
            ×
          </button>
        )}
      </div>
    </div>
  );
};
