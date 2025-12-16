import { useState } from 'react';
import { ExportService } from '../../services/ExportService';
import { DiagramStore } from '../../state/store/diagramStore';
import './ExportDialog.css';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportService: ExportService;
  diagramStore: DiagramStore;
}

const SUPPORTED_FORMATS = [
  { value: 'json', label: 'JSON', description: 'Export as JSON diagram data' },
  { value: 'sql', label: 'SQL DDL', description: 'Export as SQL CREATE TABLE statements' },
  { value: 'svg', label: 'SVG Image', description: 'Export as SVG vector image' },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  exportService,
  diagramStore,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    const diagram = diagramStore.getDiagram();
    if (!diagram) {
      setError('No diagram to export');
      return;
    }

    const diagramId = diagram.getId();
    if (!diagramId) {
      setError('Diagram must be saved before exporting');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    setSuccess(false);

    try {
      // Simulate progress
      setExportProgress(25);

      const result = await exportService.exportDiagram(diagramId, selectedFormat);

      setExportProgress(75);

      if (!result.success) {
        setError(result.error || 'Export failed');
        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      setExportProgress(90);

      // Handle download
      if (result.downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `diagram.${selectedFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data as string], {
          type: selectedFormat === 'json' ? 'application/json' : selectedFormat === 'sql' ? 'text/plain' : 'image/svg+xml',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diagram.${selectedFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setExportProgress(100);
      setSuccess(true);

      // Auto close after 1 second
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setExportProgress(0);
        setSuccess(false);
        setError(null);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export error');
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleCancel = () => {
    if (!isExporting) {
      setError(null);
      setSuccess(false);
      setExportProgress(0);
      onClose();
    }
  };

  return (
    <div className="export-dialog-overlay" onClick={handleCancel}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Export Diagram</h2>
          <button className="close-button" onClick={handleCancel} disabled={isExporting}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          <div className="format-selection">
            <label className="format-label">Select Export Format:</label>
            <div className="format-options">
              {SUPPORTED_FORMATS.map((format) => (
                <label key={format.value} className="format-option">
                  <input
                    type="radio"
                    name="export-format"
                    value={format.value}
                    checked={selectedFormat === format.value}
                    onChange={(e) => {
                      setSelectedFormat(e.target.value);
                      setError(null);
                    }}
                    disabled={isExporting}
                  />
                  <div className="format-info">
                    <span className="format-name">{format.label}</span>
                    <span className="format-description">{format.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="progress-text">{exportProgress}%</span>
            </div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span>Diagram exported successfully!</span>
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button
            className="cancel-button"
            onClick={handleCancel}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            className="export-button"
            onClick={handleExport}
            disabled={isExporting || !diagramStore.getDiagram()}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

