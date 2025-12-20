import { useState } from 'react';
import { DiagramService } from '../../services/DiagramService';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import { Diagram } from '../../core/diagram/Diagram';
import { ImportDialog } from '../ImportDialog/ImportDialog';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { LoadDialog } from '../LoadDialog/LoadDialog';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp/KeyboardShortcutsHelp';
import './Toolbar.css';

interface ToolbarProps {
  diagramService: DiagramService;
  exportService: ExportService;
  diagramStore: DiagramStore;
  onNewDiagram: () => void;
  onDiagramLoaded: () => void;
  onImportText?: (text: string) => void; // Callback to set text in editor
  onGetEditorText?: () => string | undefined; // Callback to get current editor text
  onGetEditorFormat?: () => 'sql' | 'dbml' | undefined; // Callback to get current editor format
}

export const Toolbar: React.FC<ToolbarProps> = ({
  diagramService,
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
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

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

      const result = await diagramService.saveDiagram(diagram);
      if (result.success && result.data) {
        // Update diagram with saved data (including ID if it was a new diagram)
        const savedDiagram = Diagram.fromJSON(result.data);
        diagramStore.setDiagram(savedDiagram);
        alert('Diagram saved successfully!');
      } else {
        const errorMessages = result.errors?.map(e => e.message).join(', ') || 'Unknown error';
        alert(`Failed to save diagram: ${errorMessages}`);
      }
    } catch (error) {
      alert(`Error saving diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    
    onDiagramLoaded();
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
            setShowLoadDialog(true);
          }}
          title="Load Diagram"
        >
          Load
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
      <LoadDialog
        isOpen={showLoadDialog}
        onClose={() => setShowLoadDialog(false)}
        onLoad={(diagramText) => {
          onDiagramLoaded();
          // Set text in editor if provided
          if (diagramText && onImportText) {
            onImportText(diagramText);
          }
        }}
        diagramService={diagramService}
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
