import { DiagramData } from '../../client/types/diagram.types';
import { TableData } from '../../client/types/table.types';
import { RelationshipData } from '../../client/types/relationship.types';
import { ValidationResult, ValidationError } from '../../client/types/common.types';

/**
 * Validation service for backend
 */
export class ValidationService {
  /**
   * Validate diagram data
   */
  validateDiagram(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: [{ field: 'root', message: 'Diagram data is required' }],
      };
    }

    const diagram = data as DiagramData;

    // Validate ID
    if (!diagram.id || typeof diagram.id !== 'string') {
      errors.push({ field: 'id', message: 'Diagram ID is required' });
    }

    // Validate tables
    if (!Array.isArray(diagram.tables)) {
      errors.push({ field: 'tables', message: 'Tables must be an array' });
    } else {
      diagram.tables.forEach((table, index) => {
        const tableErrors = this.validateTable(table);
        tableErrors.forEach((error) => {
          errors.push({
            field: `tables[${index}].${error.field}`,
            message: error.message,
          });
        });
      });
    }

    // Validate relationships
    if (diagram.relationships && !Array.isArray(diagram.relationships)) {
      errors.push({ field: 'relationships', message: 'Relationships must be an array' });
    } else if (diagram.relationships) {
      diagram.relationships.forEach((relationship, index) => {
        const relErrors = this.validateRelationship(relationship);
        relErrors.forEach((error) => {
          errors.push({
            field: `relationships[${index}].${error.field}`,
            message: error.message,
          });
        });
      });
    }

    // Validate metadata
    if (!diagram.metadata) {
      errors.push({ field: 'metadata', message: 'Metadata is required' });
    } else {
      if (!diagram.metadata.createdAt) {
        errors.push({ field: 'metadata.createdAt', message: 'Created date is required' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate table data
   */
  validateTable(table: TableData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!table.id || typeof table.id !== 'string') {
      errors.push({ field: 'id', message: 'Table ID is required' });
    }

    if (!table.name || typeof table.name !== 'string') {
      errors.push({ field: 'name', message: 'Table name is required' });
    }

    if (!table.position || typeof table.position.x !== 'number' || typeof table.position.y !== 'number') {
      errors.push({ field: 'position', message: 'Table position is required' });
    }

    if (!Array.isArray(table.columns)) {
      errors.push({ field: 'columns', message: 'Columns must be an array' });
    }

    return errors;
  }

  /**
   * Validate relationship data
   */
  validateRelationship(relationship: RelationshipData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!relationship.id || typeof relationship.id !== 'string') {
      errors.push({ field: 'id', message: 'Relationship ID is required' });
    }

    if (!relationship.fromTableId || typeof relationship.fromTableId !== 'string') {
      errors.push({ field: 'fromTableId', message: 'From table ID is required' });
    }

    if (!relationship.toTableId || typeof relationship.toTableId !== 'string') {
      errors.push({ field: 'toTableId', message: 'To table ID is required' });
    }

    const validTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'];
    if (!validTypes.includes(relationship.type)) {
      errors.push({ field: 'type', message: 'Invalid relationship type' });
    }

    return errors;
  }
}

