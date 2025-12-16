import { Exporter, ExportResult, ExportOptions } from './ExporterInterface';
import { DiagramData } from '../../client/types/diagram.types';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * SVG Exporter
 * Exports diagram as SVG vector image
 */
export class SVGExporter implements Exporter {
  constructor() {}

  getFormat(): string {
    return 'svg';
  }

  async export(diagram: DiagramData, options?: ExportOptions): Promise<ExportResult> {
    try {
      const svg = this.generateSVG(diagram);
      const outputDir = options?.outputDirectory || './output';
      const filename = options?.filename || `${diagram.id}-${Date.now()}.svg`;
      const filePath = join(outputDir, filename);

      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Write SVG file
      await fs.writeFile(filePath, svg, 'utf-8');

      return {
        success: true,
        filePath,
        data: svg,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate SVG from diagram
   */
  private generateSVG(diagram: DiagramData): string {
    const padding = 50;
    const tableWidth = 200;
    const tableHeaderHeight = 30;
    const rowHeight = 25;

    // Calculate bounds
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    diagram.tables.forEach(table => {
      const x = table.position.x;
      const y = table.position.y;
      const height = tableHeaderHeight + table.columns.length * rowHeight;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + tableWidth);
      maxY = Math.max(maxY, y + height);
    });

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const svg: string[] = [];
    svg.push('<?xml version="1.0" encoding="UTF-8"?>');
    svg.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);
    svg.push(`<rect width="${width}" height="${height}" fill="white"/>`);

    // Draw relationships (lines)
    diagram.relationships.forEach(relationship => {
      const fromTable = diagram.tables.find(t => t.id === relationship.fromTableId);
      const toTable = diagram.tables.find(t => t.id === relationship.toTableId);

      if (fromTable && toTable) {
        const x1 = fromTable.position.x + tableWidth / 2 - minX + padding;
        const y1 = fromTable.position.y + tableHeaderHeight / 2 - minY + padding;
        const x2 = toTable.position.x + tableWidth / 2 - minX + padding;
        const y2 = toTable.position.y + tableHeaderHeight / 2 - minY + padding;

        svg.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="2" marker-end="url(#arrowhead)"/>`
        );
      }
    });

    // Add arrow marker
    svg.push(
      '<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0, 10 3, 0 6" fill="#333"/></marker></defs>'
    );

    // Draw tables
    diagram.tables.forEach(table => {
      const x = table.position.x - minX + padding;
      const y = table.position.y - minY + padding;
      const tableHeight = tableHeaderHeight + table.columns.length * rowHeight;

      // Table rectangle
      svg.push(
        `<rect x="${x}" y="${y}" width="${tableWidth}" height="${tableHeight}" fill="#f9f9f9" stroke="#333" stroke-width="2" rx="4"/>`
      );

      // Table header
      svg.push(
        `<rect x="${x}" y="${y}" width="${tableWidth}" height="${tableHeaderHeight}" fill="#4a90e2" stroke="#333" stroke-width="2" rx="4 4 0 0"/>`
      );
      svg.push(
        `<text x="${x + tableWidth / 2}" y="${y + tableHeaderHeight / 2 + 5}" text-anchor="middle" fill="white" font-weight="bold" font-size="14">${this.escapeXML(table.name)}</text>`
      );

      // Columns
      table.columns.forEach((column, index) => {
        const colY = y + tableHeaderHeight + index * rowHeight;
        const colText = `${column.name}: ${column.type}`;
        svg.push(
          `<text x="${x + 10}" y="${colY + rowHeight / 2 + 5}" fill="#333" font-size="12">${this.escapeXML(colText)}</text>`
        );
        if (index < table.columns.length - 1) {
          svg.push(
            `<line x1="${x}" y1="${colY + rowHeight}" x2="${x + tableWidth}" y2="${colY + rowHeight}" stroke="#ddd" stroke-width="1"/>`
          );
        }
      });
    });

    svg.push('</svg>');
    return svg.join('\n');
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
