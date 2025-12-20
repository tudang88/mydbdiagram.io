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
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when table moves
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

      // Only start canvas pan if not clicking on table
      // Check if clicking on table node
      const tableNode = (e.target as HTMLElement).closest('.table-node');
      if (e.button === 0 && tableNode === null) {
        // Left mouse button and not clicking on table - start canvas pan
        setIsDragging(true);
        setDragStart({
          x: e.clientX - uiState.panOffset.x,
          y: e.clientY - uiState.panOffset.y,
        });
      } else {
        // Clicking on table - ensure canvas dragging is off
        setIsDragging(false);
      }
    },
    [uiState.panOffset]
  );

  // Optimized table drag handler using requestAnimationFrame
  const animationFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    tableId: string | null;
    startX: number;
    startY: number;
    tableStartX: number;
    tableStartY: number;
  } | null>(null);

  // Table drag handler - can be called from both TableNode and document events
  const handleTableDragInternal = useCallback(
    (clientX: number, clientY: number) => {
      if (!diagram || !dragStateRef.current || !dragStateRef.current.tableId) {
        return;
      }

      const table = diagram.getTable(dragStateRef.current.tableId);
      if (!table) {
        return;
      }

      // Cancel previous animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        if (!dragStateRef.current) return;

        const zoom = uiStore.getState().zoomLevel;

        // Calculate mouse movement delta in viewport coordinates
        const deltaXViewport = clientX - dragStateRef.current.startX;
        const deltaYViewport = clientY - dragStateRef.current.startY;

        // Convert delta from viewport to canvas space (divide by zoom)
        // This ensures table moves the same visual distance as mouse
        const deltaXCanvas = deltaXViewport / zoom;
        const deltaYCanvas = deltaYViewport / zoom;

        // Update table position: start position + delta in canvas space
        table.moveTo({
          x: dragStateRef.current.tableStartX + deltaXCanvas,
          y: dragStateRef.current.tableStartY + deltaYCanvas,
        });
        
        // Force re-render to update relationship lines
        setForceUpdate(prev => prev + 1);
      });
    },
    [diagram, uiStore]
  );

  // Throttled pan move handler for better performance
  const handleMouseMoveThrottled = useMemo(() => {
    const panHandler = (e: React.MouseEvent<HTMLDivElement>) => {
      // CRITICAL: If dragging a table, ONLY handle table drag, NEVER pan canvas
      if (draggedTableId) {
        handleTableDragInternal(e.clientX, e.clientY);
        return; // STOP - don't pan canvas when dragging table
      }

      // Only pan canvas if explicitly dragging canvas (not table)
      if (isDragging) {
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
  }, [isDragging, dragStart, draggedTableId, uiStore, handleTableDragInternal]);

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleMouseMoveThrottled(e);
    },
    [handleMouseMoveThrottled]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    // Always clear canvas dragging state
    setIsDragging(false);
    // Note: draggedTableId will be cleared by handleTableDragEnd or document mouseup
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
  const handleTableDragStart = useCallback(
    (tableId: string, e: React.MouseEvent) => {
      // CRITICAL: Set draggedTableId FIRST, then clear isDragging
      // This ensures canvas pan is immediately disabled
      setDraggedTableId(tableId);
      setIsDragging(false); // CRITICAL: Prevent canvas pan when dragging table

      // Store initial drag state for smooth calculation
      const table = diagramStore.getDiagram()?.getTable(tableId);
      if (!table) {
        console.warn('⚠️ Table not found for drag start:', tableId);
        return;
      }
      
      const pos = table.getPosition();

      // Store mouse position in viewport coordinates (simple and direct)
      // We'll calculate delta in viewport and convert to canvas space during drag
      dragStateRef.current = {
        tableId,
        startX: e.clientX,
        startY: e.clientY,
        tableStartX: pos.x,
        tableStartY: pos.y,
      };
      
      console.log('🖱️ Drag start:', {
        tableId,
        startX: e.clientX,
        startY: e.clientY,
        tableStartX: pos.x,
        tableStartY: pos.y,
      });
    },
    [diagramStore]
  );

  // Handle table drag end - defined before useEffect that uses it
  const handleTableDragEnd = useCallback(() => {
    setDraggedTableId(null);
    dragStateRef.current = null;
    setIsDragging(false); // Also clear canvas dragging state
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Force final re-render to ensure relationship lines are updated
    setForceUpdate(prev => prev + 1);
  }, []);

  // Document-level mouse move handler for continuous dragging
  useEffect(() => {
    if (!draggedTableId) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (draggedTableId && dragStateRef.current) {
        handleTableDragInternal(e.clientX, e.clientY);
      }
    };

    const handleDocumentMouseUp = () => {
      if (draggedTableId) {
        // Call handleTableDragEnd to ensure cleanup and force re-render
        handleTableDragEnd();
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [draggedTableId, handleTableDragInternal, handleTableDragEnd]);

  // Handle table drag (called from TableNode)
  const handleTableDrag = useCallback(
    (_tableId: string, e: React.MouseEvent) => {
      handleTableDragInternal(e.clientX, e.clientY);
    },
    [handleTableDragInternal]
  );

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
  const renderGrid = useMemo(() => {
    if (!uiState.showGrid) return null;

    const gridSize = 20;
    const { x: panX, y: panY } = uiState.panOffset;
    const zoom = uiState.zoomLevel;

    // Calculate bounds from all tables
    const TABLE_WIDTH = 200;
    const TABLE_HEADER_HEIGHT = 40;
    const COLUMN_HEIGHT = 30;

    let minX = 0;
    let minY = 0;
    let maxX = window.innerWidth;
    let maxY = window.innerHeight;

    if (diagram) {
      const tables = diagram.getAllTables();
      if (tables.length > 0) {
        minX = Infinity;
        minY = Infinity;
        maxX = -Infinity;
        maxY = -Infinity;

        tables.forEach(table => {
          const pos = table.getPosition();
          const columnCount = table.getAllColumns().length;
          const tableHeight = TABLE_HEADER_HEIGHT + columnCount * COLUMN_HEIGHT;

          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + TABLE_WIDTH);
          maxY = Math.max(maxY, pos.y + tableHeight);
        });

        // Add padding to ensure grid covers all tables with some margin
        const padding = 500;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
      }
    }

    // Also consider viewport bounds
    const viewportStartX = -panX / zoom;
    const viewportStartY = -panY / zoom;
    const viewportEndX = viewportStartX + window.innerWidth / zoom;
    const viewportEndY = viewportStartY + window.innerHeight / zoom;

    // Use the union of table bounds and viewport bounds
    const startX = Math.min(minX, viewportStartX);
    const startY = Math.min(minY, viewportStartY);
    const endX = Math.max(maxX, viewportEndX);
    const endY = Math.max(maxY, viewportEndY);

    // Align to grid
    const gridStartX = Math.floor(startX / gridSize) * gridSize;
    const gridStartY = Math.floor(startY / gridSize) * gridSize;
    const gridEndX = Math.ceil(endX / gridSize) * gridSize;
    const gridEndY = Math.ceil(endY / gridSize) * gridSize;

    const lines = [];

    // Vertical lines
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={gridStartY}
          x2={x}
          y2={gridEndY}
          stroke="#e0e0e0"
          strokeWidth={1 / zoom}
        />
      );
    }

    // Horizontal lines
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={gridStartX}
          y1={y}
          x2={gridEndX}
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
  }, [uiState.showGrid, uiState.panOffset, uiState.zoomLevel, diagram]);

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
      {renderGrid}
      <div
        className="canvas-content"
        style={{
          transform: `translate(${uiState.panOffset.x}px, ${uiState.panOffset.y}px) scale(${uiState.zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {diagram && (
          <DiagramContent
            key={`diagram-${forceUpdate}`} // Force re-render when forceUpdate changes
            diagram={diagram}
            uiState={uiState}
            viewport={{
              x: uiState.panOffset.x,
              y: uiState.panOffset.y,
              width: canvasRef.current?.clientWidth || 0,
              height: canvasRef.current?.clientHeight || 0,
              zoom: uiState.zoomLevel,
            }}
            draggedTableId={draggedTableId}
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
