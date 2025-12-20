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
  // Get positions - recalculate when table positions change
  // Use getPosition() directly to ensure we always get latest position
  const fromPos = fromTable.getPosition();
  const toPos = toTable.getPosition();
  
  // Extract position values for dependency tracking
  const fromX = fromPos.x;
  const fromY = fromPos.y;
  const toX = toPos.x;
  const toY = toPos.y;

  // Constants for marker offsets (defined outside useMemo for debug access)
  const MARKER_ONE_OFFSET = 10; // Distance from table edge to ONE marker (rời ra cho dễ đọc)
  const MARKER_MANY_OFFSET = 1; // Distance from table edge to MANY marker (sát với cạnh table)
  const MARKER_SIZE = 12; // Approximate marker size (for calculation)

  // Calculate orthogonal path (right-angle routing) from column positions (like dbdiagram.io)
  // Include position keys in dependencies to ensure recalculation when table moves
  const pathData = useMemo(() => {
    // Get table dimensions - use actual table dimensions
    const TABLE_WIDTH = 200; // Standard table width
    const TABLE_HEADER_HEIGHT = 40;
    const COLUMN_HEIGHT = 30;
    // Ensure HORIZONTAL_OFFSET is large enough to prevent line from overlapping table
    // Minimum 40px to ensure line doesn't go through table even with markers
    const HORIZONTAL_OFFSET = Math.max(40, MARKER_ONE_OFFSET + MARKER_SIZE + 15);

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
        pathStartX: fromX,
        pathStartY: fromY,
        pathEndX: toX,
        pathEndY: toY,
        markerStartX: fromX,
        markerStartY: fromY,
        markerEndX: toX,
        markerEndY: toY,
        startDirection: 'right' as const,
        endDirection: 'left' as const,
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

    // Determine marker offsets based on relationship type
    const relationshipType = relationship.getType();
    
    // Check if table is the first table (table-1 - first table ID from parser)
    const isFirstTable = (table: typeof fromTable) => {
      const tableId = table.getId();
      return tableId === 'table-1';
    };
    
    const isFromTableFirst = isFirstTable(fromTable);
    const isToTableFirst = isFirstTable(toTable);
    
    const getMarkerOffset = (isMany: boolean, isFirstTable: boolean) => {
      if (isMany) {
        return MARKER_MANY_OFFSET;
      }
      // Increase offset for ONE marker on first table to prevent overlap
      // Add extra offset to match spacing of other tables
      return isFirstTable ? MARKER_ONE_OFFSET + 10 : MARKER_ONE_OFFSET;
    };

    // If fromTable is to the left of toTable
    if (fromCenterX < toCenterX) {
      fromX = fromRight;
      toX = toLeft;
      // Create orthogonal path: starts at table edge, goes horizontal, vertical, horizontal, ends at table edge
      const midX = fromX + HORIZONTAL_OFFSET;

      // Determine which side is MANY based on relationship type and column constraints
      // In ONE_TO_MANY: table with primary key = ONE, table with foreign key = MANY
      let fromIsMany: boolean;
      let toIsMany: boolean;
      
      if (relationshipType === 'MANY_TO_MANY') {
        fromIsMany = true;
        toIsMany = true;
      } else if (relationshipType === 'ONE_TO_ONE') {
        fromIsMany = false;
        toIsMany = false;
      } else {
        // ONE_TO_MANY: Check which column has primary key vs foreign key
        const fromColumn = fromTable.getColumn(fromColumnId);
        const toColumn = toTable.getColumn(toColumnId);
        const fromColumnIsPk = fromColumn?.constraints.some(c => c.type === 'PRIMARY_KEY') ?? false;
        const toColumnIsPk = toColumn?.constraints.some(c => c.type === 'PRIMARY_KEY') ?? false;
        const fromColumnIsFk = fromColumn?.constraints.some(c => c.type === 'FOREIGN_KEY') ?? false;
        const toColumnIsFk = toColumn?.constraints.some(c => c.type === 'FOREIGN_KEY') ?? false;
        
        // Table with primary key = ONE (false), table with foreign key = MANY (true)
        // If column has primary key, it's ONE side; if it has foreign key, it's MANY side
        fromIsMany = fromColumnIsFk || (fromColumnIsPk ? false : true); // Default to MANY if unclear
        toIsMany = toColumnIsFk || (toColumnIsPk ? false : true); // Default to MANY if unclear
      }

      return {
        path: `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`,
        // Path endpoints (where line actually ends - at table edges)
        pathStartX: fromX,
        pathStartY: fromColumnY,
        pathEndX: toX,
        pathEndY: toColumnY,
        // Marker positions (outside table edges, adjusted based on marker type)
        markerStartX: fromX + getMarkerOffset(fromIsMany, isFromTableFirst),
        markerStartY: fromColumnY,
        markerEndX: toX - getMarkerOffset(toIsMany, isToTableFirst),
        markerEndY: toColumnY,
        // Direction for markers (needed to draw them correctly)
        startDirection: 'right' as const, // Marker points to the right (away from table)
        endDirection: 'left' as const, // Marker points to the left (away from table)
      };
    } else {
      // If fromTable is to the right of toTable
      fromX = fromLeft;
      toX = toRight;
      // Create orthogonal path: starts at table edge, goes horizontal, vertical, horizontal, ends at table edge
      const midX = fromX - HORIZONTAL_OFFSET;

      // Determine which side is MANY based on relationship type and column constraints
      // In ONE_TO_MANY: table with primary key = ONE, table with foreign key = MANY
      let fromIsMany: boolean;
      let toIsMany: boolean;
      
      if (relationshipType === 'MANY_TO_MANY') {
        fromIsMany = true;
        toIsMany = true;
      } else if (relationshipType === 'ONE_TO_ONE') {
        fromIsMany = false;
        toIsMany = false;
      } else {
        // ONE_TO_MANY: Check which column has primary key vs foreign key
        const fromColumn = fromTable.getColumn(fromColumnId);
        const toColumn = toTable.getColumn(toColumnId);
        const fromColumnIsPk = fromColumn?.constraints.some(c => c.type === 'PRIMARY_KEY') ?? false;
        const toColumnIsPk = toColumn?.constraints.some(c => c.type === 'PRIMARY_KEY') ?? false;
        const fromColumnIsFk = fromColumn?.constraints.some(c => c.type === 'FOREIGN_KEY') ?? false;
        const toColumnIsFk = toColumn?.constraints.some(c => c.type === 'FOREIGN_KEY') ?? false;
        
        // Table with primary key = ONE (false), table with foreign key = MANY (true)
        // If column has primary key, it's ONE side; if it has foreign key, it's MANY side
        fromIsMany = fromColumnIsFk || (fromColumnIsPk ? false : true); // Default to MANY if unclear
        toIsMany = toColumnIsFk || (toColumnIsPk ? false : true); // Default to MANY if unclear
      }

      return {
        path: `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`,
        // Path endpoints (where line actually ends - at table edges)
        pathStartX: fromX,
        pathStartY: fromColumnY,
        pathEndX: toX,
        pathEndY: toColumnY,
        // Marker positions (outside table edges, adjusted based on marker type)
        markerStartX: fromX - getMarkerOffset(fromIsMany, isFromTableFirst),
        markerStartY: fromColumnY,
        markerEndX: toX + getMarkerOffset(toIsMany, isToTableFirst),
        markerEndY: toColumnY,
        // Direction for markers
        startDirection: 'left' as const, // Marker points to the left (away from table)
        endDirection: 'right' as const, // Marker points to the right (away from table)
      };
    }
  }, [fromX, fromY, toX, toY, fromTable, toTable, relationship]);

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

  // Marker sizes - increased for better visibility
  const markerSize = 12;
  const relationshipType = relationship.getType();

  // Helper function to render "one" marker (single vertical line)
  const renderOneMarker = (x: number, y: number, _direction: 'left' | 'right') => {
    const lineLength = markerSize * 1.5;
    // Vertical line perpendicular to the relationship direction
    return (
      <line
        key={`one-${x}-${y}`}
        x1={x}
        y1={y - lineLength / 2}
        x2={x}
        y2={y + lineLength / 2}
        stroke="#666"
        strokeWidth="1.5"
      />
    );
  };

  // Helper function to render "many" marker (> symbol - two diagonal lines forming V shape, no vertical line)
  const renderManyMarker = (x: number, y: number, direction: 'left' | 'right') => {
    const arrowSize = markerSize;
    const halfSize = arrowSize / 2;
    // Draw > symbol using two diagonal lines (no vertical line) - standard ER diagram notation
    if (direction === 'right') {
      // Right-pointing arrow: two lines forming >
      return (
        <g key={`many-${x}-${y}`} stroke="#666" strokeWidth="1.5" fill="none">
          {/* Top diagonal line */}
          <line x1={x} y1={y - halfSize} x2={x + arrowSize} y2={y} />
          {/* Bottom diagonal line */}
          <line x1={x} y1={y + halfSize} x2={x + arrowSize} y2={y} />
        </g>
      );
    } else {
      // Left-pointing arrow: two lines forming <
      return (
        <g key={`many-${x}-${y}`} stroke="#666" strokeWidth="1.5" fill="none">
          {/* Top diagonal line */}
          <line x1={x} y1={y - halfSize} x2={x - arrowSize} y2={y} />
          {/* Bottom diagonal line */}
          <line x1={x} y1={y + halfSize} x2={x - arrowSize} y2={y} />
        </g>
      );
    }
  };

  // Debug: Log path data (only in development) - temporarily enable to debug marker position
  if (process.env.NODE_ENV === 'development' && fromTable.getName() === 'users') {
    const relationshipType = relationship.getType();
    const fromIsMany = relationshipType === 'MANY_TO_MANY' || relationshipType === 'ONE_TO_MANY';
    const toIsMany = relationshipType === 'MANY_TO_MANY';
    console.log(`📍 RelationshipLine ${relationship.getId()} (${fromTable.getName()} -> ${toTable.getName()}):`, {
      relationshipType,
      fromTablePos: `${fromPos.x}, ${fromPos.y}`,
      toTablePos: `${toPos.x}, ${toPos.y}`,
      pathStart: `(${pathData.pathStartX}, ${pathData.pathStartY})`,
      pathEnd: `(${pathData.pathEndX}, ${pathData.pathEndY})`,
      markerStart: `(${pathData.markerStartX}, ${pathData.markerStartY}) - isMany: ${fromIsMany}`,
      markerEnd: `(${pathData.markerEndX}, ${pathData.markerEndY}) - isMany: ${toIsMany}`,
      offsets: {
        start: fromIsMany ? MARKER_MANY_OFFSET : MARKER_ONE_OFFSET,
        end: toIsMany ? MARKER_MANY_OFFSET : MARKER_ONE_OFFSET,
      },
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
        zIndex: 0, // Behind tables
        overflow: 'visible',
      }}
    >
      {/* Relationship line path */}
      <path
        d={pathData.path}
        className={`relationship-line-${lineStyle}`}
        strokeWidth={1}
        stroke="#666"
        fill="none"
      />
      {/* Markers rendered separately for flexible positioning */}
      {relationshipType === 'ONE_TO_ONE' && (
        <>
          {renderOneMarker(pathData.markerStartX, pathData.markerStartY, pathData.startDirection)}
          {renderOneMarker(pathData.markerEndX, pathData.markerEndY, pathData.endDirection)}
        </>
      )}
      {relationshipType === 'ONE_TO_MANY' && (
        <>
          {/* fromTable has foreign key = MANY side, toTable has primary key = ONE side */}
          {renderManyMarker(pathData.markerStartX, pathData.markerStartY, pathData.startDirection)}
          {renderOneMarker(pathData.markerEndX, pathData.markerEndY, pathData.endDirection)}
        </>
      )}
      {relationshipType === 'MANY_TO_MANY' && (
        <>
          {renderManyMarker(pathData.markerStartX, pathData.markerStartY, pathData.startDirection)}
          {renderManyMarker(pathData.markerEndX, pathData.markerEndY, pathData.endDirection)}
        </>
      )}
      {/* Default case - show markers for unknown types */}
      {!['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'].includes(relationshipType) && (
        <>
          {/* Default: fromTable = MANY, toTable = ONE (typical foreign key relationship) */}
          {renderManyMarker(pathData.markerStartX, pathData.markerStartY, pathData.startDirection)}
          {renderOneMarker(pathData.markerEndX, pathData.markerEndY, pathData.endDirection)}
        </>
      )}
      {relationship.isOptional() && (
        <circle
          cx={pathData.pathStartX}
          cy={pathData.pathStartY}
          r={4}
          fill="#666"
          className="optional-marker"
        />
      )}
    </svg>
  );
};

// Memoize RelationshipLine to prevent unnecessary re-renders
// But always re-render when table positions change
export const RelationshipLine = memo(RelationshipLineComponent, (prevProps, nextProps) => {
  // Always re-render if relationship ID or type changes
  if (
    prevProps.relationship.getId() !== nextProps.relationship.getId() ||
    prevProps.relationship.getType() !== nextProps.relationship.getType()
  ) {
    return false; // Props changed, need to re-render
  }

  // Check if table positions changed
  const prevFromPos = prevProps.fromTable.getPosition();
  const nextFromPos = nextProps.fromTable.getPosition();
  const prevToPos = prevProps.toTable.getPosition();
  const nextToPos = nextProps.toTable.getPosition();

  const positionsChanged =
    prevFromPos.x !== nextFromPos.x ||
    prevFromPos.y !== nextFromPos.y ||
    prevToPos.x !== nextToPos.x ||
    prevToPos.y !== nextToPos.y;

  // If positions changed, need to re-render
  if (positionsChanged) {
    return false;
  }

  // Props are the same, skip re-render
  return true;
});
