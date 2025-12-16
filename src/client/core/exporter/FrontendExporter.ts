import { Diagram } from '../diagram/Diagram';

/**
 * Frontend exporter interface
 */
export interface FrontendExportResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Frontend exporter for exporting diagrams directly in the browser
 */
export class FrontendExporter {
  /**
   * Export diagram as JSON
   */
  exportJSON(diagram: Diagram): FrontendExportResult {
    try {
      const diagramData = diagram.toJSON();
      const json = JSON.stringify(diagramData, null, 2);
      return {
        success: true,
        data: json,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export JSON',
      };
    }
  }

  /**
   * Export diagram as SQL DDL
   */
  exportSQL(diagram: Diagram): FrontendExportResult {
    try {
      const diagramData = diagram.toJSON();
      const lines: string[] = [];

      // Add header comment
      lines.push('-- Generated SQL DDL from MyDBDiagram.io');
      lines.push(`-- Diagram: ${diagramData.id}`);
      lines.push(`-- Created: ${diagramData.metadata.createdAt}`);
      lines.push('');

      // Generate CREATE TABLE statements
      diagramData.tables.forEach(table => {
        lines.push(`CREATE TABLE ${this.escapeIdentifier(table.name)} (`);

        const columnDefinitions: string[] = [];
        const constraints: string[] = [];

        table.columns.forEach(column => {
          let columnDef = `  ${this.escapeIdentifier(column.name)} ${column.type}`;

          // Add constraints
          column.constraints.forEach(constraint => {
            if (constraint.type === 'PRIMARY_KEY') {
              constraints.push(`  PRIMARY KEY (${this.escapeIdentifier(column.name)})`);
            } else if (constraint.type === 'NOT_NULL') {
              columnDef += ' NOT NULL';
            } else if (constraint.type === 'UNIQUE') {
              columnDef += ' UNIQUE';
            } else if (constraint.type === 'AUTO_INCREMENT') {
              columnDef += ' AUTO_INCREMENT';
            }
          });

          if (column.defaultValue) {
            columnDef += ` DEFAULT ${this.escapeValue(column.defaultValue)}`;
          }

          if (column.comment) {
            columnDef += ` COMMENT ${this.escapeValue(column.comment)}`;
          }

          columnDefinitions.push(columnDef);
        });

        // Add column definitions
        lines.push(columnDefinitions.join(',\n'));

        // Add table-level constraints
        if (constraints.length > 0) {
          lines.push(',');
          lines.push(constraints.join(',\n'));
        }

        lines.push(');');
        lines.push('');
      });

      // Generate FOREIGN KEY constraints
      diagramData.relationships.forEach(relationship => {
        const fromTable = diagramData.tables.find(t => t.id === relationship.fromTableId);
        const toTable = diagramData.tables.find(t => t.id === relationship.toTableId);
        const fromColumn = fromTable?.columns.find(c => c.id === relationship.fromColumnId);
        const toColumn = toTable?.columns.find(c => c.id === relationship.toColumnId);

        if (fromTable && toTable && fromColumn && toColumn) {
          const constraintName = `fk_${fromTable.name}_${toTable.name}`;
          lines.push(
            `ALTER TABLE ${this.escapeIdentifier(fromTable.name)} ` +
              `ADD CONSTRAINT ${this.escapeIdentifier(constraintName)} ` +
              `FOREIGN KEY (${this.escapeIdentifier(fromColumn.name)}) ` +
              `REFERENCES ${this.escapeIdentifier(toTable.name)} (${this.escapeIdentifier(toColumn.name)});`
          );
        }
      });

      return {
        success: true,
        data: lines.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export SQL',
      };
    }
  }

  /**
   * Export diagram as SVG
   */
  exportSVG(diagram: Diagram): FrontendExportResult {
    try {
      const diagramData = diagram.toJSON();
      const padding = 50;
      const tableWidth = 200;
      const tableHeaderHeight = 30;
      const rowHeight = 25;

      // Calculate bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      diagramData.tables.forEach(table => {
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
      diagramData.relationships.forEach(relationship => {
        const fromTable = diagramData.tables.find(t => t.id === relationship.fromTableId);
        const toTable = diagramData.tables.find(t => t.id === relationship.toTableId);

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
      diagramData.tables.forEach(table => {
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
      return {
        success: true,
        data: svg.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export SVG',
      };
    }
  }

  /**
   * Escape SQL identifier
   */
  private escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Escape SQL value
   */
  private escapeValue(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
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
