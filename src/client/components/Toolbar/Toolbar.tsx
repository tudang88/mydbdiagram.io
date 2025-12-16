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
}

export const Toolbar: React.FC<ToolbarProps> = ({
  diagramService,
  exportService,
  diagramStore,
  onNewDiagram,
  onDiagramLoaded,
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
      const result = await diagramService.saveDiagram(diagram);
      if (result.success) {
        alert('Diagram saved successfully!');
      } else {
        alert(`Failed to save diagram: ${result.errors?.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      alert(`Error saving diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImport = (diagram: Diagram) => {
    diagramStore.setDiagram(diagram);
    onDiagramLoaded();
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
        onLoad={onDiagramLoaded}
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
