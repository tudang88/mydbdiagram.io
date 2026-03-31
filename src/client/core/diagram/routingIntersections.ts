export type OrthogonalSegment = { x1: number; y1: number; x2: number; y2: number };
export type ObstacleRect = { left: number; right: number; top: number; bottom: number };

export function segmentIntersectsRectInterior(seg: OrthogonalSegment, rect: ObstacleRect): boolean {
  const EPS = 0.0001;
  if (Math.abs(seg.x1 - seg.x2) < EPS) {
    const x = seg.x1;
    if (x <= rect.left + EPS || x >= rect.right - EPS) return false;
    const segTop = Math.min(seg.y1, seg.y2);
    const segBottom = Math.max(seg.y1, seg.y2);
    return segBottom > rect.top + EPS && segTop < rect.bottom - EPS;
  }
  if (Math.abs(seg.y1 - seg.y2) < EPS) {
    const y = seg.y1;
    if (y <= rect.top + EPS || y >= rect.bottom - EPS) return false;
    const segLeft = Math.min(seg.x1, seg.x2);
    const segRight = Math.max(seg.x1, seg.x2);
    return segRight > rect.left + EPS && segLeft < rect.right - EPS;
  }
  return false;
}

export function countPathIntersections(
  segments: OrthogonalSegment[],
  rects: ObstacleRect[]
): number {
  let score = 0;
  for (const seg of segments) {
    for (const rect of rects) {
      if (segmentIntersectsRectInterior(seg, rect)) score += 1;
    }
  }
  return score;
}
