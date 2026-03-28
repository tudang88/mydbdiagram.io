import { Diagram } from './Diagram';
import { DiagramData } from '@/types/diagram.types';
import { Position } from '@/types/common.types';

function normalizeTableName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * When re-parsing SQL/DBML, parsers assign fresh table ids and default positions.
 * Merge positions (and diagram identity) from the existing canvas so Draw does not reset layout.
 * Tables are matched by name (case-insensitive), same as FK resolution in parsers.
 */
export function mergeDiagramLayout(existing: Diagram | null, parsed: Diagram): Diagram {
  if (!existing) {
    return parsed;
  }

  const positionByName = new Map<string, Position>();
  for (const table of existing.getAllTables()) {
    positionByName.set(normalizeTableName(table.getName()), table.getPosition());
  }

  const data: DiagramData = parsed.toJSON();
  for (const table of data.tables) {
    const pos = positionByName.get(normalizeTableName(table.name));
    if (pos) {
      table.position = { ...pos };
    }
  }

  data.id = existing.getId();
  const prevMeta = existing.getMetadata();
  data.metadata = {
    ...prevMeta,
    updatedAt: new Date().toISOString(),
  };

  return Diagram.fromJSON(data);
}
