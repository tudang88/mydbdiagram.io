import React, { useCallback, memo, useRef, useState, useEffect } from 'react';
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
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(table.getId());
      setIsDragging(true);
      onDragStart(table.getId(), e);
    },
    [table, onSelect, onDragStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && e.buttons === 1) {
        // Cancel previous animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Use requestAnimationFrame for smooth updates
        animationFrameRef.current = requestAnimationFrame(() => {
          onDrag(table.getId(), e);
        });
      }
    },
    [isDragging, table, onDrag]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent canvas from handling this event
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      onDragEnd();
    },
    [onDragEnd]
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={nodeRef}
      className={`table-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      data-table-id={table.getId()}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        willChange: isDragging ? 'transform' : 'auto',
        transition: isDragging ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={() => onDoubleClick?.(table.getId())}
    >
      <div className="table-header">
        <h3 className="table-name">{table.getName()}</h3>
      </div>
      <div className="table-body">
        <div className="table-columns">
          {columns.map(column => (
            <div key={column.id} className="table-column">
              <div className="column-main">
                <span className="column-name">{column.name}</span>
                <span className="column-type">{column.type}</span>
              </div>
              {column.comment && <span className="column-comment">{column.comment}</span>}
              {column.constraints.length > 0 && (
                <span className="column-constraints">
                  {column.constraints.map((c, index) => {
                    const labelByType: Record<string, string> = {
                      PRIMARY_KEY: 'PK',
                      FOREIGN_KEY: 'FK',
                      NOT_NULL: 'NN',
                      UNIQUE: 'UQ',
                    };
                    const classByType: Record<string, string> = {
                      PRIMARY_KEY: 'constraint-badge-pk',
                      FOREIGN_KEY: 'constraint-badge-fk',
                      NOT_NULL: 'constraint-badge-nn',
                      UNIQUE: 'constraint-badge-uq',
                    };
                    const label = labelByType[c.type] || c.type;
                    return (
                      <span
                        key={`${column.id}-constraint-${index}`}
                        className={`constraint-badge ${classByType[c.type] || ''}`}
                      >
                        {label}
                      </span>
                    );
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
// But always re-render when table position changes
export const TableNode = memo(TableNodeComponent, (prevProps, nextProps) => {
  // Always re-render if table ID, selection, name, or column count changes
  if (
    prevProps.table.getId() !== nextProps.table.getId() ||
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.table.getName() !== nextProps.table.getName() ||
    prevProps.table.getAllColumns().length !== nextProps.table.getAllColumns().length
  ) {
    return false; // Props changed, need to re-render
  }

  // Check if table position changed
  const prevPos = prevProps.table.getPosition();
  const nextPos = nextProps.table.getPosition();

  const positionChanged = prevPos.x !== nextPos.x || prevPos.y !== nextPos.y;

  // If position changed, need to re-render
  if (positionChanged) {
    return false;
  }

  // Re-render when column content (name/type/comment/constraints) changes
  const prevColumns = prevProps.table.getAllColumns();
  const nextColumns = nextProps.table.getAllColumns();
  if (
    prevColumns.some((col, index) => {
      const nextCol = nextColumns[index];
      if (!nextCol) return true;
      return (
        col.name !== nextCol.name ||
        col.type !== nextCol.type ||
        (col.comment || '') !== (nextCol.comment || '') ||
        col.constraints.length !== nextCol.constraints.length
      );
    })
  ) {
    return false;
  }

  // Props are the same, skip re-render
  return true;
});
