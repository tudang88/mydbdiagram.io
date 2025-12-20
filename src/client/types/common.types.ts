/**
 * Common types used across the application
 */

export interface Position {
  x: number;
  y: number;
}

export interface Metadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
}

export interface DiagramMetadata extends Metadata {
  version?: string;
  sourceText?: string; // Original SQL/DBML text from editor
  sourceFormat?: 'sql' | 'dbml'; // Format of source text
}

export interface TableMetadata {
  description?: string;
  color?: string;
}

export interface RelationshipMetadata {
  label?: string;
}

export type RelationshipType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';

export type ConstraintType =
  | 'PRIMARY_KEY'
  | 'FOREIGN_KEY'
  | 'UNIQUE'
  | 'NOT_NULL'
  | 'AUTO_INCREMENT';

export interface Constraint {
  type: ConstraintType;
  value?: string; // For foreign key references
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
