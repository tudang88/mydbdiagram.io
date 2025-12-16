import { DiagramService } from './DiagramService';
import { ExporterFactory } from '../exporters/ExporterFactory';
import { ExportResult, ExportOptions } from '../exporters/ExporterInterface';

/**
 * Service for export operations
 */
export class ExportService {
  constructor(
    private diagramService: DiagramService,
    private exporterFactory: ExporterFactory
  ) {}

  /**
   * Export diagram in specified format
   */
  async export(
    diagramId: string,
    format: string,
    options?: ExportOptions
  ): Promise<ExportResult> {
    // Get diagram
    const diagram = await this.diagramService.findById(diagramId);
    if (!diagram) {
      return {
        success: false,
        error: `Diagram with id ${diagramId} not found`,
      };
    }

    // Get exporter
    const exporter = this.exporterFactory.getExporter(format);
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${format}. Supported formats: ${this.exporterFactory.getSupportedFormats().join(', ')}`,
      };
    }

    // Export
    return await exporter.export(diagram, options);
  }

  /**
   * Get supported export formats
   */
  getSupportedFormats(): string[] {
    return this.exporterFactory.getSupportedFormats();
  }
}

