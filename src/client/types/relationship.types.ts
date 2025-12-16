/**
 * Relationship type definitions
 */

import { RelationshipType, RelationshipMetadata } from './common.types';

export interface Relationship {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  type: RelationshipType;
  optional: boolean;
  metadata?: RelationshipMetadata;
}

export interface RelationshipData {
  id: string;
  fromTableId: string;
  fromColumnId: string;
  toTableId: string;
  toColumnId: string;
  type: RelationshipType;
  optional: boolean;
  metadata?: RelationshipMetadata;
}
