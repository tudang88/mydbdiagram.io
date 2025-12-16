import { Exporter, ExportResult, ExportOptions } from './ExporterInterface';
import { DiagramData } from '../../client/types/diagram.types';
import { FileRepository } from '../repositories/FileRepository';
import { join } from 'path';

/**
 * JSON Exporter
 * Exports diagram as JSON file
 */
export class JSONExporter implements Exporter {
  constructor(private fileRepository: FileRepository) {}

  getFormat(): string {
    return 'json';
  }

  async export(diagram: DiagramData, options?: ExportOptions): Promise<ExportResult> {
    try {
      const outputDir = options?.outputDirectory || './output';
      const filename = options?.filename || `${diagram.id}-${Date.now()}.json`;
      const filePath = join(outputDir, filename);

      // Write JSON file
      await this.fileRepository.writeJSON(filePath, diagram);

      return {
        success: true,
        filePath,
        data: JSON.stringify(diagram, null, 2),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

