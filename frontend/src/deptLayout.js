// Pure layout utilities for department nodes.
// Extracted so they can be unit-tested without a browser/DOM environment.

export const DEPT_SPACING_X = 300;
export const DEPT_SPACING_Y = 220;
export const DEPT_TOP_Y = 80;
export const DEPT_START_X = 80;

/**
 * Compute a smart default canvas position for a department that has not yet
 * been manually placed (pos_x === 0 && pos_y === 0).
 *
 * @param {{ id: number, parent_dept_id: number|null }} dept - The department to position.
 * @param {Array<{id: number, parent_dept_id: number|null}>} allDepts - All departments in the org.
 * @param {Object.<number, {x: number, y: number}>} posMap - Already-resolved positions keyed by dept id.
 * @returns {{ x: number, y: number }}
 */
export function computeSmartPosition(dept, allDepts, posMap) {
  if (!dept.parent_dept_id) {
    // Top-level dept: place to the right of the rightmost existing top-level node
    const topLevelPositions = allDepts
      .filter(d => !d.parent_dept_id && d.id !== dept.id && posMap[d.id])
      .map(d => posMap[d.id].x);
    const maxX = topLevelPositions.length > 0 ? Math.max(...topLevelPositions) : DEPT_START_X - DEPT_SPACING_X;
    return { x: maxX + DEPT_SPACING_X, y: DEPT_TOP_Y };
  }

  // Child dept: place below parent and to the right of rightmost sibling
  const parentPos = posMap[dept.parent_dept_id] || { x: DEPT_START_X, y: DEPT_TOP_Y };
  const siblings = allDepts.filter(
    d => d.parent_dept_id === dept.parent_dept_id && d.id !== dept.id && posMap[d.id]
  );
  const siblingXPositions = siblings.map(d => posMap[d.id].x);
  const maxSiblingX = siblingXPositions.length > 0 ? Math.max(...siblingXPositions) : parentPos.x - DEPT_SPACING_X;
  return { x: maxSiblingX + DEPT_SPACING_X, y: parentPos.y + DEPT_SPACING_Y };
}

/**
 * Build a posMap (dept id -> {x, y}) for a list of departments using the
 * two-pass smart layout algorithm.
 *
 * @param {Array<{id: number, parent_dept_id: number|null, pos_x: number, pos_y: number}>} departments
 * @returns {Object.<number, {x: number, y: number}>}
 */
export function buildPosMap(departments) {
  const posMap = {};

  // Pass 1: record all depts with explicit positions
  departments.forEach(d => {
    if (d.pos_x !== 0 || d.pos_y !== 0) {
      posMap[d.id] = { x: d.pos_x, y: d.pos_y };
    }
  });

  // Pass 2: compute smart positions for unplaced depts — top-level before children
  const unplaced = departments.filter(d => d.pos_x === 0 && d.pos_y === 0);
  const topLevelUnplaced = unplaced.filter(d => !d.parent_dept_id);
  const childUnplaced = unplaced.filter(d => !!d.parent_dept_id);

  topLevelUnplaced.forEach(d => {
    posMap[d.id] = computeSmartPosition(d, departments, posMap);
  });

  childUnplaced.forEach(d => {
    posMap[d.id] = computeSmartPosition(d, departments, posMap);
  });

  return posMap;
}

/**
 * Compute rebalanced x positions for siblings after a deletion.
 *
 * @param {Array<{id: number, pos_x: number, pos_y: number}>} siblings - Remaining siblings (not the deleted one).
 * @param {number} centerX - The x coordinate to center the siblings around (typically the parent's x).
 * @returns {Array<{id: number, x: number, y: number}>}
 */
export function rebalanceSiblings(siblings, centerX) {
  if (siblings.length === 0) return [];
  const sorted = [...siblings].sort((a, b) => a.pos_x - b.pos_x);
  const startX = centerX - ((sorted.length - 1) * DEPT_SPACING_X) / 2;
  return sorted.map((s, i) => ({
    id: s.id,
    x: Math.round(startX + i * DEPT_SPACING_X),
    y: s.pos_y,
  }));
}
