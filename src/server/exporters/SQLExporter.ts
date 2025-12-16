import { Exporter, ExportResult, ExportOptions } from './ExporterInterface';
import { DiagramData } from '../../client/types/diagram.types';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * SQL Exporter
 * Exports diagram as SQL DDL statements
 */
export class SQLExporter implements Exporter {
  constructor() {}

  getFormat(): string {
    return 'sql';
  }

  async export(diagram: DiagramData, options?: ExportOptions): Promise<ExportResult> {
    try {
      const sql = this.generateSQL(diagram);
      const outputDir = options?.outputDirectory || './output';
      const filename = options?.filename || `${diagram.id}-${Date.now()}.sql`;
      const filePath = join(outputDir, filename);

      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Write SQL file as text
      await fs.writeFile(filePath, sql, 'utf-8');

      return {
        success: true,
        filePath,
        data: sql,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate SQL DDL statements from diagram
   */
  private generateSQL(diagram: DiagramData): string {
    const lines: string[] = [];

    // Add header comment
    lines.push('-- Generated SQL DDL from MyDBDiagram.io');
    lines.push(`-- Diagram: ${diagram.id}`);
    lines.push(`-- Created: ${diagram.metadata.createdAt}`);
    lines.push('');

    // Generate CREATE TABLE statements
    diagram.tables.forEach(table => {
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
    diagram.relationships.forEach(relationship => {
      const fromTable = diagram.tables.find(t => t.id === relationship.fromTableId);
      const toTable = diagram.tables.find(t => t.id === relationship.toTableId);
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

    return lines.join('\n');
  }

  /**
   * Escape SQL identifier
   */
  private escapeIdentifier(identifier: string): string {
    // Simple escaping - wrap in backticks
    return `\`${identifier.replace(/`/g, '``')}\``;
  }

  /**
   * Escape SQL value
   */
  private escapeValue(value: string): string {
    // Simple escaping - wrap in single quotes
    return `'${value.replace(/'/g, "''")}'`;
  }
}
