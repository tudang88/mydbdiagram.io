import { Diagram } from '../diagram/Diagram';

/**
 * When every table has a rendered `.table-node`, use the same box as the canvas
 * (offsetLeft/offsetTop + offsetWidth) so SVG routing matches RelationshipLine.tsx.
 */
function tryApplyDomBoxToSvgLayout(
  diagramData: {
    tables: Array<{ id: string; position: { x: number; y: number } }>;
  },
  tableWidthById: Map<string, number>,
  minTableWidth: number
): boolean {
  if (typeof document === 'undefined') return false;
  const byId = new Map<string, HTMLElement>();
  for (const t of diagramData.tables) {
    const el = document.querySelector(`.table-node[data-table-id="${t.id}"]`) as HTMLElement | null;
    if (!el) return false;
    byId.set(t.id, el);
  }
  for (const t of diagramData.tables) {
    const el = byId.get(t.id)!;
    t.position = { x: el.offsetLeft, y: el.offsetTop };
    const w = el.offsetWidth;
    tableWidthById.set(t.id, Math.max(minTableWidth, w > 0 ? w : minTableWidth));
  }
  return true;
}

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
      // Always anchor layout to live Table positions (same as canvas), not a stale JSON view
      for (const row of diagramData.tables) {
        const live = diagram.getTable(row.id);
        if (live) {
          const p = live.getPosition();
          row.position = { x: p.x, y: p.y };
        }
      }
      const padding = 50;
      const MIN_TABLE_WIDTH = 200;
      const TABLE_HEADER_HEIGHT_NO_DESC = 40;
      /** Header height when table has COMMENT ON TABLE (metadata.description); matches ~2 lines + title */
      const TABLE_HEADER_HEIGHT_WITH_DESC = 72;
      const COLUMN_HEIGHT = 30;
      const TABLE_DESC_MAX_PX = 30 * 7; // ~30ch like .table-description in TableNode.css
      const MARKER_ONE_OFFSET = 10;
      const MARKER_MANY_OFFSET = 1;
      const MARKER_SIZE = 12;
      const HORIZONTAL_OFFSET = Math.max(40, MARKER_ONE_OFFSET + MARKER_SIZE + 15);
      /** Match RelationshipLine.tsx — anchors sit just outside the table border */
      const TABLE_EDGE_GAP_LEFT = 4;
      const TABLE_EDGE_GAP_RIGHT = 6;

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

      // Column name: font-weight 500 + system-ui runs wider than 0.56em-per-char; without this, type x overlaps the name.
      const estimateColumnNameWidth = (name: string): number =>
        estimateTextWidth(name, 12) * 1.16 + 4;
      // Type: monospace; slightly wider than the generic Latin estimate.
      const estimateTypeCellWidth = (typeStr: string): number =>
        estimateTextWidth(typeStr, 11) * 1.06;

      const getTableDescription = (table: (typeof diagramData.tables)[0]): string | undefined => {
        const d = table.metadata?.description?.trim();
        return d || undefined;
      };

      const wrapTableDescriptionTwoLines = (
        text: string,
        maxLineWidth: number,
        fontSize: number
      ): { line1: string; line2?: string } => {
        if (estimateTextWidth(text, fontSize) <= maxLineWidth) {
          return { line1: text };
        }
        let lo = 0;
        let hi = text.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (estimateTextWidth(text.slice(0, mid), fontSize) <= maxLineWidth) lo = mid;
          else hi = mid - 1;
        }
        let breakPos = lo;
        const spaceIdx = text.lastIndexOf(' ', breakPos);
        if (spaceIdx > 0 && spaceIdx >= breakPos * 0.35) breakPos = spaceIdx;
        const line1 = text.slice(0, breakPos).trimEnd();
        const rest = text.slice(breakPos).trimStart();
        if (!rest) return { line1 };
        if (estimateTextWidth(rest, fontSize) <= maxLineWidth) {
          return { line1, line2: rest };
        }
        const line2 = truncateText(rest, maxLineWidth, fontSize);
        return { line1, line2 };
      };

      // Calculate dynamic width per table so export matches ERD better.
      const tableWidthById = new Map<string, number>();
      const tableHeaderHeightById = new Map<string, number>();
      diagramData.tables.forEach(table => {
        const leftPadding = 12;
        const rightPadding = 8;
        const nameTypeGap = 8;
        const typeCommentGap = 8;
        const commentToBadgeGap = 8;
        const badgeWidth = 22;
        const badgeGap = 4;
        const maxCommentWidth = 280;

        const tableDesc = getTableDescription(table);
        let headerWidth = estimateTextWidth(table.name, 14) + 24;
        if (tableDesc) {
          headerWidth = Math.max(
            headerWidth,
            Math.min(TABLE_DESC_MAX_PX, estimateTextWidth(tableDesc, 11)) + 24
          );
        }
        tableHeaderHeightById.set(
          table.id,
          tableDesc ? TABLE_HEADER_HEIGHT_WITH_DESC : TABLE_HEADER_HEIGHT_NO_DESC
        );
        let maxRowWidth = 0;

        table.columns.forEach(column => {
          const nameWidth = estimateColumnNameWidth(column.name);
          const typeWidth = estimateTypeCellWidth(column.type);
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

      // Prefer painted layout in the browser so lines/widths match RelationshipLine (DOM measurement).
      tryApplyDomBoxToSvgLayout(diagramData, tableWidthById, MIN_TABLE_WIDTH);

      // Calculate bounds
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      diagramData.tables.forEach(table => {
        const x = table.position.x;
        const y = table.position.y;
        const tableWidth = tableWidthById.get(table.id) || MIN_TABLE_WIDTH;
        const headerH = tableHeaderHeightById.get(table.id) ?? TABLE_HEADER_HEIGHT_NO_DESC;
        const height = headerH + table.columns.length * COLUMN_HEIGHT;
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
        const fromHeaderH = tableHeaderHeightById.get(fromTable.id) ?? TABLE_HEADER_HEIGHT_NO_DESC;
        const toHeaderH = tableHeaderHeightById.get(toTable.id) ?? TABLE_HEADER_HEIGHT_NO_DESC;

        const fromColumnY =
          fromPos.y + fromHeaderH + fromColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;
        const toColumnY = toPos.y + toHeaderH + toColumnIndex * COLUMN_HEIGHT + COLUMN_HEIGHT / 2;

        const fromLeft = fromPos.x;
        const fromRight = fromPos.x + fromTableWidth;
        const toLeft = toPos.x;
        const toRight = toPos.x + toTableWidth;

        const fromCenterX = fromPos.x + fromTableWidth / 2;
        const toCenterX = toPos.x + toTableWidth / 2;

        const relationshipType = relationship.type;

        const markerOffsets = (() => {
          if (relationshipType === 'ONE_TO_ONE') {
            return { start: MARKER_ONE_OFFSET, end: MARKER_ONE_OFFSET };
          }
          if (relationshipType === 'ONE_TO_MANY') {
            return { start: MARKER_MANY_OFFSET, end: MARKER_ONE_OFFSET };
          }
          if (relationshipType === 'MANY_TO_MANY') {
            return { start: MARKER_MANY_OFFSET, end: MARKER_MANY_OFFSET };
          }
          return { start: MARKER_MANY_OFFSET, end: MARKER_ONE_OFFSET };
        })();
        const getMarkerOffset = (side: 'start' | 'end') => markerOffsets[side];

        let fromX: number;
        let toX: number;
        let path: string;
        let markerStartX: number;
        let markerStartY: number;
        let markerEndX: number;
        let markerEndY: number;
        let startDirection: 'left' | 'right';
        let endDirection: 'left' | 'right';

        if (fromCenterX < toCenterX) {
          fromX = fromRight + TABLE_EDGE_GAP_RIGHT;
          toX = toLeft - TABLE_EDGE_GAP_LEFT;
          const midX = fromX + HORIZONTAL_OFFSET;
          path = `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`;
          markerStartX = fromX + getMarkerOffset('start');
          markerStartY = fromColumnY;
          markerEndX = toX - getMarkerOffset('end');
          markerEndY = toColumnY;
          startDirection = 'right';
          endDirection = 'left';
        } else {
          fromX = fromLeft - TABLE_EDGE_GAP_LEFT;
          toX = toRight + TABLE_EDGE_GAP_RIGHT;
          const midX = fromX - HORIZONTAL_OFFSET;
          path = `M ${fromX} ${fromColumnY} L ${midX} ${fromColumnY} L ${midX} ${toColumnY} L ${toX} ${toColumnY}`;
          markerStartX = fromX - getMarkerOffset('start');
          markerStartY = fromColumnY;
          markerEndX = toX + getMarkerOffset('end');
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
        const headerH = tableHeaderHeightById.get(table.id) ?? TABLE_HEADER_HEIGHT_NO_DESC;
        const tableHeight = headerH + table.columns.length * COLUMN_HEIGHT;
        const tableDesc = getTableDescription(table);

        // Table rectangle (white background, gray border)
        svg.push(
          `<rect x="${x}" y="${y}" width="${tableWidth}" height="${tableHeight}" fill="white" stroke="#ddd" stroke-width="2" rx="4"/>`
        );

        // Table header (light gray background, match canvas)
        svg.push(
          `<rect x="${x}" y="${y}" width="${tableWidth}" height="${headerH}" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="4 4 0 0"/>`
        );
        if (tableDesc) {
          svg.push(
            `<text x="${x + tableWidth / 2}" y="${y + 20}" text-anchor="middle" fill="#333" font-weight="600" font-size="14" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(table.name)}</text>`
          );
          const maxDescW = Math.max(0, Math.min(TABLE_DESC_MAX_PX, tableWidth - 24));
          const { line1, line2 } = wrapTableDescriptionTwoLines(tableDesc, maxDescW, 11);
          svg.push(
            `<text x="${x + tableWidth / 2}" y="${y + 42}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(line1)}</text>`
          );
          if (line2) {
            svg.push(
              `<text x="${x + tableWidth / 2}" y="${y + 57}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(line2)}</text>`
            );
          }
        } else {
          svg.push(
            `<text x="${x + tableWidth / 2}" y="${y + TABLE_HEADER_HEIGHT_NO_DESC / 2 + 5}" text-anchor="middle" fill="#333" font-weight="600" font-size="14" font-family="system-ui, -apple-system, sans-serif">${this.escapeXML(table.name)}</text>`
          );
        }

        // Columns: same horizontal math as table width (per-row type start — no fixed 96px column).
        table.columns.forEach((column, index) => {
          const colY = y + headerH + index * COLUMN_HEIGHT;
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
          const typeStartX = nameStartX + estimateColumnNameWidth(column.name) + nameTypeGap;
          const typeText = column.type;
          const typeEndX = typeStartX + estimateTypeCellWidth(typeText);

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
