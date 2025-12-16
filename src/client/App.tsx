import { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import { Notification, NotificationType } from './components/Notification/Notification';
import { LoadingIndicator } from './components/LoadingIndicator/LoadingIndicator';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import { Toolbar } from './components/Toolbar/Toolbar';
import { DiagramCanvas } from './components/DiagramCanvas/DiagramCanvas';
import { TableEditor } from './components/TableEditor/TableEditor';
import { ColumnEditor } from './components/ColumnEditor/ColumnEditor';
import { RelationshipCreator } from './components/RelationshipCreator/RelationshipCreator';
import { DiagramStore } from './state/store/diagramStore';
import { UIStore } from './state/store/uiStore';
import { DiagramService } from './services/DiagramService';
import { ExportService } from './services/ExportService';
import { ApiClient } from './services/ApiClient';
import { DiagramValidator } from './core/validator/DiagramValidator';
import { Diagram } from './core/diagram/Diagram';
import { Table } from './core/table/Table';
import { Relationship } from './core/relationship/Relationship';
import { Column } from './types/table.types';
import './App.css';

// Initialize services and stores
const apiClient = new ApiClient();
const validator = new DiagramValidator();
const diagramService = new DiagramService(apiClient, validator);
const exportService = new ExportService(apiClient);
const diagramStore = new DiagramStore();
const uiStore = new UIStore();

function App() {
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage] = useState<string | undefined>();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [showRelationshipCreator, setShowRelationshipCreator] = useState(false);
  const [relationshipFromTable, setRelationshipFromTable] = useState<string | undefined>();
  const [relationshipToTable, setRelationshipToTable] = useState<string | undefined>();

  const showNotification = useCallback((type: NotificationType, message: string) => {
    setNotification({ type, message });
  }, []);

  const handleNewDiagram = useCallback(() => {
    try {
      const newDiagram = Diagram.create(`diagram-${Date.now()}`);
      diagramStore.setDiagram(newDiagram);
      uiStore.setState({ selectedTableId: null, selectedRelationshipId: null });
      setError(null);
      showNotification('success', 'New diagram created');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create new diagram';
      setError(errorMsg);
      showNotification('error', errorMsg);
    }
  }, [showNotification]);

  const handleDiagramLoaded = useCallback(() => {
    uiStore.setState({ selectedTableId: null, selectedRelationshipId: null });
    setError(null);
  }, []);

  const handleTableDoubleClick = useCallback((tableId: string) => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) return;

    const table = diagram.getTable(tableId);
    if (table) {
      setEditingTable(table);
      setEditingTableId(tableId);
    }
  }, []);

  const handleColumnDoubleClick = useCallback((tableId: string, columnId: string) => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) return;

    const table = diagram.getTable(tableId);
    if (!table) return;

    const column = table.getColumn(columnId);
    if (column) {
      setEditingColumn(column);
      setEditingTableId(tableId);
    }
  }, []);

  const handleTableSave = useCallback(
    (_table: Table) => {
      const diagram = diagramStore.getDiagram();
      if (!diagram) return;

      try {
        // Table is already updated by the editor
        setEditingTable(null);
        setEditingTableId(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save table');
      }
    },
    []
  );

  const handleTableCancel = useCallback(() => {
    setEditingTable(null);
    setEditingTableId(null);
  }, []);

  const handleColumnSave = useCallback(
    (column: Column) => {
      const diagram = diagramStore.getDiagram();
      if (!diagram || !editingTableId) return;

      try {
        const table = diagram.getTable(editingTableId);
        if (!table) return;

        table.updateColumn(column.id, column);
        setEditingColumn(null);
        setEditingTableId(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save column');
      }
    },
    [editingTableId]
  );

  const handleColumnCancel = useCallback(() => {
    setEditingColumn(null);
    setEditingTableId(null);
  }, []);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const handleDismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Keyboard shortcut for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRelationshipCreate = useCallback((fromTableId: string, toTableId?: string) => {
    setRelationshipFromTable(fromTableId);
    setRelationshipToTable(toTableId);
    setShowRelationshipCreator(true);
  }, []);

  const handleRelationshipSave = useCallback(
    (relationship: Relationship) => {
      const diagram = diagramStore.getDiagram();
      if (!diagram) return;

      try {
        diagram.addRelationship(relationship);
        setShowRelationshipCreator(false);
        setRelationshipFromTable(undefined);
        setRelationshipToTable(undefined);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create relationship');
      }
    },
    [diagramStore]
  );

  const handleTableDelete = useCallback(
    (tableId: string) => {
      const diagram = diagramStore.getDiagram();
      if (!diagram) return;

      try {
        diagram.removeTable(tableId);
        uiStore.setState({ selectedTableId: null });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete table');
      }
    },
    [diagramStore, uiStore]
  );

  const handleTableAdd = useCallback(() => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) {
      const newDiagram = Diagram.create(`diagram-${Date.now()}`);
      diagramStore.setDiagram(newDiagram);
    }

    const currentDiagram = diagramStore.getDiagram();
    if (!currentDiagram) return;

    try {
      const table = new Table(
        `table-${Date.now()}`,
        'NewTable',
        { x: 200, y: 200 }
      );
      currentDiagram.addTable(table);
      uiStore.setState({ selectedTableId: table.getId() });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add table');
    }
  }, [diagramStore, uiStore]);

  return (
    <ErrorBoundary>
      <div className="app">
        <Toolbar
          diagramService={diagramService}
          exportService={exportService}
          diagramStore={diagramStore}
          onNewDiagram={handleNewDiagram}
          onDiagramLoaded={handleDiagramLoaded}
        />
        <div className="app-main">
          <DiagramCanvas
            diagramStore={diagramStore}
            uiStore={uiStore}
            onTableDoubleClick={handleTableDoubleClick}
            onColumnDoubleClick={handleColumnDoubleClick}
            onRelationshipCreate={handleRelationshipCreate}
            onTableDelete={handleTableDelete}
            onTableAdd={handleTableAdd}
          />
        </div>
        {error && <ErrorMessage message={error} onDismiss={handleDismissError} />}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={handleDismissNotification}
          />
        )}
        {loading && <LoadingIndicator message={loadingMessage || 'Loading...'} />}
        {showShortcutsHelp && (
          <KeyboardShortcutsHelp
            isOpen={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
          />
        )}
        {editingTable && (
          <TableEditor
            table={editingTable}
            onSave={handleTableSave}
            onCancel={handleTableCancel}
          />
        )}
        {editingColumn && (
          <ColumnEditor
            column={editingColumn}
            onSave={handleColumnSave}
            onCancel={handleColumnCancel}
          />
        )}
        {showRelationshipCreator && (
          <RelationshipCreator
            isOpen={showRelationshipCreator}
            onClose={() => {
              setShowRelationshipCreator(false);
              setRelationshipFromTable(undefined);
              setRelationshipToTable(undefined);
            }}
            onSave={handleRelationshipSave}
            diagram={diagramStore.getDiagram()}
            fromTableId={relationshipFromTable}
            toTableId={relationshipToTable}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
