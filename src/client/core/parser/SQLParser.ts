import { Parser, ParseResult, ParseError } from './ParserInterface';
import { Diagram } from '../diagram/Diagram';
import { Relationship } from '../relationship/Relationship';
import { DiagramData } from '../../types/diagram.types';
import { TableData } from '../../types/table.types';
import { ValidationResult, ConstraintType } from '../../types/common.types';

/**
 * SQL Parser
 * Parses SQL DDL statements to Diagram
 * Basic implementation - supports simple CREATE TABLE statements
 */
export class SQLParser implements Parser<string, Diagram> {
  /**
   * Parse SQL DDL to Diagram
   */
  parse(input: string): ParseResult<Diagram> {
    try {
      const { tables, relationships } = this.parseSQL(input);

      // Convert relationships to RelationshipData format
      // First create diagram with tables
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
          }
        }
      });

      return {
        success: true,
        data: diagram,
      };
    } catch (error) {
      const errors: ParseError[] = [
        {
          message: error instanceof Error ? error.message : 'Failed to parse SQL',
        },
      ];
      return {
        success: false,
        errors,
      };
    }
  }

  /**
   * Validate SQL input
   */
  validate(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        errors: [{ field: 'input', message: 'SQL input is required' }],
      };
    }

    // Basic validation - check for CREATE TABLE
    if (!input.toUpperCase().includes('CREATE TABLE')) {
      return {
        isValid: false,
        errors: [{ field: 'input', message: 'SQL must contain CREATE TABLE statements' }],
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Check if input can be parsed as SQL
   */
  canParse(input: unknown): boolean {
    if (typeof input !== 'string') {
      return false;
    }

    const upperInput = input.toUpperCase();
    return upperInput.includes('CREATE') && upperInput.includes('TABLE');
  }

  /**
   * Parse SQL DDL statements
   * Basic implementation - supports simple CREATE TABLE with FOREIGN KEY
   */
  private parseSQL(sql: string): {
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
    const lines = sql.split('\n');
    let currentTable: Partial<TableData> | null = null;
    let tableIdCounter = 0;
    let columnIdCounter = 0;
    const tableNameMap = new Map<string, string>(); // Map table name to table ID

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();

      // CREATE TABLE statement
      if (upperLine.startsWith('CREATE TABLE')) {
        // Save previous table if exists
        if (currentTable && currentTable.name) {
          tables.push(this.finalizeTable(currentTable as Partial<TableData>));
        }

        // Extract table name
        const match = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/i);
        if (match) {
          tableIdCounter++;
          const tableName = match[1];
          const tableId = `table-${tableIdCounter}`;
          tableNameMap.set(tableName.toLowerCase(), tableId);
          currentTable = {
            id: tableId,
            name: tableName,
            position: { x: 100 + (tableIdCounter - 1) * 300, y: 100 },
            columns: [],
          };
        }
      }
      // FOREIGN KEY definition (standalone or inline)
      else if (upperLine.includes('FOREIGN KEY') || upperLine.includes('REFERENCES')) {
        if (currentTable) {
          // Parse FOREIGN KEY (column_name) REFERENCES table_name(column_name)
          const fkMatch = line.match(
            /FOREIGN\s+KEY\s*\([`"]?(\w+)[`"]?\)\s+REFERENCES\s+[`"]?(\w+)[`"]?\s*\([`"]?(\w+)[`"]?\)/i
          );
          if (fkMatch) {
            const fromColumn = fkMatch[1];
            const toTableName = fkMatch[2];
            const toColumn = fkMatch[3];
            const toTableId = tableNameMap.get(toTableName.toLowerCase());
            if (toTableId && currentTable.id) {
              relationships.push({
                fromTable: currentTable.id,
                toTable: toTableId,
                fromColumn,
                toColumn,
              });
            }
          }
          // Parse inline: column_name TYPE REFERENCES table_name(column_name)
          else {
            const inlineFkMatch = line.match(
              /[`"]?(\w+)[`"]?\s+\w+(?:\([^)]+\))?\s+REFERENCES\s+[`"]?(\w+)[`"]?\s*\([`"]?(\w+)[`"]?\)/i
            );
            if (inlineFkMatch) {
              const fromColumn = inlineFkMatch[1];
              const toTableName = inlineFkMatch[2];
              const toColumn = inlineFkMatch[3];
              const toTableId = tableNameMap.get(toTableName.toLowerCase());
              if (toTableId && currentTable.id) {
                relationships.push({
                  fromTable: currentTable.id,
                  toTable: toTableId,
                  fromColumn,
                  toColumn,
                });
              }
            }
          }
        }
      }
      // Column definition
      else if (
        currentTable &&
        line &&
        !upperLine.startsWith('PRIMARY KEY') &&
        !upperLine.startsWith('FOREIGN KEY') &&
        !upperLine.startsWith('CONSTRAINT') &&
        !line.startsWith(')') &&
        !upperLine.includes('REFERENCES')
      ) {
        const columnMatch = line.match(/[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]+\))?)/i);
        if (columnMatch) {
          columnIdCounter++;
          const columnName = columnMatch[1];
          const columnType = columnMatch[2];
          const constraints: Array<{ type: ConstraintType; value?: string }> = [];

          // Check for constraints
          if (upperLine.includes('PRIMARY KEY')) {
            constraints.push({ type: 'PRIMARY_KEY' });
          }
          if (upperLine.includes('NOT NULL')) {
            constraints.push({ type: 'NOT_NULL' });
          }
          if (upperLine.includes('UNIQUE')) {
            constraints.push({ type: 'UNIQUE' });
          }
          if (upperLine.includes('AUTO_INCREMENT') || upperLine.includes('AUTOINCREMENT')) {
            constraints.push({ type: 'AUTO_INCREMENT' });
          }

          currentTable.columns!.push({
            id: `col-${columnIdCounter}`,
            name: columnName,
            type: columnType,
            constraints,
          });
        }
      }
      // End of table definition
      else if (line === ');' || line === ')') {
        if (currentTable && currentTable.name) {
          tables.push(this.finalizeTable(currentTable as Partial<TableData>));
          currentTable = null;
        }
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
