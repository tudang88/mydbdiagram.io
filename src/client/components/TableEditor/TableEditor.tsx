import React, { useState, useEffect } from 'react';
import { Table } from '../../core/table/Table';
import './TableEditor.css';

interface TableEditorProps {
  table: Table | null;
  onSave: (table: Table) => void;
  onCancel: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ table, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  useEffect(() => {
    if (table) {
      setName(table.getName());
      setPosition(table.getPosition());
      setErrors([]);
    }
  }, [table]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Array<{ field: string; message: string }> = [];
    if (!name.trim()) {
      newErrors.push({ field: 'name', message: 'Table name is required' });
    }
    if (name.length > 100) {
      newErrors.push({ field: 'name', message: 'Table name must be less than 100 characters' });
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!table) {
      return;
    }

    // Update table
    table.setName(name.trim());
    table.moveTo(position);

    onSave(table);
  };

  const handleCancel = () => {
    if (table) {
      setName(table.getName());
      setPosition(table.getPosition());
    }
    setErrors([]);
    onCancel();
  };

  if (!table) {
    return null;
  }

  return (
    <div className="table-editor-overlay" onClick={handleCancel}>
      <div className="table-editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>Edit Table</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group">
            <label htmlFor="table-name">Table Name</label>
            <input
              id="table-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.some((e) => e.field === 'name') ? 'error' : ''}
              placeholder="Enter table name"
              autoFocus
            />
            {errors.some((e) => e.field === 'name') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'name')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="table-x">Position X</label>
            <input
              id="table-x"
              type="number"
              value={position.x}
              onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) || 0 })}
              placeholder="X position"
            />
          </div>

          <div className="form-group">
            <label htmlFor="table-y">Position Y</label>
            <input
              id="table-y"
              type="number"
              value={position.y}
              onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) || 0 })}
              placeholder="Y position"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

