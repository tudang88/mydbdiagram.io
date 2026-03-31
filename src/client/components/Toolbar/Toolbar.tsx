import { useState } from 'react';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import { Diagram } from '../../core/diagram/Diagram';
import { applyAutoLayout } from '../../core/diagram/autoLayoutDiagram';
import { FrontendExporter } from '../../core/exporter/FrontendExporter';
import { JSONParser } from '../../core/parser/JSONParser';
import { ImportDialog } from '../ImportDialog/ImportDialog';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import {
  FilePickerAccept,
  isUserCancelledFilePickerError,
  pickTextFile,
  saveTextFile,
} from '../../utils/fileSystemAccess';
import './Toolbar.css';

interface ToolbarProps {
  exportService: ExportService;
  diagramStore: DiagramStore;
  onNewDiagram: () => void;
  /** Call after diagram replaced from Import (pending first Draw layout) or Load (keep saved positions). */
  onDiagramLoaded: (source: 'import' | 'load') => void;
  onImportText?: (text: string) => void; // Callback to set text in editor
  onGetEditorText?: () => string | undefined; // Callback to get current editor text
  onGetEditorFormat?: () => 'sql' | 'dbml' | undefined; // Callback to get current editor format
}

export const Toolbar: React.FC<ToolbarProps> = ({
  exportService,
  diagramStore,
  onNewDiagram,
  onDiagramLoaded,
  onImportText,
  onGetEditorText,
  onGetEditorFormat,
}) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const frontendExporter = new FrontendExporter();
  const jsonParser = new JSONParser();
  const fileAccept: FilePickerAccept[] = [
    {
      description: 'Diagram JSON',
      mimeTypes: ['application/json', 'text/plain'],
      extensions: ['.json'],
    },
  ];

  const handleNew = () => {
    const newDiagram = Diagram.create(`diagram-${Date.now()}`);
    diagramStore.setDiagram(newDiagram);
    onNewDiagram();
  };

  const handleSave = async () => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) {
      alert('No diagram to save');
      return;
    }

    try {
      // Get current editor text and format before saving
      const editorText = onGetEditorText?.();
      const editorFormat = onGetEditorFormat?.();

      // Update diagram metadata with source text and format
      if (editorText && editorFormat) {
        diagram.setSourceText(editorText, editorFormat);
      }

      const jsonResult = frontendExporter.exportJSON(diagram);
      if (!jsonResult.success || !jsonResult.data) {
        alert(jsonResult.error || 'Failed to prepare diagram JSON');
        return;
      }

      const suggestedName = `${diagram.getId() || 'diagram'}.json`;
      await saveTextFile(jsonResult.data, {
        suggestedName,
        accept: fileAccept,
      });
      alert('Diagram saved to file successfully!');
    } catch (error) {
      if (isUserCancelledFilePickerError(error)) {
        return;
      }
      alert(`Error saving diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadFromFile = async () => {
    try {
      const { text } = await pickTextFile({ accept: fileAccept });
      if (!text.trim()) {
        alert('Selected file is empty');
        return;
      }

      const result = jsonParser.parse(text);
      if (!result.success || !result.data) {
        const errorMsg = result.errors?.map(e => e.message).join('\n') || 'Invalid diagram JSON';
        alert(`Failed to load diagram: ${errorMsg}`);
        return;
      }

      diagramStore.setDiagram(result.data);
      const sourceText = result.data.getSourceText();
      let editorText = sourceText;
      if (!editorText) {
        const sqlResult = frontendExporter.exportSQL(result.data);
        editorText = sqlResult.success ? sqlResult.data : undefined;
      }
      onDiagramLoaded('load');
      if (editorText && onImportText) {
        onImportText(editorText);
      } else {
        onImportText?.('');
      }
      alert('Diagram loaded from file successfully!');
    } catch (error) {
      if (isUserCancelledFilePickerError(error)) {
        return;
      }
      alert(`Error loading diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAutoLayout = () => {
    const diagram = diagramStore.getDiagram();
    if (!diagram || diagram.getAllTables().length === 0) {
      return;
    }
    // Layout on a fresh clone so we never half-mutate the store’s diagram, then swap once.
    const laidOut = Diagram.fromJSON(diagram.toJSON());
    applyAutoLayout(laidOut);
    diagramStore.setDiagram(laidOut);
  };

  const handleImport = (diagram: Diagram, importText?: string) => {
    // Debug: Check relationships before setting diagram
    const relationshipsBefore = diagram.getAllRelationships();
    console.log(`🔍 Before setDiagram: ${relationshipsBefore.length} relationships`);

    diagramStore.setDiagram(diagram);

    // Debug: Check relationships after setting diagram
    const diagramAfter = diagramStore.getDiagram();
    const relationshipsAfter = diagramAfter?.getAllRelationships() || [];
    console.log(`🔍 After setDiagram: ${relationshipsAfter.length} relationships`);

    onDiagramLoaded('import');
    // Set text in editor if provided
    if (importText && onImportText) {
      onImportText(importText);
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-button" onClick={handleNew} title="New Diagram">
          New
        </button>
        <button className="toolbar-button" onClick={handleSave} title="Save Diagram">
          Save
        </button>
        <button
          className="toolbar-button"
          onClick={() => {
            setShowExportDialog(false);
            setShowImportDialog(false);
            void handleLoadFromFile();
          }}
          title="Load Diagram"
        >
          Load
        </button>
        <button
          className="toolbar-button"
          onClick={handleAutoLayout}
          title="Arrange tables by relationship groups (FK graph)"
        >
          Auto layout
        </button>
      </div>

      <div className="toolbar-right">
        <button
          className="toolbar-button"
          onClick={() => {
            setShowImportDialog(false);
            setShowExportDialog(true);
          }}
          title="Export Diagram"
        >
          Export
        </button>
        <button
          className="toolbar-button"
          onClick={() => {
            setShowExportDialog(false);
            setShowImportDialog(true);
          }}
          title="Import Diagram"
        >
          Import
        </button>
      </div>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        exportService={exportService}
        diagramStore={diagramStore}
      />
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}
      <button
        className="toolbar-button toolbar-help"
        onClick={() => setShowShortcutsHelp(true)}
        title="Keyboard Shortcuts (Ctrl+/)"
      >
        ⌨️ Help
      </button>
    </div>
  );
};
