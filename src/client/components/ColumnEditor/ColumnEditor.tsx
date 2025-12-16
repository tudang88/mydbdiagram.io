import React, { useState, useEffect } from 'react';
import { Column } from '../../types/table.types';
import { ConstraintType } from '../../types/common.types';
import './ColumnEditor.css';

interface ColumnEditorProps {
  column: Column | null;
  onSave: (column: Column) => void;
  onCancel: () => void;
}

export const ColumnEditor: React.FC<ColumnEditorProps> = ({ column, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [comment, setComment] = useState('');
  const [constraints, setConstraints] = useState<Array<{ type: ConstraintType; value?: string }>>(
    []
  );
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  useEffect(() => {
    if (column) {
      setName(column.name);
      setType(column.type);
      setDefaultValue(column.defaultValue || '');
      setComment(column.comment || '');
      setConstraints(column.constraints || []);
      setErrors([]);
    }
  }, [column]);

  const handleConstraintToggle = (constraintType: ConstraintType) => {
    const existing = constraints.find((c) => c.type === constraintType);
    if (existing) {
      setConstraints(constraints.filter((c) => c.type !== constraintType));
    } else {
      setConstraints([...constraints, { type: constraintType }]);
    }
  };

  const handleConstraintValueChange = (constraintType: ConstraintType, value: string) => {
    setConstraints(
      constraints.map((c) => (c.type === constraintType ? { ...c, value } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Array<{ field: string; message: string }> = [];
    if (!name.trim()) {
      newErrors.push({ field: 'name', message: 'Column name is required' });
    }
    if (name.length > 100) {
      newErrors.push({ field: 'name', message: 'Column name must be less than 100 characters' });
    }
    if (!type.trim()) {
      newErrors.push({ field: 'type', message: 'Column type is required' });
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!column) {
      return;
    }

    // Create updated column
    const updatedColumn: Column = {
      ...column,
      name: name.trim(),
      type: type.trim(),
      defaultValue: defaultValue.trim() || undefined,
      comment: comment.trim() || undefined,
      constraints,
    };

    onSave(updatedColumn);
  };

  const handleCancel = () => {
    if (column) {
      setName(column.name);
      setType(column.type);
      setDefaultValue(column.defaultValue || '');
      setComment(column.comment || '');
      setConstraints(column.constraints || []);
    }
    setErrors([]);
    onCancel();
  };

  if (!column) {
    return null;
  }

  const hasConstraint = (constraintType: ConstraintType) => {
    return constraints.some((c) => c.type === constraintType);
  };

  return (
    <div className="column-editor-overlay" onClick={handleCancel}>
      <div className="column-editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>Edit Column</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group">
            <label htmlFor="column-name">Column Name</label>
            <input
              id="column-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.some((e) => e.field === 'name') ? 'error' : ''}
              placeholder="Enter column name"
              autoFocus
            />
            {errors.some((e) => e.field === 'name') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'name')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="column-type">Column Type</label>
            <input
              id="column-type"
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={errors.some((e) => e.field === 'type') ? 'error' : ''}
              placeholder="e.g., VARCHAR(255), INTEGER, DATE"
            />
            {errors.some((e) => e.field === 'type') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'type')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="column-default">Default Value (optional)</label>
            <input
              id="column-default"
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Default value"
            />
          </div>

          <div className="form-group">
            <label htmlFor="column-comment">Comment (optional)</label>
            <textarea
              id="column-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Column description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Constraints</label>
            <div className="constraints-list">
              <label className="constraint-checkbox">
                <input
                  type="checkbox"
                  checked={hasConstraint('PRIMARY_KEY')}
                  onChange={() => handleConstraintToggle('PRIMARY_KEY')}
                />
                <span>Primary Key</span>
              </label>
              <label className="constraint-checkbox">
                <input
                  type="checkbox"
                  checked={hasConstraint('FOREIGN_KEY')}
                  onChange={() => handleConstraintToggle('FOREIGN_KEY')}
                />
                <span>Foreign Key</span>
                {hasConstraint('FOREIGN_KEY') && (
                  <input
                    type="text"
                    value={constraints.find((c) => c.type === 'FOREIGN_KEY')?.value || ''}
                    onChange={(e) => handleConstraintValueChange('FOREIGN_KEY', e.target.value)}
                    placeholder="e.g., Users.id"
                    className="constraint-value"
                  />
                )}
              </label>
              <label className="constraint-checkbox">
                <input
                  type="checkbox"
                  checked={hasConstraint('NOT_NULL')}
                  onChange={() => handleConstraintToggle('NOT_NULL')}
                />
                <span>Not Null</span>
              </label>
              <label className="constraint-checkbox">
                <input
                  type="checkbox"
                  checked={hasConstraint('UNIQUE')}
                  onChange={() => handleConstraintToggle('UNIQUE')}
                />
                <span>Unique</span>
              </label>
              <label className="constraint-checkbox">
                <input
                  type="checkbox"
                  checked={hasConstraint('AUTO_INCREMENT')}
                  onChange={() => handleConstraintToggle('AUTO_INCREMENT')}
                />
                <span>Auto Increment</span>
              </label>
            </div>
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

