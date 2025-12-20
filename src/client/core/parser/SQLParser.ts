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

      // Step 1: Add all relationships as ONE_TO_MANY first
      const parsedRelationships: Array<{
        relationship: Relationship;
        rawRel: { fromTable: string; toTable: string; fromColumn: string; toColumn: string };
      }> = [];

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
              parsedRelationships.push({ relationship, rawRel: rel });
            } catch (err) {
              console.error('❌ Failed to create relationship:', err, rel);
            }
          }
        }
      });

      // Step 2: Detect MANY_TO_MANY relationships from junction tables
      const manyToManyRelationships = this.detectManyToManyRelationships(
        diagram,
        parsedRelationships
      );

      // Step 3: Add relationships to diagram (excluding junction table relationships that are part of MANY_TO_MANY)
      const junctionTableIds = new Set(
        manyToManyRelationships.map(rel => rel.junctionTableId).filter(Boolean)
      );

      parsedRelationships.forEach(({ relationship, rawRel }) => {
        // Skip relationships from junction tables that are part of MANY_TO_MANY
        if (junctionTableIds.has(rawRel.fromTable)) {
          return;
        }
        diagram.addRelationship(relationship);
        console.log(
          `✅ Created relationship: ${diagram.getTable(relationship.getFromTableId())?.getName()}.${rawRel.fromColumn} -> ${diagram.getTable(relationship.getToTableId())?.getName()}.${rawRel.toColumn}`
        );
      });

      // Step 4: Add MANY_TO_MANY relationships
      manyToManyRelationships.forEach(({ fromTableId, toTableId, fromColumnId, toColumnId }) => {
        try {
          const manyToManyRel = new Relationship(
            `rel-many-to-many-${Date.now()}-${Math.random()}`,
            fromTableId,
            fromColumnId,
            toTableId,
            toColumnId,
            'MANY_TO_MANY',
            false
          );
          diagram.addRelationship(manyToManyRel);
          console.log(
            `✅ Created MANY_TO_MANY relationship: ${diagram.getTable(fromTableId)?.getName()} <-> ${diagram.getTable(toTableId)?.getName()}`
          );
        } catch (err) {
          console.error('❌ Failed to create MANY_TO_MANY relationship:', err);
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
      // FOREIGN KEY definition (standalone only, inline is handled in column definition)
      else if (upperLine.startsWith('FOREIGN KEY')) {
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
              // Add FOREIGN_KEY constraint to the column
              const column = currentTable.columns?.find(c => c.name === fromColumn);
              if (column) {
                column.constraints.push({
                  type: 'FOREIGN_KEY',
                  value: `${toTableName}.${toColumn}`,
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
        !line.startsWith(')')
      ) {
        // Check for inline FOREIGN KEY: column_name TYPE REFERENCES table_name(column_name)
        const inlineFkMatch = line.match(
          /[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]+\))?)\s+REFERENCES\s+[`"]?(\w+)[`"]?\s*\([`"]?(\w+)[`"]?\)/i
        );
        if (inlineFkMatch) {
          const columnName = inlineFkMatch[1];
          const columnType = inlineFkMatch[2];
          const toTableName = inlineFkMatch[3];
          const toColumn = inlineFkMatch[4];
          const toTableId = tableNameMap.get(toTableName.toLowerCase());
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
          // Add FOREIGN_KEY constraint
          constraints.push({
            type: 'FOREIGN_KEY',
            value: `${toTableName}.${toColumn}`,
          });

          columnIdCounter++;
          currentTable.columns!.push({
            id: `col-${columnIdCounter}`,
            name: columnName,
            type: columnType,
            constraints,
          });

          // Add relationship
          if (toTableId && currentTable.id) {
            relationships.push({
              fromTable: currentTable.id,
              toTable: toTableId,
              fromColumn: columnName,
              toColumn,
            });
          }
        } else {
          // Regular column without inline FOREIGN KEY
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

  /**
   * Detect MANY_TO_MANY relationships from junction table pattern
   * Junction table pattern:
   * - Has exactly 2 foreign keys
   * - Both foreign keys are primary keys (composite key)
   * - Has 2 relationships: one to table A, one to table B
   * - Result: MANY_TO_MANY between table A and table B
   */
  private detectManyToManyRelationships(
    diagram: Diagram,
    parsedRelationships: Array<{
      relationship: Relationship;
      rawRel: { fromTable: string; toTable: string; fromColumn: string; toColumn: string };
    }>
  ): Array<{
    fromTableId: string;
    toTableId: string;
    fromColumnId: string;
    toColumnId: string;
    junctionTableId?: string;
  }> {
    const manyToManyRelationships: Array<{
      fromTableId: string;
      toTableId: string;
      fromColumnId: string;
      toColumnId: string;
      junctionTableId?: string;
    }> = [];

    // Group relationships by fromTable (junction table)
    const relationshipsByJunctionTable = new Map<
      string,
      Array<{
        relationship: Relationship;
        rawRel: { fromTable: string; toTable: string; fromColumn: string; toColumn: string };
      }>
    >();

    parsedRelationships.forEach(parsedRel => {
      const junctionTableId = parsedRel.rawRel.fromTable;
      if (!relationshipsByJunctionTable.has(junctionTableId)) {
        relationshipsByJunctionTable.set(junctionTableId, []);
      }
      relationshipsByJunctionTable.get(junctionTableId)!.push(parsedRel);
    });

    // Check each potential junction table
    relationshipsByJunctionTable.forEach((rels, junctionTableId) => {
      // Must have exactly 2 relationships from this table
      if (rels.length !== 2) {
        return;
      }

      const junctionTable = diagram.getTable(junctionTableId);
      if (!junctionTable) {
        return;
      }

      // Check if junction table has 2 foreign keys that are both primary keys
      const columns = junctionTable.getAllColumns();
      const foreignKeyColumns = columns.filter(col =>
        col.constraints.some(c => c.type === 'FOREIGN_KEY')
      );

      // Must have exactly 2 foreign keys
      if (foreignKeyColumns.length !== 2) {
        return;
      }

      // Check if both foreign keys are also primary keys (composite key pattern)
      const primaryKeyColumns = columns.filter(col =>
        col.constraints.some(c => c.type === 'PRIMARY_KEY')
      );

      // Both foreign keys should be primary keys (typical junction table pattern)
      const bothArePrimaryKeys = foreignKeyColumns.every(fkCol =>
        fkCol.constraints.some(c => c.type === 'PRIMARY_KEY')
      );

      if (bothArePrimaryKeys && primaryKeyColumns.length === 2) {
        // This is a junction table! Create MANY_TO_MANY between the two target tables
        const [rel1, rel2] = rels;
        const table1Id = rel1.rawRel.toTable;
        const table2Id = rel2.rawRel.toTable;

        // Get the primary key columns from target tables
        const table1 = diagram.getTable(table1Id);
        const table2 = diagram.getTable(table2Id);

        if (table1 && table2) {
          const table1Pk = table1
            .getAllColumns()
            .find(col => col.constraints.some(c => c.type === 'PRIMARY_KEY'));
          const table2Pk = table2
            .getAllColumns()
            .find(col => col.constraints.some(c => c.type === 'PRIMARY_KEY'));

          if (table1Pk && table2Pk) {
            // Create MANY_TO_MANY relationship
            manyToManyRelationships.push({
              fromTableId: table1Id,
              toTableId: table2Id,
              fromColumnId: table1Pk.id,
              toColumnId: table2Pk.id,
              junctionTableId,
            });
          }
        }
      }
    });

    return manyToManyRelationships;
  }
}
