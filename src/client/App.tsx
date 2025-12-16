import { useState, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import { Toolbar } from './components/Toolbar/Toolbar';
import { DiagramCanvas } from './components/DiagramCanvas/DiagramCanvas';
import { TableEditor } from './components/TableEditor/TableEditor';
import { ColumnEditor } from './components/ColumnEditor/ColumnEditor';
import { DiagramStore } from './state/store/diagramStore';
import { UIStore } from './state/store/uiStore';
import { DiagramService } from './services/DiagramService';
import { ExportService } from './services/ExportService';
import { ApiClient } from './services/ApiClient';
import { DiagramValidator } from './core/validator/DiagramValidator';
import { Diagram } from './core/diagram/Diagram';
import { Table } from './core/table/Table';
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
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  const handleNewDiagram = useCallback(() => {
    const newDiagram = Diagram.create(`diagram-${Date.now()}`);
    diagramStore.setDiagram(newDiagram);
    uiStore.setState({ selectedTableId: null, selectedRelationshipId: null });
    setError(null);
  }, []);

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
          />
        </div>
        {error && <ErrorMessage message={error} onDismiss={handleDismissError} />}
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
      </div>
    </ErrorBoundary>
  );
}

export default App;
