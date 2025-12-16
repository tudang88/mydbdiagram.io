import { Table as TableType, TableData, Column } from '@/types/table.types';
import { Position, ValidationResult } from '@/types/common.types';

/**
 * Table domain model
 * Represents a database table with columns
 */
export class Table {
  private columns: Map<string, Column>;

  constructor(
    private id: string,
    private name: string,
    private position: Position,
    columns: Column[] = [],
    private metadata?: TableType['metadata']
  ) {
    this.columns = new Map();
    columns.forEach((column) => {
      this.columns.set(column.id, column);
    });
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (!name || name.trim() === '') {
      throw new Error('Table name cannot be empty');
    }
    this.name = name;
  }

  getPosition(): Position {
    return { ...this.position };
  }

  getMetadata(): TableType['metadata'] | undefined {
    return this.metadata ? { ...this.metadata } : undefined;
  }

  // Column management
  addColumn(column: Column): void {
    if (this.columns.has(column.id)) {
      throw new Error(`Column with id ${column.id} already exists`);
    }
    this.columns.set(column.id, column);
  }

  removeColumn(columnId: string): void {
    if (!this.columns.has(columnId)) {
      throw new Error(`Column with id ${columnId} not found`);
    }
    this.columns.delete(columnId);
  }

  updateColumn(columnId: string, updates: Partial<Column>): void {
    const column = this.columns.get(columnId);
    if (!column) {
      throw new Error(`Column with id ${columnId} not found`);
    }
    this.columns.set(columnId, { ...column, ...updates });
  }

  getColumn(columnId: string): Column | undefined {
    return this.columns.get(columnId);
  }

  getAllColumns(): Column[] {
    return Array.from(this.columns.values());
  }

  // Position management
  moveTo(position: Position): void {
    this.position = { ...position };
  }

  // Validation
  validate(): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (!this.name || this.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Table name is required',
      });
    }

    // Validate columns
    this.columns.forEach((column) => {
      if (!column.name || column.name.trim() === '') {
        errors.push({
          field: `column.${column.id}.name`,
          message: 'Column name is required',
        });
      }
      if (!column.type || column.type.trim() === '') {
        errors.push({
          field: `column.${column.id}.type`,
          message: 'Column type is required',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Serialization
  toJSON(): TableData {
    return {
      id: this.id,
      name: this.name,
      position: this.getPosition(),
      columns: this.getAllColumns(),
      metadata: this.metadata,
    };
  }

  static fromJSON(data: TableData): Table {
    return new Table(data.id, data.name, data.position, data.columns, data.metadata);
  }
}

