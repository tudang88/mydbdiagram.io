import React, { memo, useMemo } from 'react';
import { Relationship } from '../../core/relationship/Relationship';
import { Table } from '../../core/table/Table';
import { countPathIntersections } from '../../core/diagram/routingIntersections';
import './RelationshipLine.css';

/** Match TableNode / FrontendExporter SVG: optional table description adds header height */
function getTableHeaderHeightForRouting(table: Table): number {
  const desc = table.getMetadata()?.description?.trim();
  return desc ? 72 : 40;
}

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
  const TABLE_EDGE_GAP_LEFT = 4; // Keep anchors outside left border
  const TABLE_EDGE_GAP_RIGHT = 6; // Keep anchors outside right border with tighter spacing

  // Calculate orthogonal path (right-angle routing) from column positions (like dbdiagram.io)
  // Include position keys in dependencies to ensure recalculation when table moves
  const pathData = useMemo(() => {
    // Fallback dimensions when DOM node isn't available yet
    const FALLBACK_TABLE_WIDTH = 200;
    const FALLBACK_TABLE_HEIGHT = 120;
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

    // Measure rendered table size to avoid line anchors being calculated with stale/fixed width.
    const getRenderedTableSize = (tableId: string) => {
      const tableElement = document.querySelector(
        `.table-node[data-table-id="${tableId}"]`
      ) as HTMLElement | null;
      if (!tableElement) {
        return { width: FALLBACK_TABLE_WIDTH, height: FALLBACK_TABLE_HEIGHT };
      }
      return {
        width: tableElement.offsetWidth || FALLBACK_TABLE_WIDTH,
        height: tableElement.offsetHeight || FALLBACK_TABLE_HEIGHT,
      };
    };
    const fromSize = getRenderedTableSize(fromTable.getId());
    const toSize = getRenderedTableSize(toTable.getId());

    // Find the index of the fromColumn and toColumn
    const fromColumnIndex = fromColumns.findIndex(col => col.id === fromColumnId);
    const toColumnIndex = toColumns.findIndex(col => col.id === toColumnId);

    // If columns not found, fallback to center of table
    if (fromColumnIndex === -1 || toColumnIndex === -1) {
      const fromHeight = fromSize.height;
      const toHeight = toSize.height;
      const fromX = fromPos.x + fromSize.width / 2;
      const fromY = fromPos.y + fromHeight / 2;
      const toX = toPos.x + toSize.width / 2;
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

    const fromHeaderH = getTableHeaderHeightForRouting(fromTable);
    const toHeaderH = getTableHeaderHeightForRouting(toTable);

    // Calculate Y position of the column (center of the column row)
    const fromColumnY =
      fromPos.y + fromHeaderH + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
    const toColumnY = toPos.y + toHeaderH + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

    // Calculate table boundaries
    const fromLeft = fromPos.x;
    const fromRight = fromPos.x + fromSize.width;
    const toLeft = toPos.x;
    const toRight = toPos.x + toSize.width;

    // Determine which edge to connect from/to based on table positions
    const fromCenterX = fromPos.x + fromSize.width / 2;
    const toCenterX = toPos.x + toSize.width / 2;

    // Determine marker offsets based on relationship type
    const relationshipType = relationship.getType();
    const markerOffsets = (() => {
      if (relationshipType === 'ONE_TO_ONE') {
        return { start: MARKER_ONE_OFFSET, end: MARKER_ONE_OFFSET };
      }
      if (relationshipType === 'ONE_TO_MANY') {
        return { start: MARKER_MANY_OFFSET, end: MARKER_ONE_OFFSET };
      }
      if (relationshipType === 'MANY_TO_MANY') {
        return { start: MARKER_MANY_OFFSET, end: MARKER_MANY_OFFSET };
      }
      // Default fallback: from = MANY, to = ONE
      return { start: MARKER_MANY_OFFSET, end: MARKER_ONE_OFFSET };
    })();

    const getMarkerOffset = (side: 'start' | 'end') => markerOffsets[side];

    type Direction = 'left' | 'right';
    type Candidate = {
      path: string;
      pathStartX: number;
      pathStartY: number;
      pathEndX: number;
      pathEndY: number;
      markerStartX: number;
      markerStartY: number;
      markerEndX: number;
      markerEndY: number;
      startDirection: Direction;
      endDirection: Direction;
      score: number;
    };

    const getSegmentsForCandidate = (
      startX: number,
      startY: number,
      midX: number,
      endX: number,
      endY: number
    ): Array<{ x1: number; y1: number; x2: number; y2: number }> => [
      { x1: startX, y1: startY, x2: midX, y2: startY },
      { x1: midX, y1: startY, x2: midX, y2: endY },
      { x1: midX, y1: endY, x2: endX, y2: endY },
    ];

    const getObstacleRects = (): Array<{
      left: number;
      right: number;
      top: number;
      bottom: number;
    }> => {
      if (typeof document === 'undefined') return [];
      const nodes = Array.from(
        document.querySelectorAll('.table-node[data-table-id]')
      ) as HTMLElement[];
      return nodes
        .filter(el => {
          const id = el.getAttribute('data-table-id');
          return id && id !== fromTable.getId() && id !== toTable.getId();
        })
        .map(el => ({
          left: el.offsetLeft,
          right: el.offsetLeft + (el.offsetWidth || FALLBACK_TABLE_WIDTH),
          top: el.offsetTop,
          bottom: el.offsetTop + (el.offsetHeight || FALLBACK_TABLE_HEIGHT),
        }));
    };

    const obstacleRects = getObstacleRects();

    const scoreCandidate = (
      segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
    ): number => countPathIntersections(segments, obstacleRects);

    const buildCandidate = (forceDirection?: Direction): Candidate => {
      const leftToRight =
        forceDirection === 'right' || (forceDirection === undefined && fromCenterX < toCenterX);

      if (leftToRight) {
        const startX = fromRight + TABLE_EDGE_GAP_RIGHT;
        const endX = toLeft - TABLE_EDGE_GAP_LEFT;
        const midX = startX + HORIZONTAL_OFFSET;
        const segments = getSegmentsForCandidate(startX, fromColumnY, midX, endX, toColumnY);
        return {
          path: `M ${startX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${endX} ${toColumnY}`,
          pathStartX: startX,
          pathStartY: fromColumnY,
          pathEndX: endX,
          pathEndY: toColumnY,
          markerStartX: startX + getMarkerOffset('start'),
          markerStartY: fromColumnY,
          markerEndX: endX - getMarkerOffset('end'),
          markerEndY: toColumnY,
          startDirection: 'right',
          endDirection: 'left',
          score: scoreCandidate(segments),
        };
      }

      const startX = fromLeft - TABLE_EDGE_GAP_LEFT;
      const endX = toRight + TABLE_EDGE_GAP_RIGHT;
      const midX = startX - HORIZONTAL_OFFSET;
      const segments = getSegmentsForCandidate(startX, fromColumnY, midX, endX, toColumnY);
      return {
        path: `M ${startX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${endX} ${toColumnY}`,
        pathStartX: startX,
        pathStartY: fromColumnY,
        pathEndX: endX,
        pathEndY: toColumnY,
        markerStartX: startX - getMarkerOffset('start'),
        markerStartY: fromColumnY,
        markerEndX: endX + getMarkerOffset('end'),
        markerEndY: toColumnY,
        startDirection: 'left',
        endDirection: 'right',
        score: scoreCandidate(segments),
      };
    };

    const defaultDirection: Direction = fromCenterX < toCenterX ? 'right' : 'left';
    const oppositeDirection: Direction = defaultDirection === 'right' ? 'left' : 'right';

    const defaultCandidate = buildCandidate(defaultDirection);
    const flippedCandidate = buildCandidate(oppositeDirection);

    return defaultCandidate.score <= flippedCandidate.score ? defaultCandidate : flippedCandidate;
  }, [
    fromX,
    fromY,
    toX,
    toY,
    fromTable,
    toTable,
    relationship,
    fromTable.getMetadata()?.description,
    toTable.getMetadata()?.description,
  ]);

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
        stroke="#4b5563"
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
        <g key={`many-${x}-${y}`} stroke="#4b5563" strokeWidth="1.5" fill="none">
          {/* Top diagonal line */}
          <line x1={x} y1={y - halfSize} x2={x + arrowSize} y2={y} />
          {/* Bottom diagonal line */}
          <line x1={x} y1={y + halfSize} x2={x + arrowSize} y2={y} />
        </g>
      );
    } else {
      // Left-pointing arrow: two lines forming <
      return (
        <g key={`many-${x}-${y}`} stroke="#4b5563" strokeWidth="1.5" fill="none">
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
    console.log(
      `📍 RelationshipLine ${relationship.getId()} (${fromTable.getName()} -> ${toTable.getName()}):`,
      {
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
      }
    );
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
        stroke="#4b5563"
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
          fill="#4b5563"
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
