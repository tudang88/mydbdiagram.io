import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DiagramStore } from '../../state/store/diagramStore';
import { UIStore } from '../../state/store/uiStore';
import { Diagram } from '../../core/diagram/Diagram';
import { ContextMenu, ContextMenuItem } from '../ContextMenu/ContextMenu';
import { DiagramContent } from './DiagramContent';
import { throttle } from '../../utils/debounce';
import './DiagramCanvas.css';

interface DiagramCanvasProps {
  diagramStore: DiagramStore;
  uiStore: UIStore;
  onTableDoubleClick?: (tableId: string) => void;
  onColumnDoubleClick?: (tableId: string, columnId: string) => void;
  onRelationshipCreate?: (fromTableId: string, toTableId?: string) => void;
  onTableDelete?: (tableId: string) => void;
  onTableAdd?: () => void;
}

// Note: onColumnDoubleClick is reserved for future column editing feature

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  diagramStore,
  uiStore,
  onTableDoubleClick,
  onColumnDoubleClick: _onColumnDoubleClick, // Reserved for future column editing
  onRelationshipCreate,
  onTableDelete,
  onTableAdd,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [uiState, setUIState] = useState(uiStore.getState());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    items: ContextMenuItem[];
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });

  // Subscribe to diagram changes
  useEffect(() => {
    const unsubscribe = diagramStore.subscribe(currentDiagram => {
      setDiagram(currentDiagram);
    });
    return unsubscribe;
  }, [diagramStore]);

  // Subscribe to UI state changes
  useEffect(() => {
    const unsubscribe = uiStore.subscribe(state => {
      setUIState(state);
    });
    return unsubscribe;
  }, [uiStore]);

  // Throttled wheel zoom handler for better performance
  const handleWheelThrottled = useMemo(() => {
    const wheelHandler = (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const currentZoom = uiStore.getState().zoomLevel;
      const newZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
      uiStore.setState({ zoomLevel: newZoom });
    };
    return throttle(wheelHandler as (...args: unknown[]) => void, 16) as (
      e: React.WheelEvent<HTMLDivElement>
    ) => void; // ~60fps
  }, [uiStore]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      handleWheelThrottled(e);
    },
    [handleWheelThrottled]
  );

  // Handle pan start (only if not clicking on a table)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Right click for context menu
      if (e.button === 2) {
        e.preventDefault();
        const tableNode = (e.target as HTMLElement).closest('.table-node');
        if (tableNode) {
          const tableId = tableNode.getAttribute('data-table-id');
          if (tableId) {
            showTableContextMenu(e.clientX, e.clientY, tableId);
          }
        } else {
          showCanvasContextMenu(e.clientX, e.clientY);
        }
        return;
      }

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

  // Throttled pan move handler for better performance
  const handleMouseMoveThrottled = useMemo(() => {
    const panHandler = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging && !draggedTableId) {
        uiStore.setState({
          panOffset: {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          },
        });
      }
    };
    return throttle(panHandler as (...args: unknown[]) => void, 16) as (
      e: React.MouseEvent<HTMLDivElement>
    ) => void; // ~60fps
  }, [isDragging, dragStart, draggedTableId, uiStore]);

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleMouseMoveThrottled(e);
    },
    [handleMouseMoveThrottled]
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

  // Handle table double click (for editing)
  const handleTableDoubleClick = useCallback(
    (tableId: string) => {
      onTableDoubleClick?.(tableId);
    },
    [onTableDoubleClick]
  );

  // Handle table drag start
  const handleTableDragStart = useCallback((tableId: string, _e: React.MouseEvent) => {
    setDraggedTableId(tableId);
    setIsDragging(false);
  }, []);

  // Throttled table drag handler for better performance
  const handleTableDragThrottled = useMemo(() => {
    const dragHandler = (tableId: string, e: React.MouseEvent) => {
      if (!diagram) return;

      const table = diagram.getTable(tableId);
      if (!table) return;

      const currentPos = table.getPosition();
      const zoom = uiStore.getState().zoomLevel;
      const deltaX = e.movementX / zoom;
      const deltaY = e.movementY / zoom;

      table.moveTo({
        x: currentPos.x + deltaX,
        y: currentPos.y + deltaY,
      });
    };
    return throttle(dragHandler as (...args: unknown[]) => void, 16) as (
      tableId: string,
      e: React.MouseEvent
    ) => void; // ~60fps
  }, [diagram, uiStore]);

  // Handle table drag
  const handleTableDrag = useCallback(
    (tableId: string, e: React.MouseEvent) => {
      handleTableDragThrottled(tableId, e);
    },
    [handleTableDragThrottled]
  );

  // Handle table drag end
  const handleTableDragEnd = useCallback(() => {
    setDraggedTableId(null);
  }, []);

  // Show table context menu
  const showTableContextMenu = useCallback(
    (x: number, y: number, tableId: string) => {
      const items: ContextMenuItem[] = [
        {
          label: 'Edit Table',
          action: () => onTableDoubleClick?.(tableId),
        },
        {
          label: 'Create Relationship',
          action: () => onRelationshipCreate?.(tableId),
        },
        { divider: true },
        {
          label: 'Delete Table',
          action: () => {
            if (confirm('Are you sure you want to delete this table?')) {
              onTableDelete?.(tableId);
            }
          },
        },
      ];
      setContextMenu({ isOpen: true, position: { x, y }, items });
    },
    [onTableDoubleClick, onRelationshipCreate, onTableDelete]
  );

  // Show canvas context menu
  const showCanvasContextMenu = useCallback(
    (x: number, y: number) => {
      const items: ContextMenuItem[] = [
        {
          label: 'Add Table',
          action: () => onTableAdd?.(),
        },
      ];
      setContextMenu({ isOpen: true, position: { x, y }, items });
    },
    [onTableAdd]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Delete selected table
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (uiState.selectedTableId && onTableDelete) {
          if (confirm('Are you sure you want to delete this table?')) {
            onTableDelete(uiState.selectedTableId);
          }
        }
      }

      // Escape to close context menu
      if (e.key === 'Escape') {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, items: [] });
      }

      // Ctrl/Cmd + N for new table
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        onTableAdd?.();
      }

      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Save will be handled by parent component
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState.selectedTableId, onTableDelete, onTableAdd]);

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
      onContextMenu={e => e.preventDefault()}
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
          <DiagramContent
            diagram={diagram}
            uiState={uiState}
            viewport={{
              x: uiState.panOffset.x,
              y: uiState.panOffset.y,
              width: canvasRef.current?.clientWidth || 0,
              height: canvasRef.current?.clientHeight || 0,
              zoom: uiState.zoomLevel,
            }}
            onTableSelect={handleTableSelect}
            onTableDoubleClick={handleTableDoubleClick}
            onTableDragStart={handleTableDragStart}
            onTableDrag={handleTableDrag}
            onTableDragEnd={handleTableDragEnd}
          />
        )}
        {!diagram && (
          <div className="canvas-empty">
            <p>No diagram loaded. Create a new diagram or load an existing one.</p>
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenu.items}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, items: [] })}
      />
    </div>
  );
};
