import { Table } from '../table/Table';
import { ValidationResult } from '@/types/common.types';

/**
 * Validator for Table entities
 */
export class TableValidator {
  validate(table: Table): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate ID
    if (!table.getId() || table.getId().trim() === '') {
      errors.push({
        field: 'id',
        message: 'Table ID is required',
      });
    }

    // Validate name
    const name = table.getName();
    if (!name || name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Table name is required',
      });
    } else if (name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Table name must be less than 100 characters',
      });
    }

    // Validate position
    const position = table.getPosition();
    if (position.x < 0 || position.y < 0) {
      errors.push({
        field: 'position',
        message: 'Table position must be non-negative',
      });
    }

    // Validate columns
    const columns = table.getAllColumns();
    if (columns.length === 0) {
      errors.push({
        field: 'columns',
        message: 'Table must have at least one column',
      });
    }

    // Validate each column
    columns.forEach(column => {
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

    // Check for duplicate column names
    const columnNames = columns.map(col => col.name.toLowerCase());
    const duplicateNames = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push({
        field: 'columns',
        message: `Duplicate column names: ${duplicateNames.join(', ')}`,
      });
    }

    // Run table's own validation
    const tableValidation = table.validate();
    if (!tableValidation.isValid && tableValidation.errors) {
      errors.push(...tableValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
