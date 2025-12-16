import { Parser, ParseResult, ParseError } from './ParserInterface';
import { Diagram } from '../diagram/Diagram';
import { DiagramData, TableData } from '../../types/diagram.types';
import { ValidationResult } from '../../types/common.types';

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
      const tables = this.parseSQL(input);
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
   * Basic implementation - supports simple CREATE TABLE
   */
  private parseSQL(sql: string): TableData[] {
    const tables: TableData[] = [];
    const lines = sql.split('\n');
    let currentTable: Partial<TableData> | null = null;
    let tableIdCounter = 0;
    let columnIdCounter = 0;

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
          currentTable = {
            id: `table-${tableIdCounter}`,
            name: match[1],
            position: { x: 100 + (tableIdCounter - 1) * 300, y: 100 },
            columns: [],
          };
        }
      }
      // Column definition
      else if (currentTable && line && !upperLine.startsWith('PRIMARY KEY') && !upperLine.startsWith('FOREIGN KEY') && !upperLine.startsWith('CONSTRAINT') && !line.startsWith(')')) {
        const columnMatch = line.match(/[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]+\))?)/i);
        if (columnMatch) {
          columnIdCounter++;
          const columnName = columnMatch[1];
          const columnType = columnMatch[2];
          const constraints: Array<{ type: string; value?: string }> = [];

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

    return tables;
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

