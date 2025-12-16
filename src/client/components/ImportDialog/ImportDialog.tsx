import { useState, useRef } from 'react';
import { JSONParser } from '../../core/parser/JSONParser';
import { SQLParser } from '../../core/parser/SQLParser';
import { Diagram } from '../../core/diagram/Diagram';
import './ImportDialog.css';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (diagram: Diagram) => void;
}

type ImportMode = 'sql' | 'json' | 'paste';

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const [mode, setMode] = useState<ImportMode>('paste');
  const [sqlText, setSqlText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const text = await file.text();

    if (fileExtension === 'sql') {
      setMode('sql');
      setSqlText(text);
    } else if (fileExtension === 'json') {
      setMode('json');
      setJsonText(text);
    } else {
      setError('Unsupported file format. Please use .sql or .json files.');
      return;
    }

    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleValidate = () => {
    setError(null);
    setIsValidating(true);

    try {
      let parser: JSONParser | SQLParser;
      let text: string;

      if (mode === 'sql') {
        parser = new SQLParser();
        text = sqlText;
      } else {
        parser = new JSONParser();
        text = jsonText;
      }

      const validation = parser.validate(text);
      if (!validation.isValid) {
        setError(
          validation.errors?.map(e => `${e.field}: ${e.message}`).join('\n') || 'Validation failed'
        );
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = () => {
    setError(null);
    setIsValidating(true);

    try {
      let parser: JSONParser | SQLParser;
      let text: string;

      if (mode === 'sql') {
        parser = new SQLParser();
        text = sqlText;
      } else {
        parser = new JSONParser();
        text = jsonText;
      }

      const result = parser.parse(text);
      if (!result.success || !result.data) {
        setError(result.errors?.map(e => e.message).join('\n') || 'Failed to parse input');
        setIsValidating(false);
        return;
      }

      onImport(result.data);
      onClose();
      setSqlText('');
      setJsonText('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setSqlText('');
    setJsonText('');
    setError(null);
    onClose();
  };

  return (
    <div className="import-dialog-overlay" onClick={handleCancel}>
      <div className="import-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Import Diagram</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          <div className="import-mode-selector">
            <button
              className={`mode-button ${mode === 'paste' ? 'active' : ''}`}
              onClick={() => setMode('paste')}
            >
              Paste
            </button>
            <button
              className={`mode-button ${mode === 'sql' ? 'active' : ''}`}
              onClick={() => setMode('sql')}
            >
              SQL
            </button>
            <button
              className={`mode-button ${mode === 'json' ? 'active' : ''}`}
              onClick={() => setMode('json')}
            >
              JSON
            </button>
            <button className="mode-button file-button" onClick={handleFileSelect}>
              📁 From File
            </button>
          </div>

          <div className="import-input-area">
            {mode === 'sql' && (
              <div className="input-group">
                <label htmlFor="sql-input">
                  <strong>SQL Editor</strong> - Write or paste your SQL DDL statements
                </label>
                <textarea
                  id="sql-input"
                  value={sqlText}
                  onChange={e => {
                    setSqlText(e.target.value);
                    setError(null);
                  }}
                  placeholder="-- Example SQL DDL&#10;CREATE TABLE users (&#10;  id INT PRIMARY KEY,&#10;  name VARCHAR(100) NOT NULL,&#10;  email VARCHAR(100) UNIQUE&#10;);&#10;&#10;CREATE TABLE posts (&#10;  id INT PRIMARY KEY,&#10;  user_id INT,&#10;  title VARCHAR(200),&#10;  FOREIGN KEY (user_id) REFERENCES users(id)&#10;);"
                  rows={20}
                  className={error ? 'error' : ''}
                  style={{
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '13px',
                  }}
                />
                <div className="editor-hint">
                  💡 Tip: You can write multiple CREATE TABLE statements. The parser will extract
                  tables, columns, and relationships automatically.
                </div>
              </div>
            )}

            {mode === 'json' && (
              <div className="input-group">
                <label htmlFor="json-input">JSON Diagram Data</label>
                <textarea
                  id="json-input"
                  value={jsonText}
                  onChange={e => {
                    setJsonText(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste your JSON diagram data here..."
                  rows={15}
                  className={error ? 'error' : ''}
                />
              </div>
            )}

            {mode === 'paste' && (
              <div className="paste-mode-info">
                <p>Select SQL or JSON mode to paste your data, or choose a file to import.</p>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <pre>{error}</pre>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".sql,.json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="dialog-actions">
          <button className="cancel-button" onClick={handleCancel} disabled={isValidating}>
            Cancel
          </button>
          <button className="validate-button" onClick={handleValidate} disabled={isValidating}>
            Validate
          </button>
          <button
            className="import-button"
            onClick={handleImport}
            disabled={
              isValidating || (mode === 'sql' && !sqlText) || (mode === 'json' && !jsonText)
            }
          >
            {isValidating ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
