import React, { useCallback, memo } from 'react';
import { Table } from '../../core/table/Table';
import './TableNode.css';

interface TableNodeProps {
  table: Table;
  isSelected: boolean;
  onSelect: (tableId: string) => void;
  onDoubleClick?: (tableId: string) => void;
  onDragStart: (tableId: string, e: React.MouseEvent) => void;
  onDrag: (tableId: string, e: React.MouseEvent) => void;
  onDragEnd: () => void;
}

const TableNodeComponent: React.FC<TableNodeProps> = ({
  table,
  isSelected,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const position = table.getPosition();
  const columns = table.getAllColumns();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(table.getId());
      onDragStart(table.getId(), e);
    },
    [table, onSelect, onDragStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons === 1) {
        // Left mouse button pressed
        onDrag(table.getId(), e);
      }
    },
    [table, onDrag]
  );

  return (
    <div
      className={`table-node ${isSelected ? 'selected' : ''}`}
      data-table-id={table.getId()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onDoubleClick={() => onDoubleClick?.(table.getId())}
    >
      <div className="table-header">
        <h3 className="table-name">{table.getName()}</h3>
      </div>
      <div className="table-body">
        <div className="table-columns">
          {columns.map(column => (
            <div key={column.id} className="table-column">
              <span className="column-name">{column.name}</span>
              <span className="column-type">{column.type}</span>
              {column.constraints.length > 0 && (
                <span className="column-constraints">
                  {column.constraints.map(c => {
                    if (c.type === 'PRIMARY_KEY') return '🔑';
                    if (c.type === 'FOREIGN_KEY') return '🔗';
                    if (c.type === 'NOT_NULL') return '!';
                    if (c.type === 'UNIQUE') return 'U';
                    return '';
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoize TableNode to prevent unnecessary re-renders
export const TableNode = memo(TableNodeComponent, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.table.getId() === nextProps.table.getId() &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.table.getPosition().x === nextProps.table.getPosition().x &&
    prevProps.table.getPosition().y === nextProps.table.getPosition().y &&
    prevProps.table.getName() === nextProps.table.getName() &&
    prevProps.table.getAllColumns().length === nextProps.table.getAllColumns().length
  );
});
