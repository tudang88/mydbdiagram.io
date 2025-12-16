import { Diagram as DiagramType, DiagramData } from '@/types/diagram.types';
import { Table as TableType } from '@/types/table.types';
import { Relationship as RelationshipType } from '@/types/relationship.types';
import { Table } from '../table/Table';
import { Relationship } from '../relationship/Relationship';
import { ValidationResult } from '@/types/common.types';

/**
 * Diagram domain model
 * Manages collection of tables and relationships
 */
export class Diagram {
  private tables: Map<string, Table>;
  private relationships: Map<string, Relationship>;

  constructor(
    private id: string,
    private metadata: DiagramType['metadata']
  ) {
    this.tables = new Map();
    this.relationships = new Map();
  }

  getId(): string {
    return this.id;
  }

  getMetadata(): DiagramType['metadata'] {
    return { ...this.metadata };
  }

  // Table management
  addTable(table: Table | TableType): void {
    // Convert type to class if needed
    const tableInstance = table instanceof Table ? table : Table.fromJSON(table);
    const tableId = tableInstance.getId();
    if (this.tables.has(tableId)) {
      throw new Error(`Table with id ${tableId} already exists`);
    }
    this.tables.set(tableId, tableInstance);
    this.updateMetadata();
  }

  removeTable(tableId: string): void {
    if (!this.tables.has(tableId)) {
      throw new Error(`Table with id ${tableId} not found`);
    }

    // Remove relationships involving this table
    const relationshipsToRemove: string[] = [];
    this.relationships.forEach((rel, relId) => {
      if (rel.getFromTableId() === tableId || rel.getToTableId() === tableId) {
        relationshipsToRemove.push(relId);
      }
    });
    relationshipsToRemove.forEach(relId => this.relationships.delete(relId));

    this.tables.delete(tableId);
    this.updateMetadata();
  }

  getTable(tableId: string): Table | undefined {
    return this.tables.get(tableId);
  }

  getAllTables(): Table[] {
    return Array.from(this.tables.values());
  }

  // Relationship management
  addRelationship(relationship: Relationship | RelationshipType): void {
    // Convert type to class if needed
    const relationshipInstance =
      relationship instanceof Relationship ? relationship : Relationship.fromJSON(relationship);
    if (this.relationships.has(relationshipInstance.getId())) {
      throw new Error(`Relationship with id ${relationshipInstance.getId()} already exists`);
    }

    // Validate that referenced tables exist
    if (!this.tables.has(relationshipInstance.getFromTableId())) {
      throw new Error(`From table ${relationshipInstance.getFromTableId()} not found`);
    }
    if (!this.tables.has(relationshipInstance.getToTableId())) {
      throw new Error(`To table ${relationshipInstance.getToTableId()} not found`);
    }

    this.relationships.set(relationshipInstance.getId(), relationshipInstance);
    this.updateMetadata();
  }

  removeRelationship(relationshipId: string): void {
    if (!this.relationships.has(relationshipId)) {
      throw new Error(`Relationship with id ${relationshipId} not found`);
    }
    this.relationships.delete(relationshipId);
    this.updateMetadata();
  }

  getRelationship(relationshipId: string): Relationship | undefined {
    return this.relationships.get(relationshipId);
  }

  getAllRelationships(): Relationship[] {
    return Array.from(this.relationships.values());
  }

  // Validation
  validate(): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate tables
    this.tables.forEach(table => {
      const name = table.getName();
      if (!name || name.trim() === '') {
        errors.push({
          field: `table.${table.getId()}.name`,
          message: 'Table name is required',
        });
      }
    });

    // Validate relationships
    this.relationships.forEach(rel => {
      const fromTableId = rel.getFromTableId();
      const toTableId = rel.getToTableId();
      if (!this.tables.has(fromTableId)) {
        errors.push({
          field: `relationship.${rel.getId()}.fromTableId`,
          message: `From table ${fromTableId} does not exist`,
        });
      }
      if (!this.tables.has(toTableId)) {
        errors.push({
          field: `relationship.${rel.getId()}.toTableId`,
          message: `To table ${toTableId} does not exist`,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Serialization
  toJSON(): DiagramData {
    return {
      id: this.id,
      tables: this.getAllTables().map(table => table.toJSON()),
      relationships: this.getAllRelationships().map(rel => rel.toJSON()),
      metadata: this.getMetadata(),
    };
  }

  /**
   * Create a new Diagram with default metadata
   */
  static create(id: string): Diagram {
    const now = new Date().toISOString();
    return new Diagram(id, {
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromJSON(data: DiagramData): Diagram {
    const diagram = new Diagram(data.id, data.metadata);

    // Add tables first
    data.tables.forEach(tableData => {
      const table = Table.fromJSON(tableData);
      diagram.tables.set(table.getId(), table);
    });

    // Then add relationships
    data.relationships.forEach(relationshipData => {
      const relationship = Relationship.fromJSON(relationshipData);
      diagram.relationships.set(relationship.getId(), relationship);
    });

    return diagram;
  }

  // Private helpers
  private updateMetadata(): void {
    this.metadata.updatedAt = new Date().toISOString();
  }
}
