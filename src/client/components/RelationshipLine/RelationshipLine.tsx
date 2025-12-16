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

  // Calculate line endpoints (center of tables) - memoized
  const lineCoords = useMemo(() => {
    const fromX = fromPos.x + 100; // Approximate table center
    const fromY = fromPos.y + 50;
    const toX = toPos.x + 100;
    const toY = toPos.y + 50;
    return { fromX, fromY, toX, toY };
  }, [fromPos, toPos]);

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
        zIndex: 0,
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
          <polygon
            points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
            fill="#666"
          />
        </marker>
      </defs>
      <line
        x1={lineCoords.fromX}
        y1={lineCoords.fromY}
        x2={lineCoords.toX}
        y2={lineCoords.toY}
        className={`relationship-line-${lineStyle}`}
        markerEnd={`url(#arrowhead-${relationship.getId()})`}
        strokeWidth={2}
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

