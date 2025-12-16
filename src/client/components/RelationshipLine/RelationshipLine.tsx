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

  // Calculate line endpoints (edge to edge) - find shortest path
  const lineCoords = useMemo(() => {
    // Get table dimensions - use actual table dimensions
    const TABLE_WIDTH = 200; // Standard table width
    const TABLE_HEADER_HEIGHT = 40;
    const COLUMN_HEIGHT = 30;

    const fromColumns = fromTable.getAllColumns();
    const toColumns = toTable.getAllColumns();

    const fromHeight = TABLE_HEADER_HEIGHT + fromColumns.length * COLUMN_HEIGHT;
    const toHeight = TABLE_HEADER_HEIGHT + toColumns.length * COLUMN_HEIGHT;

    // Define table boundaries
    const fromLeft = fromPos.x;
    const fromRight = fromPos.x + TABLE_WIDTH;
    const fromTop = fromPos.y;
    const fromBottom = fromPos.y + fromHeight;

    const toLeft = toPos.x;
    const toRight = toPos.x + TABLE_WIDTH;
    const toTop = toPos.y;
    const toBottom = toPos.y + toHeight;

    // Calculate center points for reference
    const fromCenterX = fromPos.x + TABLE_WIDTH / 2;
    const fromCenterY = fromPos.y + fromHeight / 2;
    const toCenterX = toPos.x + TABLE_WIDTH / 2;
    const toCenterY = toPos.y + toHeight / 2;

    // Helper function to calculate distance between two points
    const distance = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Helper function to find closest point on a line segment to a point
    const closestPointOnSegment = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length2 = dx * dx + dy * dy;

      if (length2 === 0) {
        return { x: x1, y: y1 };
      }

      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length2));
      return { x: x1 + t * dx, y: y1 + t * dy };
    };

    // Generate candidate points on fromTable edges
    const fromCandidates: Array<{ x: number; y: number }> = [];

    // Left edge
    const fromLeftPoint = closestPointOnSegment(
      toCenterX,
      toCenterY,
      fromLeft,
      fromTop,
      fromLeft,
      fromBottom
    );
    fromCandidates.push(fromLeftPoint);

    // Right edge
    const fromRightPoint = closestPointOnSegment(
      toCenterX,
      toCenterY,
      fromRight,
      fromTop,
      fromRight,
      fromBottom
    );
    fromCandidates.push(fromRightPoint);

    // Top edge
    const fromTopPoint = closestPointOnSegment(
      toCenterX,
      toCenterY,
      fromLeft,
      fromTop,
      fromRight,
      fromTop
    );
    fromCandidates.push(fromTopPoint);

    // Bottom edge
    const fromBottomPoint = closestPointOnSegment(
      toCenterX,
      toCenterY,
      fromLeft,
      fromBottom,
      fromRight,
      fromBottom
    );
    fromCandidates.push(fromBottomPoint);

    // Generate candidate points on toTable edges
    const toCandidates: Array<{ x: number; y: number }> = [];

    // Left edge
    const toLeftPoint = closestPointOnSegment(
      fromCenterX,
      fromCenterY,
      toLeft,
      toTop,
      toLeft,
      toBottom
    );
    toCandidates.push(toLeftPoint);

    // Right edge
    const toRightPoint = closestPointOnSegment(
      fromCenterX,
      fromCenterY,
      toRight,
      toTop,
      toRight,
      toBottom
    );
    toCandidates.push(toRightPoint);

    // Top edge
    const toTopPoint = closestPointOnSegment(
      fromCenterX,
      fromCenterY,
      toLeft,
      toTop,
      toRight,
      toTop
    );
    toCandidates.push(toTopPoint);

    // Bottom edge
    const toBottomPoint = closestPointOnSegment(
      fromCenterX,
      fromCenterY,
      toLeft,
      toBottom,
      toRight,
      toBottom
    );
    toCandidates.push(toBottomPoint);

    // Find the shortest path by trying all combinations
    let shortestDistance = Infinity;
    let bestFrom = { x: fromCenterX, y: fromCenterY };
    let bestTo = { x: toCenterX, y: toCenterY };

    for (const fromPoint of fromCandidates) {
      for (const toPoint of toCandidates) {
        const dist = distance(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
        if (dist < shortestDistance) {
          shortestDistance = dist;
          bestFrom = fromPoint;
          bestTo = toPoint;
        }
      }
    }

    return { fromX: bestFrom.x, fromY: bestFrom.y, toX: bestTo.x, toY: bestTo.y };
  }, [fromPos, toPos, fromTable, toTable]);

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
