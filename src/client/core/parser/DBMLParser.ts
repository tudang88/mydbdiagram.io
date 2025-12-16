import { Parser, ParseResult, ParseError } from './ParserInterface';
import { Diagram } from '../diagram/Diagram';
import { Relationship } from '../relationship/Relationship';
import { DiagramData } from '../../types/diagram.types';
import { TableData } from '../../types/table.types';
import { ValidationResult, ConstraintType } from '../../types/common.types';

/**
 * DBML Parser
 * Parses DBML (Database Markup Language) format similar to dbdiagram.io
 * Supports:
 * - Table definitions: Table table_name { ... }
 * - Column definitions: column_name type [constraints]
 * - Relationships: Ref: table1.col1 > table2.col2 or Ref: table1.col1 < table2.col2
 */
export class DBMLParser implements Parser<string, Diagram> {
  /**
   * Parse DBML to Diagram
   */
  parse(input: string): ParseResult<Diagram> {
    try {
      const { tables, relationships } = this.parseDBML(input);

      // Create diagram with tables first
      const diagramData: DiagramData = {
        id: `diagram-${Date.now()}`,
        tables,
        relationships: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const diagram = Diagram.fromJSON(diagramData);

      // Add relationships after diagram is created
      relationships.forEach((rel, index) => {
        const fromTable = diagram.getTable(rel.fromTable);
        const toTable = diagram.getTable(rel.toTable);
        if (fromTable && toTable) {
          const fromColumn = fromTable.getAllColumns().find(c => c.name === rel.fromColumn);
          const toColumn = toTable.getAllColumns().find(c => c.name === rel.toColumn);
          if (fromColumn && toColumn) {
            try {
              const relationship = new Relationship(
                `rel-${index + 1}`,
                rel.fromTable, // fromTableId
                fromColumn.id, // fromColumnId
                rel.toTable, // toTableId
                toColumn.id, // toColumnId
                'ONE_TO_MANY',
                false
              );
              diagram.addRelationship(relationship);
              console.log(
                `✅ Created relationship ${index + 1}: ${fromTable.getName()}.${fromColumn.name} -> ${toTable.getName()}.${toColumn.name}`
              );
            } catch (err) {
              console.error('❌ Failed to create relationship:', err, rel);
            }
          } else {
            console.warn('⚠️ Column not found:', {
              fromTable: fromTable.getName(),
              fromColumn: rel.fromColumn,
              toTable: toTable.getName(),
              toColumn: rel.toColumn,
              fromColumns: fromTable.getAllColumns().map(c => c.name),
              toColumns: toTable.getAllColumns().map(c => c.name),
            });
          }
        } else {
          console.warn('⚠️ Table not found:', {
            fromTableId: rel.fromTable,
            toTableId: rel.toTable,
            availableTables: Array.from(
              diagram.getAllTables().map(t => ({ id: t.getId(), name: t.getName() }))
            ),
          });
        }
      });

      console.log(
        `📊 Parsed ${tables.length} tables and created ${diagram.getAllRelationships().length} relationships`
      );

      return {
        success: true,
        data: diagram,
      };
    } catch (error) {
      const errors: ParseError[] = [
        {
          message: error instanceof Error ? error.message : 'Failed to parse DBML',
        },
      ];
      return {
        success: false,
        errors,
      };
    }
  }

  /**
   * Validate DBML input
   */
  validate(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        errors: [{ field: 'input', message: 'DBML input is required' }],
      };
    }

    // Basic validation - check for Table keyword
    if (!input.match(/Table\s+\w+/i)) {
      return {
        isValid: false,
        errors: [{ field: 'input', message: 'DBML must contain Table definitions' }],
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Check if input can be parsed as DBML
   */
  canParse(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    // Check for DBML patterns: Table keyword and curly braces
    return /Table\s+\w+\s*\{/i.test(input);
  }

  /**
   * Parse DBML format
   */
  private parseDBML(dbml: string): {
    tables: TableData[];
    relationships: Array<{
      fromTable: string;
      toTable: string;
      fromColumn: string;
      toColumn: string;
    }>;
  } {
    const tables: TableData[] = [];
    const relationships: Array<{
      fromTable: string;
      toTable: string;
      fromColumn: string;
      toColumn: string;
    }> = [];
    const lines = dbml.split('\n');
    let currentTable: Partial<TableData> | null = null;
    let tableIdCounter = 0;
    let columnIdCounter = 0;
    const tableNameMap = new Map<string, string>(); // Map table name to table ID

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('//')) {
        continue;
      }

      // Table definition: Table table_name {
      const tableMatch = line.match(/Table\s+(\w+)\s*\{/i);
      if (tableMatch) {
        // Save previous table if exists
        if (currentTable && currentTable.name) {
          tables.push(this.finalizeTable(currentTable as Partial<TableData>));
        }

        tableIdCounter++;
        const tableName = tableMatch[1];
        const tableId = `table-${tableIdCounter}`;
        tableNameMap.set(tableName.toLowerCase(), tableId);
        currentTable = {
          id: tableId,
          name: tableName,
          position: { x: 100 + (tableIdCounter - 1) * 300, y: 100 },
          columns: [],
        };
        continue;
      }

      // End of table definition: }
      if (line === '}' && currentTable) {
        if (currentTable.name) {
          tables.push(this.finalizeTable(currentTable as Partial<TableData>));
        }
        currentTable = null;
        continue;
      }

      // Column definition: column_name type [constraints]
      if (currentTable) {
        // Match: column_name type [note: '...'] or column_name type [constraints]
        // Also handle: column_name type without brackets
        const columnMatch = line.match(/^(\w+)\s+(\w+(?:\s*\([^)]+\))?)\s*(?:\[([^\]]+)\])?/);
        if (columnMatch) {
          columnIdCounter++;
          const columnName = columnMatch[1];
          const columnType = columnMatch[2].trim();
          const constraintsStr = columnMatch[3] || '';
          const constraints: Array<{ type: ConstraintType; value?: string }> = [];

          // Parse constraints (case-insensitive)
          const lowerConstraints = constraintsStr.toLowerCase();
          if (lowerConstraints.includes('primary key') || lowerConstraints.includes('pk')) {
            constraints.push({ type: 'PRIMARY_KEY' });
          }
          if (lowerConstraints.includes('not null')) {
            constraints.push({ type: 'NOT_NULL' });
          }
          if (lowerConstraints.includes('unique')) {
            constraints.push({ type: 'UNIQUE' });
          }
          // Note: 'note: ...' is just metadata, not a constraint

          currentTable.columns!.push({
            id: `col-${columnIdCounter}`,
            name: columnName,
            type: columnType,
            constraints,
          });
          continue;
        }
      }

      // Relationship definition: Ref: table1.col1 > table2.col2 or Ref: table1.col1 < table2.col2
      // Also supports: Ref name: table1.col1 > table2.col2
      const refMatch = line.match(/Ref(?:\s+\w+)?:\s*(\w+)\.(\w+)\s*([<>])\s*(\w+)\.(\w+)/i);
      if (refMatch) {
        const table1Name = refMatch[1];
        const col1Name = refMatch[2];
        const direction = refMatch[3];
        const table2Name = refMatch[4];
        const col2Name = refMatch[5];

        const table1Id = tableNameMap.get(table1Name.toLowerCase());
        const table2Id = tableNameMap.get(table2Name.toLowerCase());

        if (table1Id && table2Id) {
          if (direction === '>') {
            // table1.col1 > table2.col2 means table1.col1 references table2.col2
            relationships.push({
              fromTable: table1Id,
              toTable: table2Id,
              fromColumn: col1Name,
              toColumn: col2Name,
            });
          } else if (direction === '<') {
            // table1.col1 < table2.col2 means table2.col2 references table1.col1
            relationships.push({
              fromTable: table2Id,
              toTable: table1Id,
              fromColumn: col2Name,
              toColumn: col1Name,
            });
          }
        }
        continue;
      }
    }

    // Save last table if exists
    if (currentTable && currentTable.name) {
      tables.push(this.finalizeTable(currentTable as Partial<TableData>));
    }

    return { tables, relationships };
  }

  /**
   * Finalize table data
   */
  private finalizeTable(table: Partial<TableData>): TableData {
    return {
      id: table.id || 'table-unknown',
      name: table.name || 'Unknown',
      position: table.position || { x: 0, y: 0 },
      columns: table.columns || [],
    };
  }
}
