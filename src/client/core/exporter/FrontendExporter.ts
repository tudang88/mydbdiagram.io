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
   * Matches the canvas rendering exactly
   */
  exportSVG(diagram: Diagram): FrontendExportResult {
    try {
      const diagramData = diagram.toJSON();
      const padding = 50;
      // Match canvas dimensions exactly
      const TABLE_WIDTH = 200;
      const TABLE_HEADER_HEIGHT = 40;
      const COLUMN_HEIGHT = 30;
      const MARKER_ONE_OFFSET = 10;
      const MARKER_MANY_OFFSET = 1;
      const MARKER_SIZE = 12;
      const HORIZONTAL_OFFSET = Math.max(40, MARKER_ONE_OFFSET + MARKER_SIZE + 15);

      // Calculate bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      diagramData.tables.forEach(table => {
        const x = table.position.x;
        const y = table.position.y;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + TABLE_WIDTH);
        maxY = Math.max(maxY, y + height);
      });

      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      const svg: string[] = [];
      svg.push('<?xml version="1.0" encoding="UTF-8"?>');
      svg.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);
      svg.push(`<rect width="${width}" height="${height}" fill="white"/>`);

      // Helper function to get constraint icons
      const getConstraintIcons = (constraints: Array<{ type: string }>): string => {
        return constraints
          .map(c => {
            if (c.type === 'PRIMARY_KEY') return '🔑';
            if (c.type === 'FOREIGN_KEY') return '🔗';
            if (c.type === 'NOT_NULL') return '!';
            if (c.type === 'UNIQUE') return 'U';
            return '';
          })
          .join('');
      };

      // Helper function to determine if column is MANY or ONE
      const getIsMany = (
        relationshipType: string,
        column: { constraints: Array<{ type: string }> }
      ): boolean => {
        if (relationshipType === 'MANY_TO_MANY') return true;
        if (relationshipType === 'ONE_TO_ONE') return false;
        // ONE_TO_MANY: column with foreign key = MANY, column with primary key = ONE
        const hasPk = column.constraints.some(c => c.type === 'PRIMARY_KEY');
        const hasFk = column.constraints.some(c => c.type === 'FOREIGN_KEY');
        return hasFk || (hasPk ? false : true);
      };

      // Helper function to render ONE marker
      const renderOneMarker = (x: number, y: number): string => {
        const lineLength = MARKER_SIZE * 1.5;
        return `<line x1="${x}" y1="${y - lineLength / 2}" x2="${x}" y2="${y + lineLength / 2}" stroke="#666" stroke-width="1.5"/>`;
      };

      // Helper function to render MANY marker (>)
      const renderManyMarker = (x: number, y: number, direction: 'left' | 'right'): string => {
        const arrowSize = MARKER_SIZE;
        const halfSize = arrowSize / 2;
        if (direction === 'right') {
          return `<g stroke="#666" stroke-width="1.5" fill="none">
            <line x1="${x}" y1="${y - halfSize}" x2="${x + arrowSize}" y2="${y}"/>
            <line x1="${x}" y1="${y + halfSize}" x2="${x + arrowSize}" y2="${y}"/>
          </g>`;
        } else {
          return `<g stroke="#666" stroke-width="1.5" fill="none">
            <line x1="${x}" y1="${y - halfSize}" x2="${x - arrowSize}" y2="${y}"/>
            <line x1="${x}" y1="${y + halfSize}" x2="${x - arrowSize}" y2="${y}"/>
          </g>`;
        }
      };

      // Draw relationships with orthogonal routing (match canvas)
      diagramData.relationships.forEach(relationship => {
        const fromTable = diagramData.tables.find(t => t.id === relationship.fromTableId);
        const toTable = diagramData.tables.find(t => t.id === relationship.toTableId);

        if (!fromTable || !toTable) return;

        const fromColumn = fromTable.columns.find(c => c.id === relationship.fromColumnId);
        const toColumn = toTable.columns.find(c => c.id === relationship.toColumnId);

        if (!fromColumn || !toColumn) return;

        const fromColumnIndex = fromTable.columns.findIndex(c => c.id === relationship.fromColumnId);
        const toColumnIndex = toTable.columns.findIndex(c => c.id === relationship.toColumnId);

        const fromPos = {
          x: fromTable.position.x - minX + padding,
          y: fromTable.position.y - minY + padding,
        };
        const toPos = {
          x: toTable.position.x - minX + padding,
          y: toTable.position.y - minY + padding,
        };

        const fromColumnY = fromPos.y + TABLE_HEADER_HEIGHT + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
        const toColumnY = toPos.y + TABLE_HEADER_HEIGHT + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

        const fromLeft = fromPos.x;
        const fromRight = fromPos.x + TABLE_WIDTH;
        const toLeft = toPos.x;
        const toRight = toPos.x + TABLE_WIDTH;

        const fromCenterX = fromPos.x + TABLE_WIDTH / 2;
        const toCenterX = toPos.x + TABLE_WIDTH / 2;

        const relationshipType = relationship.type;
        const isFirstTable = (tableId: string) => tableId === 'table-1';
        const isFromTableFirst = isFirstTable(fromTable.id);
        const isToTableFirst = isFirstTable(toTable.id);

        const getMarkerOffset = (isMany: boolean, isFirst: boolean) => {
          if (isMany) return MARKER_MANY_OFFSET;
          return isFirst ? MARKER_ONE_OFFSET + 10 : MARKER_ONE_OFFSET;
        };

        let fromX: number;
        let toX: number;
        let path: string;
        let markerStartX: number;
        let markerStartY: number;
        let markerEndX: number;
        let markerEndY: number;
        let startDirection: 'left' | 'right';
        let endDirection: 'left' | 'right';
        let fromIsMany: boolean;
        let toIsMany: boolean;

        if (relationshipType === 'MANY_TO_MANY') {
          fromIsMany = true;
          toIsMany = true;
        } else if (relationshipType === 'ONE_TO_ONE') {
          fromIsMany = false;
          toIsMany = false;
        } else {
          const fromColumnIsPk = fromColumn.constraints.some(c => c.type === 'PRIMARY_KEY');
          const toColumnIsPk = toColumn.constraints.some(c => c.type === 'PRIMARY_KEY');
          const fromColumnIsFk = fromColumn.constraints.some(c => c.type === 'FOREIGN_KEY');
          const toColumnIsFk = toColumn.constraints.some(c => c.type === 'FOREIGN_KEY');
          fromIsMany = fromColumnIsFk || (fromColumnIsPk ? false : true);
          toIsMany = toColumnIsFk || (toColumnIsPk ? false : true);
        }

        if (fromCenterX < toCenterX) {
          fromX = fromRight;
          toX = toLeft;
          const midX = fromX + HORIZONTAL_OFFSET;
          path = `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`;
          markerStartX = fromX + getMarkerOffset(fromIsMany, isFromTableFirst);
          markerStartY = fromColumnY;
          markerEndX = toX - getMarkerOffset(toIsMany, isToTableFirst);
          markerEndY = toColumnY;
          startDirection = 'right';
          endDirection = 'left';
        } else {
          fromX = fromLeft;
          toX = toRight;
          const midX = fromX - HORIZONTAL_OFFSET;
          path = `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`;
          markerStartX = fromX - getMarkerOffset(fromIsMany, isFromTableFirst);
          markerStartY = fromColumnY;
          markerEndX = toX + getMarkerOffset(toIsMany, isToTableFirst);
          markerEndY = toColumnY;
          startDirection = 'left';
          endDirection = 'right';
        }

        // Draw relationship path
        svg.push(`<path d="${path}" stroke="#666" stroke-width="1" fill="none"/>`);

        // Draw markers
        if (relationshipType === 'ONE_TO_ONE') {
          svg.push(renderOneMarker(markerStartX, markerStartY));
          svg.push(renderOneMarker(markerEndX, markerEndY));
        } else if (relationshipType === 'ONE_TO_MANY') {
          svg.push(renderManyMarker(markerStartX, markerStartY, startDirection));
          svg.push(renderOneMarker(markerEndX, markerEndY));
        } else if (relationshipType === 'MANY_TO_MANY') {
          svg.push(renderManyMarker(markerStartX, markerStartY, startDirection));
          svg.push(renderManyMarker(markerEndX, markerEndY, endDirection));
        } else {
          svg.push(renderManyMarker(markerStartX, markerStartY, startDirection));
          svg.push(renderOneMarker(markerEndX, markerEndY));
        }
      });

      // Draw tables (match canvas styling)
      diagramData.tables.forEach(table => {
        const x = table.position.x - minX + padding;
        const y = table.position.y - minY + padding;
        const tableHeight = TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT;

        // Table rectangle (white background, gray border)
        svg.push(
          `<rect x="${x}" y="${y}" width="${TABLE_WIDTH}" height="${tableHeight}" fill="white" stroke="#ddd" stroke-width="2" rx="4"/>`
        );

        // Table header (light gray background, match canvas)
        svg.push(
          `<rect x="${x}" y="${y}" width="${TABLE_WIDTH}" height="${TABLE_HEADER_HEIGHT}" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="4 4 0 0"/>`
        );
        svg.push(
          `<text x="${x + TABLE_WIDTH / 2}" y="${y + TABLE_HEADER_HEIGHT / 2 + 5}" text-anchor="middle" fill="#333" font-weight="600" font-size="14" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(table.name)}</text>`
        );

        // Columns
        table.columns.forEach((column, index) => {
          const colY = y + TABLE_HEADER_HEIGHT + index * COLUMN_HEIGHT;
          const constraintIcons = getConstraintIcons(column.constraints);
          const colText = `${column.name} ${column.type}${constraintIcons ? ' ' + constraintIcons : ''}`;
          
          svg.push(
            `<text x="${x + 12}" y="${colY + COLUMN_HEIGHT / 2 + 4}" fill="#333" font-size="12" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(colText)}</text>`
          );
          
          if (index < table.columns.length - 1) {
            svg.push(
              `<line x1="${x}" y1="${colY + COLUMN_HEIGHT}" x2="${x + TABLE_WIDTH}" y2="${colY + COLUMN_HEIGHT}" stroke="#f0f0f0" stroke-width="1"/>`
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
