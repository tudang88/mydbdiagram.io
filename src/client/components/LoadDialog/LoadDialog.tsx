import { useState, useEffect } from 'react';
import { DiagramService } from '../../services/DiagramService';
import { DiagramStore } from '../../state/store/diagramStore';
import { FrontendExporter } from '../../core/exporter/FrontendExporter';
import './LoadDialog.css';

interface DiagramListItem {
  id: string;
  name?: string;
  updatedAt?: string;
}

interface LoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (diagramText?: string) => void; // Callback with optional diagram text for editor
  diagramService: DiagramService;
  diagramStore: DiagramStore;
}

export const LoadDialog: React.FC<LoadDialogProps> = ({
  isOpen,
  onClose,
  onLoad,
  diagramService,
  diagramStore,
}) => {
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDiagrams();
    }
  }, [isOpen]);

  const loadDiagrams = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await diagramService.listDiagrams();
      if (result.success && result.data) {
        setDiagrams(result.data);
      } else {
        setError(result.error || 'Failed to load diagrams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading diagrams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedId) {
      setError('Please select a diagram to load');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await diagramService.loadDiagram(selectedId);
      if (result.success && result.data) {
        diagramStore.setDiagram(result.data);

        // Try to load source text from metadata first, fallback to generating SQL
        const sourceText = result.data.getSourceText();
        let diagramText: string | undefined = sourceText;

        // If no source text in metadata, generate SQL from diagram
        if (!diagramText) {
          const exporter = new FrontendExporter();
          const sqlResult = exporter.exportSQL(result.data);
          diagramText = sqlResult.success && sqlResult.data ? sqlResult.data : undefined;
        }

        onLoad(diagramText);
        onClose();
        setSelectedId(null);
      } else {
        setError(result.error || 'Failed to load diagram');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading diagram');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (diagramId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this diagram?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await diagramService.deleteDiagram(diagramId);
      if (result.success) {
        // Reload list
        await loadDiagrams();
        if (selectedId === diagramId) {
          setSelectedId(null);
        }
      } else {
        setError(result.error || 'Failed to delete diagram');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting diagram');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setSelectedId(null);
      setError(null);
      onClose();
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="load-dialog-overlay" onClick={handleCancel}>
      <div className="load-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Load Diagram</h2>
          <button className="close-button" onClick={handleCancel} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {isLoading && diagrams.length === 0 && (
            <div className="loading-message">Loading diagrams...</div>
          )}

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!isLoading && diagrams.length === 0 && !error && (
            <div className="empty-message">
              No diagrams found. Create a new diagram to get started.
            </div>
          )}

          {diagrams.length > 0 && (
            <div className="diagram-list">
              {diagrams.map(diagram => (
                <div
                  key={diagram.id}
                  className={`diagram-item ${selectedId === diagram.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(diagram.id)}
                >
                  <div className="diagram-info">
                    <div className="diagram-name">{diagram.name || 'Untitled Diagram'}</div>
                    <div className="diagram-meta">
                      <span className="diagram-id">ID: {diagram.id}</span>
                      {diagram.updatedAt && (
                        <span className="diagram-date">
                          Updated: {formatDate(diagram.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={e => handleDelete(diagram.id, e)}
                    disabled={isLoading}
                    title="Delete diagram"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button className="refresh-button" onClick={loadDiagrams} disabled={isLoading}>
            Refresh
          </button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </button>
            <button
              className="load-button"
              onClick={handleLoad}
              disabled={isLoading || !selectedId}
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
