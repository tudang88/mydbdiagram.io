import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  size = 'medium',
}) => {
  return (
    <div className={`loading-indicator loading-${size}`}>
      <div className="loading-spinner"></div>
      {message && <div className="loading-message">{message}</div>}
    </div>
  );
};

