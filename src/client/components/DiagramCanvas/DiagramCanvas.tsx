import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DiagramStore } from '../../state/store/diagramStore';
import { UIStore } from '../../state/store/uiStore';
import { Diagram } from '../../core/diagram/Diagram';
import { TableNode } from '../TableNode/TableNode';
import { RelationshipLine } from '../RelationshipLine/RelationshipLine';
import './DiagramCanvas.css';

interface DiagramCanvasProps {
  diagramStore: DiagramStore;
  uiStore: UIStore;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({ diagramStore, uiStore }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [uiState, setUIState] = useState(uiStore.getState());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

  // Subscribe to diagram changes
  useEffect(() => {
    const unsubscribe = diagramStore.subscribe((currentDiagram) => {
      setDiagram(currentDiagram);
    });
    return unsubscribe;
  }, [diagramStore]);

  // Subscribe to UI state changes
  useEffect(() => {
    const unsubscribe = uiStore.subscribe((state) => {
      setUIState(state);
    });
    return unsubscribe;
  }, [uiStore]);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(3, uiState.zoomLevel + delta));
      uiStore.setState({ zoomLevel: newZoom });
    },
    [uiState.zoomLevel, uiStore]
  );

  // Handle pan start (only if not clicking on a table)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 0 && (e.target as HTMLElement).closest('.table-node') === null) {
        // Left mouse button and not clicking on table
        setIsDragging(true);
        setDragStart({
          x: e.clientX - uiState.panOffset.x,
          y: e.clientY - uiState.panOffset.y,
        });
      }
    },
    [uiState.panOffset]
  );

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging && !draggedTableId) {
        uiStore.setState({
          panOffset: {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          },
        });
      }
    },
    [isDragging, dragStart, draggedTableId, uiStore]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedTableId(null);
  }, []);

  // Handle table selection
  const handleTableSelect = useCallback(
    (tableId: string) => {
      uiStore.setState({ selectedTableId: tableId });
    },
    [uiStore]
  );

  // Handle table drag start
  const handleTableDragStart = useCallback((tableId: string, e: React.MouseEvent) => {
    setDraggedTableId(tableId);
    setIsDragging(false);
  }, []);

  // Handle table drag
  const handleTableDrag = useCallback(
    (tableId: string, e: React.MouseEvent) => {
      if (!diagram) return;

      const table = diagram.getTable(tableId);
      if (!table) return;

      const currentPos = table.getPosition();
      const deltaX = e.movementX / uiState.zoomLevel;
      const deltaY = e.movementY / uiState.zoomLevel;

      table.moveTo({
        x: currentPos.x + deltaX,
        y: currentPos.y + deltaY,
      });
    },
    [diagram, uiState.zoomLevel]
  );

  // Handle table drag end
  const handleTableDragEnd = useCallback(() => {
    setDraggedTableId(null);
  }, []);

  // Render grid
  const renderGrid = () => {
    if (!uiState.showGrid) return null;

    const gridSize = 20;
    const { x: panX, y: panY } = uiState.panOffset;
    const zoom = uiState.zoomLevel;

    const lines = [];
    const startX = Math.floor(panX / (gridSize * zoom)) * gridSize;
    const startY = Math.floor(panY / (gridSize * zoom)) * gridSize;
    const endX = startX + window.innerWidth / zoom + gridSize;
    const endY = startY + window.innerHeight / zoom + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={startY}
          x2={x}
          y2={endY}
          stroke="#e0e0e0"
          strokeWidth={1 / zoom}
        />
      );
    }

    for (let y = startY; y < endY; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={startX}
          y1={y}
          x2={endX}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth={1 / zoom}
        />
      );
    }

    return (
      <svg className="canvas-grid" style={{ pointerEvents: 'none' }}>
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>{lines}</g>
      </svg>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="diagram-canvas"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {renderGrid()}
      <div
        className="canvas-content"
        style={{
          transform: `translate(${uiState.panOffset.x}px, ${uiState.panOffset.y}px) scale(${uiState.zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {diagram && (
          <div className="diagram-content">
            {/* Render relationships first (behind tables) */}
            {diagram.getAllRelationships().map((relationship) => {
              const fromTable = diagram.getTable(relationship.getFromTableId());
              const toTable = diagram.getTable(relationship.getToTableId());
              if (!fromTable || !toTable) return null;

              return (
                <RelationshipLine
                  key={relationship.getId()}
                  relationship={relationship}
                  fromTable={fromTable}
                  toTable={toTable}
                />
              );
            })}

            {/* Render tables */}
            {diagram.getAllTables().map((table) => (
              <TableNode
                key={table.getId()}
                table={table}
                isSelected={uiState.selectedTableId === table.getId()}
                onSelect={handleTableSelect}
                onDragStart={handleTableDragStart}
                onDrag={handleTableDrag}
                onDragEnd={handleTableDragEnd}
              />
            ))}
          </div>
        )}
        {!diagram && (
          <div className="canvas-empty">
            <p>No diagram loaded. Create a new diagram or load an existing one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

