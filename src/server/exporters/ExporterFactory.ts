import { Exporter } from './ExporterInterface';
import { JSONExporter } from './JSONExporter';
import { SQLExporter } from './SQLExporter';
import { SVGExporter } from './SVGExporter';
import { PNGExporter } from './PNGExporter';
import { FileRepository } from '../repositories/FileRepository';

/**
 * Factory for creating exporters
 */
export class ExporterFactory {
  private exporters: Map<string, Exporter> = new Map();

  constructor(fileRepository: FileRepository) {
    // Register default exporters
    this.register('json', new JSONExporter(fileRepository));
    this.register('sql', new SQLExporter());
    this.register('svg', new SVGExporter());
    this.register('png', new PNGExporter());
  }

  /**
   * Register an exporter
   */
  register(format: string, exporter: Exporter): void {
    this.exporters.set(format.toLowerCase(), exporter);
  }

  /**
   * Get exporter by format
   */
  getExporter(format: string): Exporter | null {
    return this.exporters.get(format.toLowerCase()) || null;
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(format: string): boolean {
    return this.exporters.has(format.toLowerCase());
  }
}

