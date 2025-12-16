import { useState, useRef, useEffect } from 'react';
import { SQLParser } from '../../core/parser/SQLParser';
import { Diagram } from '../../core/diagram/Diagram';
import './SQLEditor.css';

interface SQLEditorProps {
  diagram: Diagram | null;
  onDiagramChange: (diagram: Diagram) => void;
  sqlDialect: 'sql' | 'postgresql';
  onDialectChange: (dialect: 'sql' | 'postgresql') => void;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  diagram,
  onDiagramChange,
  sqlDialect,
  onDialectChange,
}) => {
  const [sqlText, setSqlText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync SQL text when diagram changes externally
  useEffect(() => {
    if (diagram) {
      // Generate SQL from diagram (if needed)
      // For now, we'll keep the user's SQL text
    }
  }, [diagram]);

  // Update line numbers when SQL text changes
  useEffect(() => {
    const lines = sqlText.split('\n');
    setLineNumbers(lines.map((_, index) => index + 1));
  }, [sqlText]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSQLChange = (value: string) => {
    setSqlText(value);
    setError(null);

    // Auto-parse on change (debounced would be better, but for now immediate)
    if (value.trim()) {
      parseSQL(value);
    }
  };

  const parseSQL = (sql: string) => {
    try {
      const parser = new SQLParser();
      const result = parser.parse(sql);

      if (result.success && result.data) {
        onDiagramChange(result.data);
        setError(null);
      } else {
        const errorMessages =
          result.errors?.map(e => e.message).join('\n') || 'Failed to parse SQL';
        setError(errorMessages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse error');
    }
  };

  const handleFormat = () => {
    // Basic SQL formatting (can be enhanced)
    const formatted = sqlText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    setSqlText(formatted);
  };

  return (
    <div className="sql-editor">
      <div className="sql-editor-header">
        <div className="dialect-selector">
          <label>SQL Dialect:</label>
          <select
            value={sqlDialect}
            onChange={e => onDialectChange(e.target.value as 'sql' | 'postgresql')}
            className="dialect-select"
          >
            <option value="sql">SQL (Generic)</option>
            <option value="postgresql">PostgreSQL</option>
          </select>
        </div>
        <div className="editor-actions">
          <button className="format-button" onClick={handleFormat} title="Format SQL">
            Format
          </button>
        </div>
      </div>
      <div className="sql-editor-content">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers.map(lineNum => (
            <div key={lineNum} className="line-number">
              {lineNum}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className={`sql-textarea ${error ? 'error' : ''}`}
          value={sqlText}
          onChange={e => handleSQLChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={`-- Write your ${sqlDialect.toUpperCase()} DDL statements here&#10;-- Example:&#10;CREATE TABLE users (&#10;  id INT PRIMARY KEY,&#10;  name VARCHAR(100) NOT NULL&#10;);`}
          spellCheck={false}
        />
      </div>
      {error && (
        <div className="sql-editor-error">
          <span className="error-icon">⚠️</span>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
};
