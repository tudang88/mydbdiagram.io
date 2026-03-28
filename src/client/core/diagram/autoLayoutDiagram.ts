import { Diagram } from './Diagram';
import { Table } from '../table/Table';

/** Horizontal gap between adjacent table bounding boxes */
const H_GAP = 64;
/** Vertical gap between layers / wrapped rows */
const V_GAP = 56;
const MIN_TABLE_WIDTH = 240;
/** Must stay in sync with RelationshipLine COLUMN_HEIGHT (30) for stable edge anchors */
const TABLE_HEADER_HEIGHT = 40;
const COLUMN_ROW_HEIGHT = 30;
/** Approximate average char width (px) for 12–14px UI font */
const CHAR_W = 7.5;
const TABLE_HPADDING = 52;
/** If a layer row is wider than this, wrap to the next visual row */
const MAX_LAYER_ROW_WIDTH = 1500;
/** After this total width, start the next component block on a new row (reduces mile-long edges) */
const MAX_COMPONENT_LINE_WIDTH = 2200;
/** Space between disconnected graph components */
const COMPONENT_GAP = 100;
const MARGIN = 80;

function estimateTableWidth(table: Table): number {
  const meta = table.getMetadata();
  let w = table.getName().length * CHAR_W + TABLE_HPADDING;

  if (meta?.description && meta.description.trim()) {
    const descLine = Math.min(30, meta.description.length);
    w = Math.max(w, descLine * CHAR_W + TABLE_HPADDING);
  }

  for (const col of table.getAllColumns()) {
    const mainChars = col.name.length + col.type.length + 6;
    const commentChars = col.comment ? Math.min(28, col.comment.length) : 0;
    const badgeW = (col.constraints?.length ?? 0) * 30;
    const rowInner = mainChars * CHAR_W + commentChars * CHAR_W * 0.85 + badgeW;
    w = Math.max(w, rowInner + TABLE_HPADDING);
  }

  // Generous upper bound — wide tables are common in real schemas; better overlap than underlap
  return Math.min(1400, Math.max(MIN_TABLE_WIDTH, Math.ceil(w)));
}

function estimateTableHeight(table: Table): number {
  const meta = table.getMetadata();
  let h = TABLE_HEADER_HEIGHT;
  if (meta?.description && meta.description.trim()) {
    h += 40;
  }
  const cols = table.getAllColumns().length;
  h += Math.max(1, cols) * COLUMN_ROW_HEIGHT + 16;
  return h;
}

function estimateTableSize(table: Table): { w: number; h: number } {
  return { w: estimateTableWidth(table), h: estimateTableHeight(table) };
}

function normalizeName(table: Table): string {
  return table.getName().toLowerCase();
}

function getConnectedComponents(tableIds: string[], edges: Array<[string, string]>): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const id of tableIds) {
    adj.set(id, new Set());
  }
  for (const [a, b] of edges) {
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of tableIds) {
    if (visited.has(id)) continue;
    const comp: string[] = [];
    const stack = [id];
    visited.add(id);
    while (stack.length) {
      const u = stack.pop()!;
      comp.push(u);
      for (const v of adj.get(u) ?? []) {
        if (!visited.has(v)) {
          visited.add(v);
          stack.push(v);
        }
      }
    }
    components.push(comp);
  }
  return components;
}

function bfsLayers(
  root: string,
  adj: Map<string, Set<string>>,
  nodes: Set<string>
): Map<string, number> {
  const layer = new Map<string, number>();
  const queue: string[] = [root];
  layer.set(root, 0);

  while (queue.length) {
    const u = queue.shift()!;
    const lu = layer.get(u) ?? 0;
    for (const v of adj.get(u) ?? []) {
      if (!nodes.has(v)) continue;
      if (!layer.has(v)) {
        layer.set(v, lu + 1);
        queue.push(v);
      }
    }
  }

  for (const n of nodes) {
    if (!layer.has(n)) {
      layer.set(n, 0);
    }
  }
  return layer;
}

/**
 * Places tables in one logical layer, wrapping to additional rows when wider than MAX_LAYER_ROW_WIDTH.
 * Coordinates are relative to the component's local origin (0,0).
 */
function placeLayerRowWrapped(
  rowTableIds: string[],
  startY: number,
  leftMargin: number,
  tableById: Map<string, Table>
): { positions: Map<string, { x: number; y: number }>; nextY: number; maxRight: number } {
  const positions = new Map<string, { x: number; y: number }>();
  const maxX = leftMargin + MAX_LAYER_ROW_WIDTH;

  let x = leftMargin;
  let y = startY;
  let rowMaxH = 0;
  let maxRight = leftMargin;

  for (const id of rowTableIds) {
    const table = tableById.get(id)!;
    const { w, h } = estimateTableSize(table);

    if (x > leftMargin && x + w > maxX) {
      y += rowMaxH + V_GAP;
      x = leftMargin;
      rowMaxH = 0;
    }

    positions.set(id, { x, y });
    rowMaxH = Math.max(rowMaxH, h);
    maxRight = Math.max(maxRight, x + w);
    x += w + H_GAP;
  }

  const nextY = y + rowMaxH;
  return { positions, nextY, maxRight };
}

function layoutOneComponent(
  comp: string[],
  edges: Array<[string, string]>,
  tableById: Map<string, Table>
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const nodeSet = new Set(comp);
  const adj = new Map<string, Set<string>>();
  for (const id of comp) {
    adj.set(id, new Set());
  }
  for (const [a, b] of edges) {
    if (nodeSet.has(a) && nodeSet.has(b)) {
      adj.get(a)?.add(b);
      adj.get(b)?.add(a);
    }
  }

  const root = [...comp].sort((x, y) =>
    normalizeName(tableById.get(x)!).localeCompare(normalizeName(tableById.get(y)!))
  )[0]!;
  const layers = bfsLayers(root, adj, nodeSet);

  const maxLayer = Math.max(0, ...layers.values());
  const byLayer = new Map<number, string[]>();
  for (let L = 0; L <= maxLayer; L++) {
    byLayer.set(L, []);
  }
  for (const id of comp) {
    const L = layers.get(id) ?? 0;
    byLayer.get(L)?.push(id);
  }
  for (const ids of byLayer.values()) {
    ids.sort((a, b) =>
      normalizeName(tableById.get(a)!).localeCompare(normalizeName(tableById.get(b)!))
    );
  }

  const positions = new Map<string, { x: number; y: number }>();
  let localY = 0;
  let maxRight = 0;

  for (let L = 0; L <= maxLayer; L++) {
    const row = byLayer.get(L) ?? [];
    if (row.length === 0) continue;

    const {
      positions: rowPos,
      nextY,
      maxRight: layerRight,
    } = placeLayerRowWrapped(row, localY, 0, tableById);
    for (const [id, pos] of rowPos) {
      positions.set(id, pos);
    }
    localY = nextY + V_GAP;
    maxRight = Math.max(maxRight, layerRight);
  }

  let maxBottom = 0;
  for (const [id, pos] of positions) {
    const h = estimateTableSize(tableById.get(id)!).h;
    maxBottom = Math.max(maxBottom, pos.y + h);
  }

  const height = maxBottom;
  const width = maxRight;

  return { positions, width, height };
}

/**
 * Arranges tables using FK graph structure: connected components, BFS layers, wrapped rows,
 * and packs component blocks in a 2D grid so edges are not stretched across the entire canvas width.
 * Mutates table positions in place.
 */
export function applyAutoLayout(diagram: Diagram): void {
  const tables = diagram.getAllTables();
  if (tables.length === 0) return;

  const tableById = new Map<string, Table>();
  for (const t of tables) {
    tableById.set(t.getId(), t);
  }

  const rels = diagram.getAllRelationships();
  const edges: Array<[string, string]> = rels.map(r => [r.getFromTableId(), r.getToTableId()]);

  const tableIds = tables.map(t => t.getId());
  const components = getConnectedComponents(tableIds, edges);

  components.sort((a, b) => {
    const nameA = [...a].sort((x, y) =>
      normalizeName(tableById.get(x)!).localeCompare(normalizeName(tableById.get(y)!))
    )[0];
    const nameB = [...b].sort((x, y) =>
      normalizeName(tableById.get(x)!).localeCompare(normalizeName(tableById.get(y)!))
    )[0];
    return normalizeName(tableById.get(nameA!)!).localeCompare(
      normalizeName(tableById.get(nameB!)!)
    );
  });

  let blockLeft = MARGIN;
  let blockTop = MARGIN;
  let rowOfBlocksMaxHeight = 0;

  for (const comp of components) {
    const { positions, width, height } = layoutOneComponent(comp, edges, tableById);

    if (blockLeft > MARGIN && blockLeft + width > MAX_COMPONENT_LINE_WIDTH) {
      blockLeft = MARGIN;
      blockTop += rowOfBlocksMaxHeight + COMPONENT_GAP;
      rowOfBlocksMaxHeight = 0;
    }

    for (const [id, pos] of positions) {
      tableById.get(id)!.moveTo({
        x: pos.x + blockLeft,
        y: pos.y + blockTop,
      });
    }

    blockLeft += width + COMPONENT_GAP;
    rowOfBlocksMaxHeight = Math.max(rowOfBlocksMaxHeight, height);
  }
}
