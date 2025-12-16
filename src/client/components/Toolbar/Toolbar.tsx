import { useState } from 'react';
import { DiagramService } from '../../services/DiagramService';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import { Diagram } from '../../core/diagram/Diagram';
import { ImportDialog } from '../ImportDialog/ImportDialog';
import { ExportDialog } from '../ExportDialog/ExportDialog';
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
        alert(`Failed to save diagram: ${result.errors?.map((e) => e.message).join(', ')}`);
      }
    } catch (error) {
      alert(`Error saving diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoad = async () => {
    // For now, we'll use a simple prompt. In a full implementation, this would show a list of saved diagrams
    const diagramId = prompt('Enter diagram ID to load:');
    if (!diagramId) return;

    try {
      const result = await diagramService.loadDiagram(diagramId);
      if (result.success && result.data) {
        diagramStore.setDiagram(result.data);
        onDiagramLoaded();
        alert('Diagram loaded successfully!');
      } else {
        alert(`Failed to load diagram: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error loading diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <button className="toolbar-button" onClick={handleLoad} title="Load Diagram">
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
    </div>
  );
};

