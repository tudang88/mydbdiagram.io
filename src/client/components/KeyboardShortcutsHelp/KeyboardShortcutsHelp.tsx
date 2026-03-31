import { useEffect } from 'react';
import './KeyboardShortcutsHelp.css';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'S'], description: 'Save diagram' },
  { keys: ['Delete'], description: 'Delete selected table' },
  { keys: ['Backspace'], description: 'Delete selected table' },
  { keys: ['Escape'], description: 'Close dialogs/menus' },
  { keys: ['Ctrl', 'Wheel'], description: 'Zoom in/out' },
  { keys: ['Double Click'], description: 'Edit table/column' },
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-content">
          <div className="shortcuts-list">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-keys">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="key">
                      {key}
                    </span>
                  ))}
                </div>
                <div className="shortcut-description">{shortcut.description}</div>
              </div>
            ))}
          </div>
          <div className="app-info">
            <div className="app-info-title">About this build</div>
            <div className="app-info-line">
              <strong>Version:</strong> v0.1.0
            </div>
            <div className="app-info-line">
              <strong>Branch:</strong> main-frontendonly
            </div>
            <div className="app-info-line">
              <strong>Repository:</strong>{' '}
              <a href="https://github.com/tudang88/mydbdiagram.io" target="_blank" rel="noreferrer">
                github.com/tudang88/mydbdiagram.io
              </a>
            </div>
            <div className="app-info-hint">
              Please open issues or submit contributions in the repository above.
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="close-button-footer" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
