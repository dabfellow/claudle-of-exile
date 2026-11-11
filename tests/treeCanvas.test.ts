import { describe, expect, it } from 'vitest';
import { boundedTreeView } from '../src/ui/treeView';

const bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };

describe('tree canvas bounds', () => {
  it('stops panning when the outer nodes reach the canvas edge', () => {
    expect(boundedTreeView({ x: 999, y: -999, k: 2 }, 1000, bounds)).toEqual({ x: 290, y: -290, k: 2 });
  });

  it('centres a tree that is smaller than the visible canvas', () => {
    expect(boundedTreeView({ x: 999, y: 999, k: 0.4 }, 1000, bounds)).toEqual({ x: 0, y: 0, k: 0.4 });
  });
});
