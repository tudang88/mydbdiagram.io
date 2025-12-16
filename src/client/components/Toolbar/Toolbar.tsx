import React, { useState, useRef } from 'react';
import { DiagramService } from '../../services/DiagramService';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import { Diagram } from '../../core/diagram/Diagram';
import { JSONParser } from '../../core/parser/JSONParser';
import { SQLParser } from '../../core/parser/SQLParser';
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
  const [showImportMenu, setShowImportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const text = await file.text();

    try {
      let diagram: Diagram | null = null;

      if (fileExtension === 'json') {
        const parser = new JSONParser();
        const result = parser.parse(text);
        if (result.success && result.data) {
          diagram = result.data;
        } else {
          alert(`Failed to parse JSON: ${result.errors?.map((e) => e.message).join(', ')}`);
          return;
        }
      } else if (fileExtension === 'sql') {
        const parser = new SQLParser();
        const result = parser.parse(text);
        if (result.success && result.data) {
          diagram = result.data;
        } else {
          alert(`Failed to parse SQL: ${result.errors?.map((e) => e.message).join(', ')}`);
          return;
        }
      } else {
        alert('Unsupported file format. Please use .json or .sql files.');
        return;
      }

      if (diagram) {
        diagramStore.setDiagram(diagram);
        onDiagramLoaded();
        alert('Diagram imported successfully!');
      }
    } catch (error) {
      alert(`Error importing diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowImportMenu(false);
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
              setShowImportMenu(false);
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

        <div className="toolbar-menu">
          <button
            className="toolbar-button"
            onClick={() => {
              setShowExportMenu(false);
              setShowImportMenu(!showImportMenu);
            }}
            title="Import Diagram"
          >
            Import ▼
          </button>
          {showImportMenu && (
            <div className="toolbar-dropdown">
              <button className="dropdown-item" onClick={handleImportClick}>
                Import from JSON
              </button>
              <button className="dropdown-item" onClick={handleImportClick}>
                Import from SQL
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.sql"
          onChange={handleFileImport}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

