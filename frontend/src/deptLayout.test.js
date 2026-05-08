import { describe, it, expect } from 'vitest';
import {
  DEPT_SPACING_X,
  DEPT_SPACING_Y,
  DEPT_TOP_Y,
  DEPT_START_X,
  computeSmartPosition,
  buildPosMap,
  rebalanceSiblings,
} from './deptLayout';

// ---------------------------------------------------------------------------
// computeSmartPosition
// ---------------------------------------------------------------------------

describe('computeSmartPosition', () => {
  describe('top-level departments', () => {
    it('places the first top-level dept at (DEPT_START_X, DEPT_TOP_Y) when posMap is empty', () => {
      const dept = { id: 1, parent_dept_id: null };
      const pos = computeSmartPosition(dept, [dept], {});
      expect(pos).toEqual({ x: DEPT_START_X, y: DEPT_TOP_Y });
    });

    it('places a second top-level dept to the right of the first', () => {
      const existing = { id: 1, parent_dept_id: null };
      const newDept = { id: 2, parent_dept_id: null };
      const posMap = { 1: { x: 80, y: DEPT_TOP_Y } };
      const pos = computeSmartPosition(newDept, [existing, newDept], posMap);
      expect(pos).toEqual({ x: 80 + DEPT_SPACING_X, y: DEPT_TOP_Y });
    });

    it('places a third top-level dept to the right of the rightmost (not sequentially)', () => {
      const allDepts = [
        { id: 1, parent_dept_id: null },
        { id: 2, parent_dept_id: null },
        { id: 3, parent_dept_id: null },
      ];
      const posMap = {
        1: { x: 80, y: DEPT_TOP_Y },
        2: { x: 680, y: DEPT_TOP_Y }, // already far right
      };
      const pos = computeSmartPosition(allDepts[2], allDepts, posMap);
      expect(pos).toEqual({ x: 680 + DEPT_SPACING_X, y: DEPT_TOP_Y });
    });

    it('ignores the dept being positioned when finding the rightmost', () => {
      const dept = { id: 5, parent_dept_id: null };
      // posMap already has an entry for dept.id 5 (e.g. from a previous pass — should be excluded)
      const posMap = { 5: { x: 9999, y: DEPT_TOP_Y } };
      const pos = computeSmartPosition(dept, [dept], posMap);
      // No other top-level depts in posMap, so should default to DEPT_START_X
      expect(pos).toEqual({ x: DEPT_START_X, y: DEPT_TOP_Y });
    });
  });

  describe('child departments', () => {
    it('places a first child below its parent and DEPT_SPACING_X to the right of (parentX - DEPT_SPACING_X)', () => {
      const parent = { id: 1, parent_dept_id: null };
      const child = { id: 2, parent_dept_id: 1 };
      const posMap = { 1: { x: 500, y: 80 } };
      const pos = computeSmartPosition(child, [parent, child], posMap);
      // No siblings → maxSiblingX = parentPos.x - DEPT_SPACING_X = 500 - 300 = 200
      // x = 200 + 300 = 500 (centred under parent)
      expect(pos.x).toBe(500);
      expect(pos.y).toBe(80 + DEPT_SPACING_Y);
    });

    it('places a second child to the right of the first sibling', () => {
      const parent = { id: 1, parent_dept_id: null };
      const child1 = { id: 2, parent_dept_id: 1 };
      const child2 = { id: 3, parent_dept_id: 1 };
      const posMap = {
        1: { x: 500, y: 80 },
        2: { x: 350, y: 300 },
      };
      const pos = computeSmartPosition(child2, [parent, child1, child2], posMap);
      expect(pos.x).toBe(350 + DEPT_SPACING_X);
      expect(pos.y).toBe(80 + DEPT_SPACING_Y);
    });

    it('places child below grandparent level correctly', () => {
      const root = { id: 1, parent_dept_id: null };
      const child = { id: 2, parent_dept_id: 1 };
      const grandchild = { id: 3, parent_dept_id: 2 };
      const posMap = {
        1: { x: 80, y: 80 },
        2: { x: 80, y: 300 },
      };
      const pos = computeSmartPosition(grandchild, [root, child, grandchild], posMap);
      expect(pos.y).toBe(300 + DEPT_SPACING_Y);
    });

    it('falls back to DEPT_START_X when parent has no recorded position', () => {
      const child = { id: 2, parent_dept_id: 99 }; // parent 99 not in posMap
      const pos = computeSmartPosition(child, [child], {});
      expect(pos.y).toBe(DEPT_TOP_Y + DEPT_SPACING_Y);
    });
  });
});

// ---------------------------------------------------------------------------
// buildPosMap
// ---------------------------------------------------------------------------

describe('buildPosMap', () => {
  it('returns stored positions unchanged for already-placed depts', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 200, pos_y: 100 },
    ];
    const posMap = buildPosMap(depts);
    expect(posMap[1]).toEqual({ x: 200, y: 100 });
  });

  it('computes position for a single unplaced top-level dept', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 0, pos_y: 0 },
    ];
    const posMap = buildPosMap(depts);
    expect(posMap[1]).toEqual({ x: DEPT_START_X, y: DEPT_TOP_Y });
  });

  it('computes positions for two unplaced top-level depts sequentially', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 0, pos_y: 0 },
      { id: 2, parent_dept_id: null, pos_x: 0, pos_y: 0 },
    ];
    const posMap = buildPosMap(depts);
    // Second should be DEPT_SPACING_X to the right of the first
    expect(posMap[2].x).toBe(posMap[1].x + DEPT_SPACING_X);
    expect(posMap[1].y).toBe(DEPT_TOP_Y);
    expect(posMap[2].y).toBe(DEPT_TOP_Y);
  });

  it('places unplaced child below its placed parent', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 400, pos_y: 80 },
      { id: 2, parent_dept_id: 1, pos_x: 0, pos_y: 0 },
    ];
    const posMap = buildPosMap(depts);
    expect(posMap[2].y).toBe(80 + DEPT_SPACING_Y);
  });

  it('processes top-level unplaced depts before child unplaced depts', () => {
    // If we have an unplaced top-level parent and an unplaced child,
    // the child should correctly reference the parent's computed position.
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 0, pos_y: 0 },
      { id: 2, parent_dept_id: 1, pos_x: 0, pos_y: 0 },
    ];
    const posMap = buildPosMap(depts);
    expect(posMap[1]).toBeDefined();
    expect(posMap[2]).toBeDefined();
    // Child must be below parent
    expect(posMap[2].y).toBe(posMap[1].y + DEPT_SPACING_Y);
  });

  it('mixes placed and unplaced correctly', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 100, pos_y: 50 }, // placed
      { id: 2, parent_dept_id: null, pos_x: 0, pos_y: 0 },    // unplaced → to the right of id=1
    ];
    const posMap = buildPosMap(depts);
    expect(posMap[1]).toEqual({ x: 100, y: 50 });
    expect(posMap[2].x).toBe(100 + DEPT_SPACING_X);
  });

  it('returns an entry for every department', () => {
    const depts = [
      { id: 1, parent_dept_id: null, pos_x: 0, pos_y: 0 },
      { id: 2, parent_dept_id: 1, pos_x: 0, pos_y: 0 },
      { id: 3, parent_dept_id: 1, pos_x: 0, pos_y: 0 },
    ];
    const posMap = buildPosMap(depts);
    expect(Object.keys(posMap)).toHaveLength(3);
    depts.forEach(d => expect(posMap[d.id]).toBeDefined());
  });
});

// ---------------------------------------------------------------------------
// rebalanceSiblings
// ---------------------------------------------------------------------------

describe('rebalanceSiblings', () => {
  it('returns an empty array when siblings list is empty', () => {
    expect(rebalanceSiblings([], 300)).toEqual([]);
  });

  it('centres a single sibling on centerX', () => {
    const siblings = [{ id: 10, pos_x: 500, pos_y: 300 }];
    const result = rebalanceSiblings(siblings, 400);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 10, x: 400, y: 300 });
  });

  it('spaces two siblings symmetrically around centerX', () => {
    const siblings = [
      { id: 1, pos_x: 100, pos_y: 200 },
      { id: 2, pos_x: 700, pos_y: 200 },
    ];
    const result = rebalanceSiblings(siblings, 400);
    // With spacing 300: startX = 400 - 300/2 = 250
    expect(result[0].x).toBe(250);
    expect(result[1].x).toBe(250 + DEPT_SPACING_X);
    expect(result[0].y).toBe(200);
    expect(result[1].y).toBe(200);
  });

  it('spaces three siblings evenly around centerX', () => {
    const siblings = [
      { id: 1, pos_x: 100, pos_y: 300 },
      { id: 2, pos_x: 400, pos_y: 300 },
      { id: 3, pos_x: 900, pos_y: 300 },
    ];
    const centerX = 400;
    const result = rebalanceSiblings(siblings, centerX);
    // With spacing 300: startX = 400 - (2 * 300)/2 = 400 - 300 = 100
    expect(result[0].x).toBe(100);
    expect(result[1].x).toBe(400);
    expect(result[2].x).toBe(700);
  });

  it('preserves the y coordinate of each sibling', () => {
    const siblings = [
      { id: 1, pos_x: 100, pos_y: 123 },
      { id: 2, pos_x: 200, pos_y: 456 },
    ];
    const result = rebalanceSiblings(siblings, 300);
    const byId = Object.fromEntries(result.map(r => [r.id, r]));
    expect(byId[1].y).toBe(123);
    expect(byId[2].y).toBe(456);
  });

  it('sorts siblings by pos_x before assigning positions', () => {
    // Sibling 2 is further right than sibling 1 despite being listed first
    const siblings = [
      { id: 2, pos_x: 600, pos_y: 300 },
      { id: 1, pos_x: 100, pos_y: 300 },
    ];
    const result = rebalanceSiblings(siblings, 400);
    // id=1 (pos_x=100) sorts first, id=2 (pos_x=600) sorts second
    const byId = Object.fromEntries(result.map(r => [r.id, r]));
    expect(byId[1].x).toBeLessThan(byId[2].x);
  });

  it('returns integer x values (Math.round applied)', () => {
    // 3 siblings, spacing 300, centerX 350 → startX = 350 - 300 = 50
    const siblings = [
      { id: 1, pos_x: 0, pos_y: 0 },
      { id: 2, pos_x: 100, pos_y: 0 },
      { id: 3, pos_x: 200, pos_y: 0 },
    ];
    const result = rebalanceSiblings(siblings, 350);
    result.forEach(r => expect(Number.isInteger(r.x)).toBe(true));
  });
});
