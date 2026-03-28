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
      const MIN_TABLE_WIDTH = 200;
      const TABLE_HEADER_HEIGHT = 40;
      const COLUMN_HEIGHT = 30;
      const MARKER_ONE_OFFSET = 10;
      const MARKER_MANY_OFFSET = 1;
      const MARKER_SIZE = 12;
      const HORIZONTAL_OFFSET = Math.max(40, MARKER_ONE_OFFSET + MARKER_SIZE + 15);

      // Text width approximation (Latin vs CJK/fullwidth — avoids comment overlap in SVG).
      const estimateTextWidth = (text: string, fontSize: number): number => {
        let sum = 0;
        for (const ch of text) {
          const cp = ch.codePointAt(0) ?? 0;
          const wide =
            cp > 0x7f ||
            (cp >= 0x2e80 && cp <= 0x9fff) ||
            (cp >= 0xff00 && cp <= 0xffef) ||
            (cp >= 0x3000 && cp <= 0x303f);
          sum += wide ? fontSize * 0.92 : fontSize * 0.56;
        }
        return sum;
      };
      const truncateText = (text: string, maxWidth: number, fontSize: number): string => {
        if (maxWidth <= 0) return '';
        if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
        const ellipsis = '...';
        const ellipsisWidth = estimateTextWidth(ellipsis, fontSize);
        if (ellipsisWidth > maxWidth) return '';

        let output = text;
        while (
          output.length > 0 &&
          estimateTextWidth(output, fontSize) + ellipsisWidth > maxWidth
        ) {
          output = output.slice(0, -1);
        }
        return output ? `${output}${ellipsis}` : '';
      };

      // Calculate dynamic width per table so export matches ERD better.
      const tableWidthById = new Map<string, number>();
      diagramData.tables.forEach(table => {
        const leftPadding = 12;
        const rightPadding = 8;
        const nameTypeGap = 8;
        const typeCommentGap = 8;
        const commentToBadgeGap = 8;
        const badgeWidth = 22;
        const badgeGap = 4;
        const maxCommentWidth = 280;

        const headerWidth = estimateTextWidth(table.name, 14) + 24;
        let maxRowWidth = 0;

        table.columns.forEach(column => {
          const nameWidth = estimateTextWidth(column.name, 12);
          const typeWidth = estimateTextWidth(column.type, 11);
          const commentWidth = column.comment
            ? Math.min(maxCommentWidth, estimateTextWidth(column.comment, 11))
            : 0;
          const badgesWidth =
            column.constraints.length > 0
              ? column.constraints.length * badgeWidth + (column.constraints.length - 1) * badgeGap
              : 0;

          const rowWidth =
            leftPadding +
            nameWidth +
            nameTypeGap +
            typeWidth +
            (commentWidth > 0 ? typeCommentGap + commentWidth : 0) +
            (badgesWidth > 0 ? commentToBadgeGap + badgesWidth : 0) +
            rightPadding;
          maxRowWidth = Math.max(maxRowWidth, rowWidth);
        });

        const tableWidth = Math.max(MIN_TABLE_WIDTH, Math.ceil(Math.max(headerWidth, maxRowWidth)));
        tableWidthById.set(table.id, tableWidth);
      });

      // Calculate bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      diagramData.tables.forEach(table => {
        const x = table.position.x;
        const y = table.position.y;
        const tableWidth = tableWidthById.get(table.id) || MIN_TABLE_WIDTH;
        const height = TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT;
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

      // Helper functions for constraint badge rendering (match TableNode)
      const getConstraintLabel = (type: string): string => {
        if (type === 'PRIMARY_KEY') return 'PK';
        if (type === 'FOREIGN_KEY') return 'FK';
        if (type === 'NOT_NULL') return 'NN';
        if (type === 'UNIQUE') return 'UQ';
        return type;
      };

      const getConstraintColors = (
        type: string
      ): { fill: string; stroke: string; text: string } => {
        if (type === 'PRIMARY_KEY') {
          return { fill: '#fffbeb', stroke: '#f59e0b', text: '#92400e' };
        }
        if (type === 'FOREIGN_KEY') {
          return { fill: '#eff6ff', stroke: '#60a5fa', text: '#1d4ed8' };
        }
        if (type === 'NOT_NULL') {
          return { fill: '#fff1f2', stroke: '#fda4af', text: '#be123c' };
        }
        if (type === 'UNIQUE') {
          return { fill: '#f5f3ff', stroke: '#c4b5fd', text: '#6d28d9' };
        }
        return { fill: '#f9fafb', stroke: '#d1d5db', text: '#374151' };
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

        const fromColumnIndex = fromTable.columns.findIndex(
          c => c.id === relationship.fromColumnId
        );
        const toColumnIndex = toTable.columns.findIndex(c => c.id === relationship.toColumnId);

        const fromPos = {
          x: fromTable.position.x - minX + padding,
          y: fromTable.position.y - minY + padding,
        };
        const toPos = {
          x: toTable.position.x - minX + padding,
          y: toTable.position.y - minY + padding,
        };
        const fromTableWidth = tableWidthById.get(fromTable.id) || MIN_TABLE_WIDTH;
        const toTableWidth = tableWidthById.get(toTable.id) || MIN_TABLE_WIDTH;

        const fromColumnY =
          fromPos.y + TABLE_HEADER_HEIGHT + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
        const toColumnY =
          toPos.y + TABLE_HEADER_HEIGHT + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

        const fromLeft = fromPos.x;
        const fromRight = fromPos.x + fromTableWidth;
        const toLeft = toPos.x;
        const toRight = toPos.x + toTableWidth;

        const fromCenterX = fromPos.x + fromTableWidth / 2;
        const toCenterX = toPos.x + toTableWidth / 2;

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
        const tableWidth = tableWidthById.get(table.id) || MIN_TABLE_WIDTH;
        const tableHeight = TABLE_HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT;

        // Table rectangle (white background, gray border)
        svg.push(
          `<rect x="${x}" y="${y}" width="${tableWidth}" height="${tableHeight}" fill="white" stroke="#ddd" stroke-width="2" rx="4"/>`
        );

        // Table header (light gray background, match canvas)
        svg.push(
          `<rect x="${x}" y="${y}" width="${tableWidth}" height="${TABLE_HEADER_HEIGHT}" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="4 4 0 0"/>`
        );
        svg.push(
          `<text x="${x + tableWidth / 2}" y="${y + TABLE_HEADER_HEIGHT / 2 + 5}" text-anchor="middle" fill="#333" font-weight="600" font-size="14" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(table.name)}</text>`
        );

        // Columns: same horizontal math as table width (per-row type start — no fixed 96px column).
        table.columns.forEach((column, index) => {
          const colY = y + TABLE_HEADER_HEIGHT + index * COLUMN_HEIGHT;
          const rowCenterY = colY + COLUMN_HEIGHT / 2;
          const textY = rowCenterY + 4;
          const leftPadding = 12;
          const nameTypeGap = 8;
          const typeCommentGap = 8;
          const commentToBadgeGap = 8;

          // Right side: constraints badges
          const badgeWidth = 22;
          const badgeHeight = 16;
          const badgeGap = 4;
          const badgeRightPadding = 8;
          const badgeTop = rowCenterY - badgeHeight / 2;
          const badgeCount = column.constraints.length;
          const badgesWidth =
            badgeCount > 0 ? badgeCount * badgeWidth + (badgeCount - 1) * badgeGap : 0;
          const badgesStartX = x + tableWidth - badgeRightPadding - badgesWidth;
          const commentAreaRight =
            badgeCount > 0 ? badgesStartX - commentToBadgeGap : x + tableWidth - 8;

          const nameStartX = x + leftPadding;
          const typeStartX = nameStartX + estimateTextWidth(column.name, 12) + nameTypeGap;
          const typeText = column.type;
          const typeEndX = typeStartX + estimateTextWidth(typeText, 11);

          svg.push(
            `<text x="${nameStartX}" y="${textY}" fill="#333" font-size="12" font-weight="500" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(column.name)}</text>`
          );
          if (typeText) {
            svg.push(
              `<text x="${typeStartX}" y="${textY}" fill="#666" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${this.escapeXML(typeText)}</text>`
            );
          }

          column.constraints.forEach((constraint, constraintIndex) => {
            const badgeX = badgesStartX + constraintIndex * (badgeWidth + badgeGap);
            const colors = getConstraintColors(constraint.type);
            const label = getConstraintLabel(constraint.type);

            svg.push(
              `<rect x="${badgeX}" y="${badgeTop}" width="${badgeWidth}" height="${badgeHeight}" rx="4" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>`
            );
            svg.push(
              `<text x="${badgeX + badgeWidth / 2}" y="${textY - 0.5}" text-anchor="middle" fill="${colors.text}" font-size="10" font-weight="600" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(label)}</text>`
            );
          });

          // Comment after type, before badges (start-anchored so it cannot drift over the name)
          if (column.comment) {
            const commentStartX = typeEndX + typeCommentGap;
            const commentMaxWidth = Math.max(0, commentAreaRight - commentStartX);
            const commentText = truncateText(column.comment, commentMaxWidth, 11);
            if (commentText) {
              svg.push(
                `<text x="${commentStartX}" y="${textY}" text-anchor="start" fill="#6b7280" font-size="11" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(commentText)}</text>`
              );
            }
          }

          if (index < table.columns.length - 1) {
            svg.push(
              `<line x1="${x}" y1="${colY + COLUMN_HEIGHT}" x2="${x + tableWidth}" y2="${colY + COLUMN_HEIGHT}" stroke="#f0f0f0" stroke-width="1"/>`
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
