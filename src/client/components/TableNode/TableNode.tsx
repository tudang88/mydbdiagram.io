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

  // Props are the same, skip re-render
  return true;
});
