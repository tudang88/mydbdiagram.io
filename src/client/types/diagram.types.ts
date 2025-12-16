/**
 * Diagram type definitions
 */

import { DiagramMetadata } from './common.types';
import { Table, TableData } from './table.types';
import { Relationship, RelationshipData } from './relationship.types';

// Re-export for convenience
export type { TableData } from './table.types';
export type { RelationshipData } from './relationship.types';

export interface Diagram {
  id: string;
  tables: Table[];
  relationships: Relationship[];
  metadata: DiagramMetadata;
}

export interface DiagramData {
  id: string;
  tables: TableData[];
  relationships: RelationshipData[];
  metadata: DiagramMetadata;
}
