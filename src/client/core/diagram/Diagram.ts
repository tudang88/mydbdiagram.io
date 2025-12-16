import { Diagram as DiagramType, DiagramData } from '@/types/diagram.types';
import { Table } from '@/types/table.types';
import { Relationship } from '@/types/relationship.types';
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
  addTable(table: Table): void {
    if (this.tables.has(table.id)) {
      throw new Error(`Table with id ${table.id} already exists`);
    }
    this.tables.set(table.id, table);
    this.updateMetadata();
  }

  removeTable(tableId: string): void {
    if (!this.tables.has(tableId)) {
      throw new Error(`Table with id ${tableId} not found`);
    }

    // Remove relationships involving this table
    const relationshipsToRemove: string[] = [];
    this.relationships.forEach((rel, relId) => {
      if (rel.fromTableId === tableId || rel.toTableId === tableId) {
        relationshipsToRemove.push(relId);
      }
    });
    relationshipsToRemove.forEach((relId) => this.relationships.delete(relId));

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
  addRelationship(relationship: Relationship): void {
    if (this.relationships.has(relationship.id)) {
      throw new Error(`Relationship with id ${relationship.id} already exists`);
    }

    // Validate that referenced tables exist
    if (!this.tables.has(relationship.fromTableId)) {
      throw new Error(`From table ${relationship.fromTableId} not found`);
    }
    if (!this.tables.has(relationship.toTableId)) {
      throw new Error(`To table ${relationship.toTableId} not found`);
    }

    this.relationships.set(relationship.id, relationship);
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
    this.tables.forEach((table) => {
      if (!table.name || table.name.trim() === '') {
        errors.push({
          field: `table.${table.id}.name`,
          message: 'Table name is required',
        });
      }
    });

    // Validate relationships
    this.relationships.forEach((rel) => {
      if (!this.tables.has(rel.fromTableId)) {
        errors.push({
          field: `relationship.${rel.id}.fromTableId`,
          message: `From table ${rel.fromTableId} does not exist`,
        });
      }
      if (!this.tables.has(rel.toTableId)) {
        errors.push({
          field: `relationship.${rel.id}.toTableId`,
          message: `To table ${rel.toTableId} does not exist`,
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
      tables: this.getAllTables(),
      relationships: this.getAllRelationships(),
      metadata: this.getMetadata(),
    };
  }

  static fromJSON(data: DiagramData): Diagram {
    const diagram = new Diagram(data.id, data.metadata);

    // Add tables first
    data.tables.forEach((table) => {
      diagram.tables.set(table.id, table);
    });

    // Then add relationships
    data.relationships.forEach((relationship) => {
      diagram.relationships.set(relationship.id, relationship);
    });

    return diagram;
  }

  // Private helpers
  private updateMetadata(): void {
    this.metadata.updatedAt = new Date().toISOString();
  }
}

