import React, { memo, useMemo } from 'react';
import { Relationship } from '../../core/relationship/Relationship';
import { Table } from '../../core/table/Table';
import './RelationshipLine.css';

interface RelationshipLineProps {
  relationship: Relationship;
  fromTable: Table;
  toTable: Table;
}

const RelationshipLineComponent: React.FC<RelationshipLineProps> = ({
  relationship,
  fromTable,
  toTable,
}) => {
  // Memoize position calculations
  const fromPos = useMemo(() => fromTable.getPosition(), [fromTable]);
  const toPos = useMemo(() => toTable.getPosition(), [toTable]);

  // Calculate orthogonal path (right-angle routing) from column positions (like dbdiagram.io)
  const pathData = useMemo(() => {
    // Get table dimensions - use actual table dimensions
    const TABLE_WIDTH = 200; // Standard table width
    const TABLE_HEADER_HEIGHT = 40;
    const COLUMN_HEIGHT = 30;
    const HORIZONTAL_OFFSET = 20; // Distance from table edge for horizontal segment

    // Get the specific columns involved in this relationship
    const fromColumnId = relationship.getFromColumnId();
    const toColumnId = relationship.getToColumnId();

    // Get all columns to find the index of the relationship columns
    const fromColumns = fromTable.getAllColumns();
    const toColumns = toTable.getAllColumns();

    // Find the index of the fromColumn and toColumn
    const fromColumnIndex = fromColumns.findIndex(col => col.id === fromColumnId);
    const toColumnIndex = toColumns.findIndex(col => col.id === toColumnId);

    // If columns not found, fallback to center of table
    if (fromColumnIndex === -1 || toColumnIndex === -1) {
      const fromHeight = TABLE_HEADER_HEIGHT + fromColumns.length * COLUMN_HEIGHT;
      const toHeight = TABLE_HEADER_HEIGHT + toColumns.length * COLUMN_HEIGHT;
      const fromX = fromPos.x + TABLE_WIDTH / 2;
      const fromY = fromPos.y + fromHeight / 2;
      const toX = toPos.x + TABLE_WIDTH / 2;
      const toY = toPos.y + toHeight / 2;
      // Simple straight line fallback
      return {
        path: `M ${fromX} ${fromY} L ${toX} ${toY}`,
        fromX,
        fromY,
        toX,
        toY,
      };
    }

    // Calculate Y position of the column (center of the column row)
    const fromColumnY =
      fromPos.y + TABLE_HEADER_HEIGHT + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
    const toColumnY =
      toPos.y + TABLE_HEADER_HEIGHT + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

    // Calculate table boundaries
    const fromLeft = fromPos.x;
    const fromRight = fromPos.x + TABLE_WIDTH;
    const toLeft = toPos.x;
    const toRight = toPos.x + TABLE_WIDTH;

    // Determine which edge to connect from/to based on table positions
    const fromCenterX = fromPos.x + TABLE_WIDTH / 2;
    const toCenterX = toPos.x + TABLE_WIDTH / 2;

    let fromX: number;
    let toX: number;

    // If fromTable is to the left of toTable
    if (fromCenterX < toCenterX) {
      fromX = fromRight;
      toX = toLeft;
      // Create orthogonal path: horizontal from table, vertical to target column Y, horizontal to target
      return {
        path: `M ${fromX} ${fromColumnY} L ${fromX + HORIZONTAL_OFFSET} ${fromColumnY} L ${fromX + HORIZONTAL_OFFSET} ${toColumnY} L ${toX} ${toColumnY}`,
        fromX: fromX + HORIZONTAL_OFFSET,
        fromY: fromColumnY,
        toX,
        toY: toColumnY,
      };
    } else {
      // If fromTable is to the right of toTable
      fromX = fromLeft;
      toX = toRight;
      // Create orthogonal path: horizontal from table, vertical to midpoint, horizontal to target
      return {
        path: `M ${fromX} ${fromColumnY} L ${fromX - HORIZONTAL_OFFSET} ${fromColumnY} L ${fromX - HORIZONTAL_OFFSET} ${toColumnY} L ${toX} ${toColumnY}`,
        fromX: fromX - HORIZONTAL_OFFSET,
        fromY: fromColumnY,
        toX,
        toY: toColumnY,
      };
    }
  }, [fromPos, toPos, fromTable, toTable, relationship]);

  // Memoize relationship type styling
  const lineStyle = useMemo(() => {
    const type = relationship.getType();
    if (type === 'ONE_TO_ONE') {
      return 'one-to-one';
    }
    if (type === 'ONE_TO_MANY') {
      return 'one-to-many';
    }
    if (type === 'MANY_TO_MANY') {
      return 'many-to-many';
    }
    return 'default';
  }, [relationship]);

  // Marker sizes
  const markerSize = 8;
  const relationshipType = relationship.getType();

  // Debug: Log path data (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📍 RelationshipLine ${relationship.getId()}:`, {
      path: pathData.path,
      from: `${fromTable.getName()} at (${pathData.fromX}, ${pathData.fromY})`,
      to: `${toTable.getName()} at (${pathData.toX}, ${pathData.toY})`,
    });
  }

  return (
    <svg
      className="relationship-line"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Circle with horizontal line for "one" side (like dbdiagram.io) */}
        <marker
          id={`one-marker-${relationship.getId()}`}
          markerWidth={markerSize * 2}
          markerHeight={markerSize * 2}
          refX={markerSize}
          refY={markerSize}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <g stroke="#666" strokeWidth="1" fill="none">
            {/* Circle */}
            <circle cx={markerSize} cy={markerSize} r={markerSize * 0.4} />
            {/* Short horizontal line extending from circle */}
            <line x1={markerSize} y1={markerSize} x2={markerSize * 1.8} y2={markerSize} />
          </g>
        </marker>

        {/* Arrow head for "many" side (like dbdiagram.io) */}
        <marker
          id={`arrowhead-${relationship.getId()}`}
          markerWidth={8}
          markerHeight={8}
          refX={8}
          refY={4}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <polygon points="0,0 8,4 0,8" fill="#666" />
        </marker>
      </defs>
      <path
        d={pathData.path}
        className={`relationship-line-${lineStyle}`}
        markerStart={
          relationshipType === 'MANY_TO_MANY'
            ? undefined
            : relationshipType === 'ONE_TO_MANY'
              ? `url(#one-marker-${relationship.getId()})`
              : relationshipType === 'ONE_TO_ONE'
                ? `url(#one-marker-${relationship.getId()})`
                : undefined
        }
        markerEnd={
          relationshipType === 'MANY_TO_MANY'
            ? `url(#arrowhead-${relationship.getId()})`
            : relationshipType === 'ONE_TO_MANY'
              ? `url(#arrowhead-${relationship.getId()})`
              : relationshipType === 'ONE_TO_ONE'
                ? `url(#arrowhead-${relationship.getId()})`
                : `url(#arrowhead-${relationship.getId()})`
        }
        strokeWidth={1}
        stroke="#666"
        fill="none"
      />
      {relationship.isOptional() && (
        <circle
          cx={pathData.fromX}
          cy={pathData.fromY}
          r={4}
          fill="#666"
          className="optional-marker"
        />
      )}
    </svg>
  );
};

// Memoize RelationshipLine to prevent unnecessary re-renders
export const RelationshipLine = memo(RelationshipLineComponent, (prevProps, nextProps) => {
  // Only re-render if these props change
  const prevFromPos = prevProps.fromTable.getPosition();
  const nextFromPos = nextProps.fromTable.getPosition();
  const prevToPos = prevProps.toTable.getPosition();
  const nextToPos = nextProps.toTable.getPosition();

  return (
    prevProps.relationship.getId() === nextProps.relationship.getId() &&
    prevFromPos.x === nextFromPos.x &&
    prevFromPos.y === nextFromPos.y &&
    prevToPos.x === nextToPos.x &&
    prevToPos.y === nextToPos.y &&
    prevProps.relationship.getType() === nextProps.relationship.getType()
  );
});
