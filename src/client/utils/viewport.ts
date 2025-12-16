/**
 * Viewport utilities for viewport-based rendering optimization
 */

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if bounds intersect with viewport
 */
export function isInViewport(bounds: Bounds, viewport: Viewport): boolean {
  const viewportLeft = -viewport.x / viewport.zoom;
  const viewportRight = viewportLeft + viewport.width / viewport.zoom;
  const viewportTop = -viewport.y / viewport.zoom;
  const viewportBottom = viewportTop + viewport.height / viewport.zoom;

  return !(
    bounds.x + bounds.width < viewportLeft ||
    bounds.x > viewportRight ||
    bounds.y + bounds.height < viewportTop ||
    bounds.y > viewportBottom
  );
}

/**
 * Get expanded viewport with padding for pre-rendering
 */
export function getExpandedViewport(viewport: Viewport, padding: number = 200): Viewport {
  return {
    ...viewport,
    x: viewport.x - padding * viewport.zoom,
    y: viewport.y - padding * viewport.zoom,
    width: viewport.width + padding * 2 * viewport.zoom,
    height: viewport.height + padding * 2 * viewport.zoom,
  };
}
