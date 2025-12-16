/**
 * Table and Column type definitions
 */

import { Position, TableMetadata, Constraint } from './common.types';

export interface Column {
  id: string;
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  comment?: string;
}

export interface ColumnData {
  id: string;
  name: string;
  type: string;
  constraints: Constraint[];
  defaultValue?: string;
  comment?: string;
}

export interface Table {
  id: string;
  name: string;
  position: Position;
  columns: Column[];
  metadata?: TableMetadata;
}

export interface TableData {
  id: string;
  name: string;
  position: Position;
  columns: ColumnData[];
  metadata?: TableMetadata;
}

