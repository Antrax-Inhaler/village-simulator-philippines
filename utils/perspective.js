/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/perspective.js
   Core scaling + math helpers shared by all game systems.
   Exported as ES module — import what you need.
═══════════════════════════════════════════════════════════════ */

// VW / VH are set by main.js on init and resize.
// perspective.js reads them from the shared gameState window globals
// so every module stays in sync without circular imports.

/**
 * perspScale(y)
 * Maps a canvas Y position to a [0.32 … 1.0] scale factor.
 * Entities near the top (y≈0) appear small; near the bottom (y≈VH) appear full-size.
 * @param {number} y  – world Y coordinate
 * @returns {number}  – scale multiplier
 */
export function perspScale(y) {
  var VH = window._VH || 660;
  var t = y / VH;
  return 0.32 + 0.68 * Math.pow(t, 1.35);
}

/**
 * dist(ax, ay, bx, by)
 * Euclidean distance between two 2-D points.
 * @returns {number}
 */
export function dist(ax, ay, bx, by) {
  var dx = bx - ax;
  var dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * hitCheck(accuracy)
 * Random boolean weighted by [0..1] probability.
 * e.g. hitCheck(0.7) returns true ~70% of the time.
 * @param {number} accuracy
 * @returns {boolean}
 */
export function hitCheck(accuracy) {
  return Math.random() < accuracy;
}

/**
 * hpCol(ratio)
 * Returns an RGB color string that transitions
 * green (full) → yellow (half) → red (empty).
 * @param {number} ratio – clamped [0..1]
 * @returns {string}  CSS rgb() string
 */
export function hpCol(ratio) {
  ratio = clamp(ratio, 0, 1);
  var r, g;
  if (ratio >= 0.5) {
    // Green → Yellow
    var t = (1 - ratio) * 2;          // 0 at full, 1 at half
    r = Math.floor(200 * t);
    g = 200;
  } else {
    // Yellow → Red
    var t2 = ratio * 2;               // 1 at half, 0 at empty
    r = 200;
    g = Math.floor(200 * t2);
  }
  return 'rgb(' + r + ',' + g + ',30)';
}

/**
 * clamp(v, lo, hi)
 * Constrains v to [lo, hi].
 * @returns {number}
 */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * lerp(a, b, t)
 * Linear interpolation — t=0 returns a, t=1 returns b.
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * randRange(min, max)
 * Uniform random float in [min, max).
 * @returns {number}
 */
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * randInt(min, max)
 * Uniform random integer in [min, max] inclusive.
 * @returns {number}
 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * angleTo(ax, ay, bx, by)
 * Angle in radians from point A to point B.
 * @returns {number}
 */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/**
 * lerpColor(hexA, hexB, t)
 * Blends two hex color strings by factor t ∈ [0,1].
 * @param {string} hexA – e.g. '#ff0000'
 * @param {string} hexB – e.g. '#0000ff'
 * @param {number} t
 * @returns {string} hex color
 */
export function lerpColor(hexA, hexB, t) {
  var rA = parseInt(hexA.slice(1, 3), 16);
  var gA = parseInt(hexA.slice(3, 5), 16);
  var bA = parseInt(hexA.slice(5, 7), 16);
  var rB = parseInt(hexB.slice(1, 3), 16);
  var gB = parseInt(hexB.slice(3, 5), 16);
  var bB = parseInt(hexB.slice(5, 7), 16);
  var r  = Math.round(lerp(rA, rB, t));
  var g  = Math.round(lerp(gA, gB, t));
  var b  = Math.round(lerp(bA, bB, t));
  return '#' +
    ('0' + r.toString(16)).slice(-2) +
    ('0' + g.toString(16)).slice(-2) +
    ('0' + b.toString(16)).slice(-2);
}
