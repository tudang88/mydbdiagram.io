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

  // Calculate line endpoints from column positions (like dbdiagram.io)
  const lineCoords = useMemo(() => {
    // Get table dimensions - use actual table dimensions
    const TABLE_WIDTH = 200; // Standard table width
    const TABLE_HEADER_HEIGHT = 40;
    const COLUMN_HEIGHT = 30;

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
      return {
        fromX: fromPos.x + TABLE_WIDTH / 2,
        fromY: fromPos.y + fromHeight / 2,
        toX: toPos.x + TABLE_WIDTH / 2,
        toY: toPos.y + toHeight / 2,
      };
    }

    // Calculate Y position of the column (center of the column row)
    // Y = table top + header height + (column index * column height) + (column height / 2)
    const fromColumnY =
      fromPos.y + TABLE_HEADER_HEIGHT + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
    const toColumnY =
      toPos.y + TABLE_HEADER_HEIGHT + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

    // Calculate table boundaries
    const fromLeft = fromPos.x;
    const fromRight = fromPos.x + TABLE_WIDTH;
    const fromTop = fromPos.y;
    const fromBottom = fromPos.y + TABLE_HEADER_HEIGHT + fromColumns.length * COLUMN_HEIGHT;

    const toLeft = toPos.x;
    const toRight = toPos.x + TABLE_WIDTH;
    const toTop = toPos.y;
    const toBottom = toPos.y + TABLE_HEADER_HEIGHT + toColumns.length * COLUMN_HEIGHT;

    // Determine which edge to connect from/to based on table positions
    // Calculate relative positions to determine best edge
    const fromCenterX = fromPos.x + TABLE_WIDTH / 2;
    const toCenterX = toPos.x + TABLE_WIDTH / 2;

    // Determine connection points: use left or right edge based on table positions
    let fromX: number;
    let toX: number;

    // If fromTable is to the left of toTable, connect from right edge of fromTable to left edge of toTable
    if (fromCenterX < toCenterX) {
      fromX = fromRight;
      toX = toLeft;
    } else {
      // If fromTable is to the right of toTable, connect from left edge of fromTable to right edge of toTable
      fromX = fromLeft;
      toX = toRight;
    }

    // If tables are vertically aligned, prefer top/bottom edges
    const verticalDistance = Math.abs(fromColumnY - toColumnY);
    const horizontalDistance = Math.abs(fromCenterX - toCenterX);

    // If vertical distance is much larger than horizontal, use top/bottom edges
    if (verticalDistance > horizontalDistance * 1.5) {
      if (fromColumnY < toColumnY) {
        // fromTable is above toTable
        fromX = fromCenterX;
        toX = toCenterX;
        const fromY = fromBottom;
        const toY = toTop;
        return { fromX, fromY, toX, toY };
      } else {
        // fromTable is below toTable
        fromX = fromCenterX;
        toX = toCenterX;
        const fromY = fromTop;
        const toY = toBottom;
        return { fromX, fromY, toX, toY };
      }
    }

    // Default: horizontal connection using column Y positions
    return {
      fromX,
      fromY: fromColumnY,
      toX,
      toY: toColumnY,
    };
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

  // Arrow head size
  const arrowSize = 8;

  // Debug: Log line coordinates (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📍 RelationshipLine ${relationship.getId()}:`, {
      from: `${fromTable.getName()} at (${lineCoords.fromX}, ${lineCoords.fromY})`,
      to: `${toTable.getName()} at (${lineCoords.toX}, ${lineCoords.toY})`,
      fromTablePos: fromPos,
      toTablePos: toPos,
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
        <marker
          id={`arrowhead-${relationship.getId()}`}
          markerWidth={arrowSize}
          markerHeight={arrowSize}
          refX={arrowSize}
          refY={arrowSize / 2}
          orient="auto-start-reverse"
        >
          <polygon points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`} fill="#666" />
        </marker>
      </defs>
      <line
        x1={lineCoords.fromX}
        y1={lineCoords.fromY}
        x2={lineCoords.toX}
        y2={lineCoords.toY}
        className={`relationship-line-${lineStyle}`}
        markerEnd={`url(#arrowhead-${relationship.getId()})`}
        strokeWidth={1}
        stroke="#666"
      />
      {relationship.isOptional() && (
        <circle
          cx={lineCoords.fromX}
          cy={lineCoords.fromY}
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
