/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/collision.js
   Collision detection: AABB, circle, point tests + spatial grid.
═══════════════════════════════════════════════════════════════ */

import { dist } from './perspective.js';

/* ── Axis-Aligned Bounding Box ────────────────────────────── */

/**
 * rectRect(ax, ay, aw, ah, bx, by, bw, bh)
 * Returns true if two axis-aligned rectangles overlap.
 * Origin is top-left corner for both.
 */
export function rectRect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw &&
         ax + aw > bx &&
         ay < by + bh &&
         ay + ah > by;
}

/**
 * rectContains(rx, ry, rw, rh, px, py)
 * Returns true if point (px,py) is inside the rectangle.
 */
export function rectContains(rx, ry, rw, rh, px, py) {
  return px >= rx && px <= rx + rw &&
         py >= ry && py <= ry + rh;
}

/**
 * rectCenter(rx, ry, rw, rh)
 * Returns the center point of a rectangle.
 * @returns {{ x, y }}
 */
export function rectCenter(rx, ry, rw, rh) {
  return { x: rx + rw / 2, y: ry + rh / 2 };
}

/* ── Circle Collisions ────────────────────────────────────── */

/**
 * circCirc(ax, ay, ar, bx, by, br)
 * Returns true if two circles overlap.
 */
export function circCirc(ax, ay, ar, bx, by, br) {
  return dist(ax, ay, bx, by) < ar + br;
}

/**
 * circRect(cx, cy, cr, rx, ry, rw, rh)
 * Returns true if a circle overlaps an AABB.
 * Uses nearest-point clamping.
 */
export function circRect(cx, cy, cr, rx, ry, rw, rh) {
  var nearX = Math.max(rx, Math.min(cx, rx + rw));
  var nearY = Math.max(ry, Math.min(cy, ry + rh));
  return dist(cx, cy, nearX, nearY) < cr;
}

/**
 * circContains(cx, cy, cr, px, py)
 * Returns true if point (px,py) is inside the circle.
 */
export function circContains(cx, cy, cr, px, py) {
  return dist(cx, cy, px, py) <= cr;
}

/* ── Proximity ────────────────────────────────────────────── */

/**
 * inRange(ax, ay, bx, by, range)
 * Convenience wrapper — true if distance < range.
 */
export function inRange(ax, ay, bx, by, range) {
  return dist(ax, ay, bx, by) < range;
}

/**
 * nearestEntity(x, y, entities, radiusField)
 * Returns the closest entity within search radius, or null.
 * @param {number}   x, y         – origin point
 * @param {Array}    entities      – array of objects with .x/.y
 * @param {number}   maxDist       – search radius
 * @param {Function} [filterFn]    – optional predicate
 * @returns {object|null}
 */
export function nearestEntity(x, y, entities, maxDist, filterFn) {
  var best     = null;
  var bestDist = maxDist;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (filterFn && !filterFn(e)) continue;
    var d = dist(x, y, e.x, e.y);
    if (d < bestDist) {
      bestDist = d;
      best     = e;
    }
  }
  return best;
}

/* ══════════════════════════════════════════════════════════════
   Spatial Hash Grid
   Divides the canvas into fixed-size cells.
   Greatly reduces O(n²) collision checks for large villager counts.
══════════════════════════════════════════════════════════════ */

/**
 * SpatialGrid
 * @param {number} cellSize  – pixel size of each cell (default 64)
 */
export function SpatialGrid(cellSize) {
  this.cellSize = cellSize || 64;
  this.cells    = {};
}

/**
 * _key(cx, cy) – internal string key for a cell coordinate.
 */
SpatialGrid.prototype._key = function(cx, cy) {
  return cx + '|' + cy;
};

/**
 * clear()
 * Empties all cells. Call once per frame before inserting.
 */
SpatialGrid.prototype.clear = function() {
  this.cells = {};
};

/**
 * insert(entity)
 * Registers an entity (must have .x and .y) into the grid.
 */
SpatialGrid.prototype.insert = function(entity) {
  var cx  = Math.floor(entity.x / this.cellSize);
  var cy  = Math.floor(entity.y / this.cellSize);
  var key = this._key(cx, cy);
  if (!this.cells[key]) this.cells[key] = [];
  this.cells[key].push(entity);
};

/**
 * query(x, y, radius)
 * Returns all entities in cells that overlap the circle (x,y,radius).
 * Note: result may include entities slightly outside the circle —
 *       caller should do a final distance check.
 * @returns {Array}
 */
SpatialGrid.prototype.query = function(x, y, radius) {
  var cs      = this.cellSize;
  var minCX   = Math.floor((x - radius) / cs);
  var maxCX   = Math.floor((x + radius) / cs);
  var minCY   = Math.floor((y - radius) / cs);
  var maxCY   = Math.floor((y + radius) / cs);
  var results = [];

  for (var cx = minCX; cx <= maxCX; cx++) {
    for (var cy = minCY; cy <= maxCY; cy++) {
      var bucket = this.cells[this._key(cx, cy)];
      if (bucket) {
        for (var i = 0; i < bucket.length; i++) {
          results.push(bucket[i]);
        }
      }
    }
  }
  return results;
};

/**
 * queryPairs(radius)
 * Efficiently returns all unique [a, b] pairs where
 * dist(a, b) < radius. Avoids O(n²) brute force.
 * @param {number} radius
 * @returns {Array.<[object, object]>}
 */
SpatialGrid.prototype.queryPairs = function(radius) {
  var pairs   = [];
  var checked = {};

  var keys = Object.keys(this.cells);
  for (var ki = 0; ki < keys.length; ki++) {
    var bucket = this.cells[keys[ki]];
    for (var i = 0; i < bucket.length; i++) {
      var a        = bucket[i];
      var neighbors = this.query(a.x, a.y, radius);
      for (var j = 0; j < neighbors.length; j++) {
        var b = neighbors[j];
        if (b === a) continue;
        // Canonical pair key to avoid duplicates
        var pairKey = a.id < b.id ? a.id + '_' + b.id : b.id + '_' + a.id;
        if (checked[pairKey]) continue;
        checked[pairKey] = true;
        if (dist(a.x, a.y, b.x, b.y) < radius) {
          pairs.push([a, b]);
        }
      }
    }
  }
  return pairs;
};
