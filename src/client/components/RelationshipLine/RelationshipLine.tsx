import React from 'react';
import { Relationship } from '../../core/relationship/Relationship';
import { Table } from '../../core/table/Table';
import './RelationshipLine.css';

interface RelationshipLineProps {
  relationship: Relationship;
  fromTable: Table;
  toTable: Table;
}

export const RelationshipLine: React.FC<RelationshipLineProps> = ({
  relationship,
  fromTable,
  toTable,
}) => {
  const fromPos = fromTable.getPosition();
  const toPos = toTable.getPosition();

  // Calculate line endpoints (center of tables)
  const fromX = fromPos.x + 100; // Approximate table center
  const fromY = fromPos.y + 50;
  const toX = toPos.x + 100;
  const toY = toPos.y + 50;

  // Determine relationship type styling
  const getLineStyle = () => {
    if (relationship.getType() === 'ONE_TO_ONE') {
      return 'one-to-one';
    }
    if (relationship.getType() === 'ONE_TO_MANY') {
      return 'one-to-many';
    }
    if (relationship.getType() === 'MANY_TO_MANY') {
      return 'many-to-many';
    }
    return 'default';
  };

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
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        className={`relationship-line-${getLineStyle()}`}
        markerEnd={`url(#arrowhead-${relationship.getId()})`}
        strokeWidth={2}
      />
      {relationship.isOptional() && (
        <circle
          cx={fromX}
          cy={fromY}
          r={4}
          fill="#666"
          className="optional-marker"
        />
      )}
    </svg>
  );
};

