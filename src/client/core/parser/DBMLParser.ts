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

  /**
   * Detect MANY_TO_MANY relationships from junction table pattern
   * Junction table pattern:
   * - Has exactly 2 relationships from this table to 2 different tables
   * - Both relationship columns are primary keys (composite key pattern)
   * - Result: MANY_TO_MANY between the two target tables
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

      // Get the columns used in relationships
      const [rel1, rel2] = rels;
      const rel1Column = junctionTable.getAllColumns().find(c => c.name === rel1.rawRel.fromColumn);
      const rel2Column = junctionTable.getAllColumns().find(c => c.name === rel2.rawRel.fromColumn);

      if (!rel1Column || !rel2Column) {
        return;
      }

      // Check if both relationship columns are primary keys (composite key pattern)
      const rel1IsPk = rel1Column.constraints.some(c => c.type === 'PRIMARY_KEY');
      const rel2IsPk = rel2Column.constraints.some(c => c.type === 'PRIMARY_KEY');

      // Both columns should be primary keys (typical junction table pattern)
      if (rel1IsPk && rel2IsPk) {
        // This is a junction table! Create MANY_TO_MANY between the two target tables
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
