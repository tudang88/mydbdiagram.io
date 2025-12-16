import { Relationship } from '../relationship/Relationship';
import { Diagram } from '../diagram/Diagram';
import { ValidationResult } from '@/types/common.types';

/**
 * Validator for Relationship entities
 */
export class RelationshipValidator {
  validate(relationship: Relationship, diagram: Diagram): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate ID
    if (!relationship.getId() || relationship.getId().trim() === '') {
      errors.push({
        field: 'id',
        message: 'Relationship ID is required',
      });
    }

    // Validate from table exists
    const fromTableId = relationship.getFromTableId();
    const fromTable = diagram.getTable(fromTableId);
    if (!fromTable) {
      errors.push({
        field: 'fromTableId',
        message: `From table ${fromTableId} does not exist`,
      });
    } else {
      // Validate from column exists
      const fromColumnId = relationship.getFromColumnId();
      const fromColumn = fromTable.getColumn(fromColumnId);
      if (!fromColumn) {
        errors.push({
          field: 'fromColumnId',
          message: `From column ${fromColumnId} does not exist in table ${fromTableId}`,
        });
      }
    }

    // Validate to table exists
    const toTableId = relationship.getToTableId();
    const toTable = diagram.getTable(toTableId);
    if (!toTable) {
      errors.push({
        field: 'toTableId',
        message: `To table ${toTableId} does not exist`,
      });
    } else {
      // Validate to column exists
      const toColumnId = relationship.getToColumnId();
      const toColumn = toTable.getColumn(toColumnId);
      if (!toColumn) {
        errors.push({
          field: 'toColumnId',
          message: `To column ${toColumnId} does not exist in table ${toTableId}`,
        });
      }
    }

    // Validate relationship type
    const type = relationship.getType();
    const validTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY'];
    if (!validTypes.includes(type)) {
      errors.push({
        field: 'type',
        message: `Invalid relationship type: ${type}`,
      });
    }

    // Validate not self-referencing (optional rule)
    if (fromTableId === toTableId) {
      errors.push({
        field: 'toTableId',
        message: 'Relationship cannot reference the same table',
      });
    }

    // Run relationship's own validation
    const relationshipValidation = relationship.validate(diagram);
    if (!relationshipValidation.isValid && relationshipValidation.errors) {
      errors.push(...relationshipValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

