import React, { useMemo, memo } from 'react';
import { Diagram } from '../../core/diagram/Diagram';
import { TableNode } from '../TableNode/TableNode';
import { RelationshipLine } from '../RelationshipLine/RelationshipLine';
import { Viewport, isInViewport, getExpandedViewport, Bounds } from '../../utils/viewport';
import { UIState } from '../../state/store/uiStore';

// Approximate table dimensions for viewport calculations
const TABLE_WIDTH = 200;
const TABLE_HEADER_HEIGHT = 40;
const COLUMN_HEIGHT = 30;

interface DiagramContentProps {
  diagram: Diagram;
  uiState: UIState;
  viewport: Viewport;
  onTableSelect: (tableId: string) => void;
  onTableDoubleClick: (tableId: string) => void;
  onTableDragStart: (tableId: string, e: React.MouseEvent) => void;
  onTableDrag: (tableId: string, e: React.MouseEvent) => void;
  onTableDragEnd: () => void;
}

/**
 * Optimized diagram content component with viewport-based rendering
 * Only renders tables and relationships visible in the viewport
 */
const DiagramContentComponent: React.FC<DiagramContentProps> = ({
  diagram,
  uiState,
  viewport,
  onTableSelect,
  onTableDoubleClick,
  onTableDragStart,
  onTableDrag,
  onTableDragEnd,
}) => {
  // Get expanded viewport for pre-rendering (with padding)
  const expandedViewport = useMemo(() => getExpandedViewport(viewport, 200), [viewport]);

  // Memoize tables and relationships
  const tables = useMemo(() => diagram.getAllTables(), [diagram]);
  const relationships = useMemo(() => diagram.getAllRelationships(), [diagram]);

  // Filter tables visible in viewport (with padding for smooth scrolling)
  const visibleTables = useMemo(() => {
    return tables.filter(table => {
      const pos = table.getPosition();
      const columnCount = table.getAllColumns().length;
      const bounds: Bounds = {
        x: pos.x,
        y: pos.y,
        width: TABLE_WIDTH,
        height: TABLE_HEADER_HEIGHT + columnCount * COLUMN_HEIGHT,
      };
      return isInViewport(bounds, expandedViewport);
    });
  }, [tables, expandedViewport]);

  // Filter relationships - show all relationships if both tables exist
  // Temporarily disable viewport filtering for relationships to debug
  const visibleRelationships = useMemo(() => {
    return relationships.filter(relationship => {
      const fromTable = diagram.getTable(relationship.getFromTableId());
      const toTable = diagram.getTable(relationship.getToTableId());
      if (!fromTable || !toTable) {
        console.warn('⚠️ Relationship missing table:', {
          relId: relationship.getId(),
          fromTableId: relationship.getFromTableId(),
          toTableId: relationship.getToTableId(),
          fromTableExists: !!fromTable,
          toTableExists: !!toTable,
        });
        return false;
      }

      // For now, show all relationships if both tables exist
      // TODO: Re-enable viewport filtering after debugging
      return true;

      // Original viewport filtering code (commented out for debugging)
      // const fromPos = fromTable.getPosition();
      // const toPos = toTable.getPosition();
      // const fromBounds: Bounds = {
      //   x: fromPos.x,
      //   y: fromPos.y,
      //   width: TABLE_WIDTH,
      //   height: TABLE_HEADER_HEIGHT + fromTable.getAllColumns().length * COLUMN_HEIGHT,
      // };
      // const toBounds: Bounds = {
      //   x: toPos.x,
      //   y: toPos.y,
      //   width: TABLE_WIDTH,
      //   height: TABLE_HEADER_HEIGHT + toTable.getAllColumns().length * COLUMN_HEIGHT,
      // };
      // const relationshipViewport = getExpandedViewport(viewport, 500);
      // return isInViewport(fromBounds, relationshipViewport) || isInViewport(toBounds, relationshipViewport);
    });
  }, [relationships, diagram]);

  // Debug: Log relationships (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 DiagramContent - Total relationships:', relationships.length);
    console.log('🔗 DiagramContent - Visible relationships:', visibleRelationships.length);
    visibleRelationships.forEach((rel, idx) => {
      const fromTable = diagram.getTable(rel.getFromTableId());
      const toTable = diagram.getTable(rel.getToTableId());
      if (fromTable && toTable) {
        const fromPos = fromTable.getPosition();
        const toPos = toTable.getPosition();
        console.log(
          `  Relationship ${idx + 1}: ${fromTable.getName()}(${fromPos.x},${fromPos.y}) -> ${toTable.getName()}(${toPos.x},${toPos.y})`
        );
      }
    });
  }

  return (
    <div className="diagram-content">
      {/* Render relationships first (behind tables) */}
      {visibleRelationships.map(relationship => {
        const fromTable = diagram.getTable(relationship.getFromTableId());
        const toTable = diagram.getTable(relationship.getToTableId());
        if (!fromTable || !toTable) {
          console.warn('⚠️ Missing table for relationship:', relationship.getId());
          return null;
        }

        return (
          <RelationshipLine
            key={relationship.getId()}
            relationship={relationship}
            fromTable={fromTable}
            toTable={toTable}
          />
        );
      })}

      {/* Render only visible tables */}
      {visibleTables.map(table => (
        <TableNode
          key={table.getId()}
          table={table}
          isSelected={uiState.selectedTableId === table.getId()}
          onSelect={onTableSelect}
          onDoubleClick={onTableDoubleClick}
          onDragStart={onTableDragStart}
          onDrag={onTableDrag}
          onDragEnd={onTableDragEnd}
        />
      ))}
    </div>
  );
};

// Memoize DiagramContent to prevent unnecessary re-renders
export const DiagramContent = memo(DiagramContentComponent, (prevProps, nextProps) => {
  // Only re-render if diagram, viewport, or selection changes
  return (
    prevProps.diagram === nextProps.diagram &&
    prevProps.uiState.selectedTableId === nextProps.uiState.selectedTableId &&
    prevProps.viewport.x === nextProps.viewport.x &&
    prevProps.viewport.y === nextProps.viewport.y &&
    prevProps.viewport.zoom === nextProps.viewport.zoom &&
    prevProps.viewport.width === nextProps.viewport.width &&
    prevProps.viewport.height === nextProps.viewport.height
  );
});
