import { useState, useEffect } from 'react';
import { Diagram } from '../../core/diagram/Diagram';
import { Relationship } from '../../core/relationship/Relationship';
import './RelationshipCreator.css';

interface RelationshipCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (relationship: Relationship) => void;
  diagram: Diagram | null;
  fromTableId?: string;
  toTableId?: string;
}

export const RelationshipCreator: React.FC<RelationshipCreatorProps> = ({
  isOpen,
  onClose,
  onSave,
  diagram,
  fromTableId,
  toTableId,
}) => {
  const [selectedFromTable, setSelectedFromTable] = useState<string>(fromTableId || '');
  const [selectedFromColumn, setSelectedFromColumn] = useState<string>('');
  const [selectedToTable, setSelectedToTable] = useState<string>(toTableId || '');
  const [selectedToColumn, setSelectedToColumn] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY'>('ONE_TO_MANY');
  const [isOptional, setIsOptional] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      if (fromTableId) {
        setSelectedFromTable(fromTableId);
      }
      if (toTableId) {
        setSelectedToTable(toTableId);
      }
      setErrors([]);
    }
  }, [isOpen, fromTableId, toTableId]);

  const fromTable = selectedFromTable ? diagram?.getTable(selectedFromTable) : null;
  const toTable = selectedToTable ? diagram?.getTable(selectedToTable) : null;

  const handleSave = () => {
    const newErrors: Array<{ field: string; message: string }> = [];

    if (!selectedFromTable) {
      newErrors.push({ field: 'fromTable', message: 'From table is required' });
    }
    if (!selectedFromColumn) {
      newErrors.push({ field: 'fromColumn', message: 'From column is required' });
    }
    if (!selectedToTable) {
      newErrors.push({ field: 'toTable', message: 'To table is required' });
    }
    if (!selectedToColumn) {
      newErrors.push({ field: 'toColumn', message: 'To column is required' });
    }
    if (selectedFromTable === selectedToTable) {
      newErrors.push({ field: 'tables', message: 'From and To tables must be different' });
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!diagram || !fromTable || !toTable) {
      return;
    }

    try {
      const relationship = new Relationship(
        `rel-${Date.now()}`,
        selectedFromTable,
        selectedFromColumn,
        selectedToTable,
        selectedToColumn,
        relationshipType,
        isOptional
      );

      onSave(relationship);
      onClose();
      resetForm();
    } catch (err) {
      setErrors([{ field: 'general', message: err instanceof Error ? err.message : 'Failed to create relationship' }]);
    }
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSelectedFromTable(fromTableId || '');
    setSelectedFromColumn('');
    setSelectedToTable(toTableId || '');
    setSelectedToColumn('');
    setRelationshipType('ONE_TO_MANY');
    setIsOptional(false);
    setErrors([]);
  };

  if (!isOpen || !diagram) return null;

  const tables = diagram.getAllTables();

  return (
    <div className="relationship-creator-overlay" onClick={handleCancel}>
      <div className="relationship-creator" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Create Relationship</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          <div className="form-group">
            <label htmlFor="from-table">From Table</label>
            <select
              id="from-table"
              value={selectedFromTable}
              onChange={(e) => {
                setSelectedFromTable(e.target.value);
                setSelectedFromColumn('');
                setErrors([]);
              }}
              className={errors.some((e) => e.field === 'fromTable') ? 'error' : ''}
            >
              <option value="">Select table...</option>
              {tables.map((table) => (
                <option key={table.getId()} value={table.getId()}>
                  {table.getName()}
                </option>
              ))}
            </select>
            {errors.some((e) => e.field === 'fromTable') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'fromTable')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="from-column">From Column</label>
            <select
              id="from-column"
              value={selectedFromColumn}
              onChange={(e) => {
                setSelectedFromColumn(e.target.value);
                setErrors([]);
              }}
              disabled={!fromTable}
              className={errors.some((e) => e.field === 'fromColumn') ? 'error' : ''}
            >
              <option value="">Select column...</option>
              {fromTable?.getAllColumns().map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name} ({column.type})
                </option>
              ))}
            </select>
            {errors.some((e) => e.field === 'fromColumn') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'fromColumn')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="to-table">To Table</label>
            <select
              id="to-table"
              value={selectedToTable}
              onChange={(e) => {
                setSelectedToTable(e.target.value);
                setSelectedToColumn('');
                setErrors([]);
              }}
              className={errors.some((e) => e.field === 'toTable') ? 'error' : ''}
            >
              <option value="">Select table...</option>
              {tables
                .filter((table) => table.getId() !== selectedFromTable)
                .map((table) => (
                  <option key={table.getId()} value={table.getId()}>
                    {table.getName()}
                  </option>
                ))}
            </select>
            {errors.some((e) => e.field === 'toTable') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'toTable')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="to-column">To Column</label>
            <select
              id="to-column"
              value={selectedToColumn}
              onChange={(e) => {
                setSelectedToColumn(e.target.value);
                setErrors([]);
              }}
              disabled={!toTable}
              className={errors.some((e) => e.field === 'toColumn') ? 'error' : ''}
            >
              <option value="">Select column...</option>
              {toTable?.getAllColumns().map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name} ({column.type})
                </option>
              ))}
            </select>
            {errors.some((e) => e.field === 'toColumn') && (
              <span className="error-message">
                {errors.find((e) => e.field === 'toColumn')?.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="relationship-type">Relationship Type</label>
            <select
              id="relationship-type"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as typeof relationshipType)}
            >
              <option value="ONE_TO_ONE">One-to-One (1:1)</option>
              <option value="ONE_TO_MANY">One-to-Many (1:N)</option>
              <option value="MANY_TO_MANY">Many-to-Many (M:N)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
              />
              <span>Optional relationship</span>
            </label>
          </div>

          {errors.some((e) => e.field === 'tables' || e.field === 'general') && (
            <div className="error-message-general">
              {errors.find((e) => e.field === 'tables' || e.field === 'general')?.message}
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="cancel-button" onClick={handleCancel}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

