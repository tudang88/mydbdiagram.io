import { useState, useEffect } from 'react';
import { JSONParser } from '../../core/parser/JSONParser';
import { SQLParser } from '../../core/parser/SQLParser';
import { Diagram } from '../../core/diagram/Diagram';
import {
  FilePickerAccept,
  isUserCancelledFilePickerError,
  pickTextFile,
} from '../../utils/fileSystemAccess';
import './ImportDialog.css';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (diagram: Diagram, importText?: string) => void; // Include import text for editor
}

type ImportMode = 'sql' | 'json' | 'paste';

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const [mode, setMode] = useState<ImportMode>('paste');
  const [sqlText, setSqlText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileAccept: FilePickerAccept[] = [
    {
      description: 'Diagram files',
      mimeTypes: ['application/json', 'text/plain'],
      extensions: ['.json', '.sql'],
    },
  ];

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when dialog closes
      setSqlText('');
      setJsonText('');
      setError(null);
      setIsValidating(false);
      setMode('paste');
    } else {
      // Reset validating state when dialog opens (in case it was left in loading state)
      setIsValidating(false);
    }
  }, [isOpen]);

  // Return null after useEffect to ensure cleanup runs
  if (!isOpen) return null;

  const handleFileSelect = async () => {
    try {
      const { file, text } = await pickTextFile({ accept: fileAccept });
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!text || !text.trim()) {
        setError('File is empty');
        return;
      }

      if (fileExtension === 'sql') {
        setMode('sql');
        setSqlText(text);
        setError(null);
      } else if (fileExtension === 'json') {
        setMode('json');
        setJsonText(text);
        setError(null);
      } else {
        setError('Unsupported file format. Please use .sql or .json files.');
        return;
      }
    } catch (err) {
      if (isUserCancelledFilePickerError(err)) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to read file');
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
        if (!sqlText.trim()) {
          setError('Please enter SQL statements to import');
          setIsValidating(false);
          return;
        }
        parser = new SQLParser();
        text = sqlText;
      } else if (mode === 'json') {
        if (!jsonText.trim()) {
          setError('Please enter JSON data to import');
          setIsValidating(false);
          return;
        }
        parser = new JSONParser();
        text = jsonText;
      } else {
        setError('Please select a mode (SQL or JSON) and enter data');
        setIsValidating(false);
        return;
      }

      const result = parser.parse(text);
      if (!result.success || !result.data) {
        const errorMessage =
          result.errors?.map(e => e.message).join('\n') || 'Failed to parse input';
        setError(errorMessage);
        setIsValidating(false);
        console.error('Import parse failed:', errorMessage, result);
        return;
      }

      // Successfully parsed - import the diagram
      console.log('Import successful, diagram:', result.data);
      // Debug: Check relationships
      if (!result.data) {
        throw new Error('Failed to parse diagram');
      }
      const diagram = result.data;
      const relationships = diagram.getAllRelationships();
      console.log(
        `📊 Imported diagram has ${relationships.length} relationships:`,
        relationships.map(r => ({
          id: r.getId(),
          from: diagram.getTable(r.getFromTableId())?.getName(),
          to: diagram.getTable(r.getToTableId())?.getName(),
          type: r.getType(),
        }))
      );
      // Pass the original text to onImport so it can be set in editor
      const importText = mode === 'sql' ? sqlText : mode === 'json' ? undefined : undefined;
      onImport(diagram, importText);
      // Reset state before closing
      setSqlText('');
      setJsonText('');
      setError(null);
      setIsValidating(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import error');
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    setSqlText('');
    setJsonText('');
    setError(null);
    setIsValidating(false); // Reset validating state when canceling
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
