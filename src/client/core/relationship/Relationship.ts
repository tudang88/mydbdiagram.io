import { Relationship as RelationshipType, RelationshipData } from '@/types/relationship.types';
import { Diagram } from '../diagram/Diagram';
import { ValidationResult } from '@/types/common.types';

/**
 * Relationship domain model
 * Represents a relationship between two tables
 */
export class Relationship {
  constructor(
    private id: string,
    private fromTableId: string,
    private fromColumnId: string,
    private toTableId: string,
    private toColumnId: string,
    private type: RelationshipType['type'],
    private optional: boolean,
    private metadata?: RelationshipType['metadata']
  ) {}

  getId(): string {
    return this.id;
  }

  getFromTableId(): string {
    return this.fromTableId;
  }

  getFromColumnId(): string {
    return this.fromColumnId;
  }

  getToTableId(): string {
    return this.toTableId;
  }

  getToColumnId(): string {
    return this.toColumnId;
  }

  getType(): RelationshipType['type'] {
    return this.type;
  }

  isOptional(): boolean {
    return this.optional;
  }

  getMetadata(): RelationshipType['metadata'] | undefined {
    return this.metadata ? { ...this.metadata } : undefined;
  }

  // Validation
  validate(diagram: Diagram): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate from table exists
    const fromTable = diagram.getTable(this.fromTableId);
    if (!fromTable) {
      errors.push({
        field: 'fromTableId',
        message: `From table ${this.fromTableId} does not exist`,
      });
    } else {
      // Validate from column exists in from table
      const fromColumn = fromTable.getColumn(this.fromColumnId);
      if (!fromColumn) {
        errors.push({
          field: 'fromColumnId',
          message: `From column ${this.fromColumnId} does not exist in table ${this.fromTableId}`,
        });
      }
    }

    // Validate to table exists
    const toTable = diagram.getTable(this.toTableId);
    if (!toTable) {
      errors.push({
        field: 'toTableId',
        message: `To table ${this.toTableId} does not exist`,
      });
    } else {
      // Validate to column exists in to table
      const toColumn = toTable.getColumn(this.toColumnId);
      if (!toColumn) {
        errors.push({
          field: 'toColumnId',
          message: `To column ${this.toColumnId} does not exist in table ${this.toTableId}`,
        });
      }
    }

    // Validate relationship type
    const validTypes: RelationshipType['type'][] = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'];
    if (!validTypes.includes(this.type)) {
      errors.push({
        field: 'type',
        message: `Invalid relationship type: ${this.type}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Serialization
  toJSON(): RelationshipData {
    return {
      id: this.id,
      fromTableId: this.fromTableId,
      fromColumnId: this.fromColumnId,
      toTableId: this.toTableId,
      toColumnId: this.toColumnId,
      type: this.type,
      optional: this.optional,
      metadata: this.metadata,
    };
  }

  static fromJSON(data: RelationshipData): Relationship {
    return new Relationship(
      data.id,
      data.fromTableId,
      data.fromColumnId,
      data.toTableId,
      data.toColumnId,
      data.type,
      data.optional,
      data.metadata
    );
  }
}
