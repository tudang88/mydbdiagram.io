import { DiagramData } from '../../client/types/diagram.types';

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  data?: string | Buffer;
  error?: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  outputDirectory?: string;
  filename?: string;
}

/**
 * Exporter interface
 */
export interface Exporter {
  /**
   * Export diagram to specific format
   */
  export(diagram: DiagramData, options?: ExportOptions): Promise<ExportResult>;

  /**
   * Get supported format name
   */
  getFormat(): string;
}
