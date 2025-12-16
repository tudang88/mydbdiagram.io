import { Diagram } from '../diagram/Diagram';
import { ValidationResult } from '@/types/common.types';

/**
 * Validator for Diagram entities
 */
export class DiagramValidator {
  validate(diagram: Diagram): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate diagram has ID
    if (!diagram.getId() || diagram.getId().trim() === '') {
      errors.push({
        field: 'id',
        message: 'Diagram ID is required',
      });
    }

    // Validate metadata
    const metadata = diagram.getMetadata();
    if (!metadata.createdAt) {
      errors.push({
        field: 'metadata.createdAt',
        message: 'Created date is required',
      });
    }
    if (!metadata.updatedAt) {
      errors.push({
        field: 'metadata.updatedAt',
        message: 'Updated date is required',
      });
    }

    // Validate tables
    const tables = diagram.getAllTables();
    if (tables.length === 0) {
      errors.push({
        field: 'tables',
        message: 'Diagram must have at least one table',
      });
    }

    // Validate each table
    tables.forEach((table) => {
      const tableValidation = table.validate();
      if (!tableValidation.isValid && tableValidation.errors) {
        tableValidation.errors.forEach((error) => {
          errors.push({
            field: `table.${table.getId()}.${error.field}`,
            message: error.message,
          });
        });
      }
    });

    // Validate relationships
    const relationships = diagram.getAllRelationships();
    relationships.forEach((relationship) => {
      const relationshipValidation = relationship.validate(diagram);
      if (!relationshipValidation.isValid && relationshipValidation.errors) {
        relationshipValidation.errors.forEach((error) => {
          errors.push({
            field: `relationship.${relationship.getId()}.${error.field}`,
            message: error.message,
          });
        });
      }
    });

    // Run diagram's own validation
    const diagramValidation = diagram.validate();
    if (!diagramValidation.isValid && diagramValidation.errors) {
      errors.push(...diagramValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

