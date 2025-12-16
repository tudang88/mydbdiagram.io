import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
  return (
    <div className="error-message-container">
      <div className="error-message-content">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{message}</span>
        {onDismiss && (
          <button className="error-dismiss-button" onClick={onDismiss}>
            ×
          </button>
        )}
      </div>
    </div>
  );
};

