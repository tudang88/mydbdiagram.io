import { useState, useRef, useEffect } from 'react';
import { SQLParser } from '../../core/parser/SQLParser';
import { DBMLParser } from '../../core/parser/DBMLParser';
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

  // Clear editor when new empty diagram is created
  useEffect(() => {
    // If diagram is new/empty (no tables), clear editor
    if (diagram && diagram.getAllTables().length === 0) {
      setSqlText('');
      setError(null);
    }
  }, [diagram]);

  // Initialize with example SQL/DBML if editor is empty
  useEffect(() => {
    if (!sqlText && !diagram) {
      // Use DBML format as default (similar to dbdiagram.io)
      const exampleDBML = `Table users {
  id integer [primary key]
  username varchar
  email varchar [unique]
  created_at timestamp
}

Table posts {
  id integer [primary key]
  user_id integer [not null]
  title varchar
  body text
  created_at timestamp
}

Ref: posts.user_id > users.id`;
      setSqlText(exampleDBML);
      // Don't auto-parse - user must click "Draw" button
    }
  }, []);

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
    // No longer auto-parse - user must click "Draw" button
  };

  const parseSQL = (sql: string) => {
    try {
      // Try DBML parser first (for PostgreSQL dialect or DBML format)
      const dbmlParser = new DBMLParser();
      if (dbmlParser.canParse(sql)) {
        const result = dbmlParser.parse(sql);
        if (result.success && result.data) {
          onDiagramChange(result.data);
          setError(null);
          return;
        }
        // If DBML parse failed, try SQL parser as fallback
      }

      // Fallback to SQL parser
      const sqlParser = new SQLParser();
      const result = sqlParser.parse(sql);

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

  const handleDraw = () => {
    if (!sqlText.trim()) {
      setError('Please enter SQL statements to draw diagram');
      return;
    }
    parseSQL(sqlText);
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
          <button className="draw-button" onClick={handleDraw} title="Draw/Refresh Diagram">
            🎨 Draw
          </button>
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
          placeholder={
            sqlDialect === 'postgresql'
              ? `-- Write your DBML format (like dbdiagram.io)
-- Example:
Table users {
  id integer [primary key]
  username varchar
  email varchar [unique]
  created_at timestamp
}

Table posts {
  id integer [primary key]
  user_id integer [not null]
  title varchar
  body text
  created_at timestamp
}

Ref: posts.user_id > users.id`
              : `-- Write your SQL DDL statements here
-- Example:
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT,
  title VARCHAR(200),
  FOREIGN KEY (user_id) REFERENCES users(id)
);`
          }
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
