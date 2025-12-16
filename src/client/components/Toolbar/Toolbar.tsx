import { useState } from 'react';
import { DiagramService } from '../../services/DiagramService';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import { Diagram } from '../../core/diagram/Diagram';
import { ImportDialog } from '../ImportDialog/ImportDialog';
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
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  const handleExport = async (format: string) => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) {
      alert('No diagram to export');
      return;
    }

    const diagramId = diagram.getId();
    if (!diagramId) {
      alert('Diagram must be saved before exporting');
      return;
    }

    try {
      const result = await exportService.exportDiagram(diagramId, format);
      if (result.success) {
        if (result.downloadUrl) {
          // Create download link
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = `diagram.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        alert(`Diagram exported as ${format.toUpperCase()} successfully!`);
      } else {
        alert(`Failed to export diagram: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error exporting diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setShowExportMenu(false);
  };

  const handleImport = (diagram: Diagram) => {
    diagramStore.setDiagram(diagram);
    onDiagramLoaded();
  };

  const supportedFormats = ['json', 'sql', 'svg'];

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
        <div className="toolbar-menu">
          <button
            className="toolbar-button"
            onClick={() => {
              setShowExportMenu(!showExportMenu);
            }}
            title="Export Diagram"
          >
            Export ▼
          </button>
          {showExportMenu && (
            <div className="toolbar-dropdown">
              {supportedFormats.map((format) => (
                <button
                  key={format}
                  className="dropdown-item"
                  onClick={() => handleExport(format)}
                >
                  Export as {format.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="toolbar-button"
          onClick={() => {
            setShowExportMenu(false);
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
    </div>
  );
};

