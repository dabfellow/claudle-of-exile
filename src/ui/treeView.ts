export type TreeView = { x: number; y: number; k: number };
export type TreeBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Keep a tree's outermost nodes inside the canvas instead of allowing endless empty-space panning. */
export function boundedTreeView(view: TreeView, size: number, bounds: TreeBounds): TreeView {
  const half = size / (2 * view.k);
  const edge = Math.min(160, half * 0.16);
  const axis = (offset: number, min: number, max: number) => {
    const lowest = half - edge - max;
    const highest = -half + edge - min;
    if (lowest <= highest) return Math.max(lowest, Math.min(highest, offset));
    const centre = -(min + max) / 2;
    return Object.is(centre, -0) ? 0 : centre;
  };
  return { x: axis(view.x, bounds.minX, bounds.maxX), y: axis(view.y, bounds.minY, bounds.maxY), k: view.k };
}
