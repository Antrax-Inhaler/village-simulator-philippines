/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/sprites.js

   Sprite / image overlay system.
   ─────────────────────────────────────────────────────────────
   CONCEPT
     Every building type has 3 named sprite frames (lv1, lv2, lv3).
     Every resource node type has 3 named sprite frames
     (full, half, depleted).

     When an image file is present at the expected path it loads
     automatically and is drawn ON TOP of the canvas art, fully
     covering it so the art acts as a placeholder.

     If an image is missing or still loading the canvas art shows
     normally — no blank gap, no broken image.

   FILE NAMING CONVENTION  (place files in /sprites/)
     Buildings:
       sprites/building_<type>_lv1.png
       sprites/building_<type>_lv2.png
       sprites/building_<type>_lv3.png

     Resource nodes:
       sprites/resource_<type>_full.png
       sprites/resource_<type>_half.png
       sprites/resource_<type>_depleted.png

     Example:
       sprites/building_house_lv1.png
       sprites/building_mainHall_lv2.png
       sprites/resource_forest_full.png
       sprites/resource_mine_depleted.png

   DRAW BOUNDS (all in local space after ctx.translate to centre)
     Buildings:  x = -w/2 .. w/2,  y = -h*1.2 .. h*0.3
                 Full sprite sheet covers that rectangle.
     Resources:  x = -w/2 .. w/2,  y = -h*0.9 .. h*0.3
═══════════════════════════════════════════════════════════════ */

/* ── Image cache  { path → HTMLImageElement | 'loading' | 'missing' } ── */
var _cache = {};

/**
 * _load(path)
 * Returns the cached HTMLImageElement if ready,
 * null while still loading, or null if missing/errored.
 * Starts loading on first call.
 */
function _load(path) {
  var entry = _cache[path];

  if (entry === 'missing')  return null;
  if (entry === 'loading')  return null;
  if (entry instanceof Image && entry.complete && entry.naturalWidth > 0) return entry;

  // First request — start loading
  if (!entry) {
    _cache[path] = 'loading';
    var img = new Image();
    img.onload  = function() { _cache[path] = img; };
    img.onerror = function() { _cache[path] = 'missing'; };
    img.src = path;
  }
  return null;
}

/* ── Building sprite paths ────────────────────────────────── */

/**
 * BUILDING_SPRITES
 * For each building type: three sprite frame paths.
 * lv1 → level 1 appearance
 * lv2 → level 2–3 appearance
 * lv3 → level 4–5 appearance (grandest)
 */
export var BUILDING_SPRITES = {
  mainHall:  {
    lv1: 'sprites/building_mainHall_lv1.png',
    lv2: 'sprites/building_mainHall_lv2.png',
    lv3: 'sprites/building_mainHall_lv3.png',
  },
  house: {
    lv1: 'sprites/building_house_lv1.png',
    lv2: 'sprites/building_house_lv2.png',
    lv3: 'sprites/building_house_lv3.png',
  },
  palengke: {
    lv1: 'sprites/building_palengke_lv1.png',
    lv2: 'sprites/building_palengke_lv2.png',
    lv3: 'sprites/building_palengke_lv3.png',
  },
  farm: {
    lv1: 'sprites/building_farm_lv1.png',
    lv2: 'sprites/building_farm_lv2.png',
    lv3: 'sprites/building_farm_lv3.png',
  },
  storage: {
    lv1: 'sprites/building_storage_lv1.png',
    lv2: 'sprites/building_storage_lv2.png',
    lv3: 'sprites/building_storage_lv3.png',
  },
  mine: {
    lv1: 'sprites/building_mine_lv1.png',
    lv2: 'sprites/building_mine_lv2.png',
    lv3: 'sprites/building_mine_lv3.png',
  },
  paaralan: {
    lv1: 'sprites/building_paaralan_lv1.png',
    lv2: 'sprites/building_paaralan_lv2.png',
    lv3: 'sprites/building_paaralan_lv3.png',
  },
  cuartel: {
    lv1: 'sprites/building_cuartel_lv1.png',
    lv2: 'sprites/building_cuartel_lv2.png',
    lv3: 'sprites/building_cuartel_lv3.png',
  },
  templo: {
    lv1: 'sprites/building_templo_lv1.png',
    lv2: 'sprites/building_templo_lv2.png',
    lv3: 'sprites/building_templo_lv3.png',
  },
  moog: {
    lv1: 'sprites/building_moog_lv1.png',
    lv2: 'sprites/building_moog_lv2.png',
    lv3: 'sprites/building_moog_lv3.png',
  },
  kuta: {
    lv1: 'sprites/building_kuta_lv1.png',
    lv2: 'sprites/building_kuta_lv2.png',
    lv3: 'sprites/building_kuta_lv3.png',
  },
  bantayan: {
    lv1: 'sprites/building_bantayan_lv1.png',
    lv2: 'sprites/building_bantayan_lv2.png',
    lv3: 'sprites/building_bantayan_lv3.png',
  },
  hukuman: {
    lv1: 'sprites/building_hukuman_lv1.png',
    lv2: 'sprites/building_hukuman_lv2.png',
    lv3: 'sprites/building_hukuman_lv3.png',
  },
};

/* ── Resource node sprite paths ───────────────────────────── */

/**
 * RESOURCE_SPRITES
 * Three states per resource type:
 * full → > 60% remaining
 * half → 20–60% remaining
 * depleted → < 20% remaining
 */
export var RESOURCE_SPRITES = {
  forest: {
    full:     'sprites/resource_forest_full.png',
    half:     'sprites/resource_forest_half.png',
    depleted: 'sprites/resource_forest_depleted.png',
  },
  river: {
    full:     'sprites/resource_river_full.png',
    half:     'sprites/resource_river_half.png',
    depleted: 'sprites/resource_river_depleted.png',
  },
  mine: {
    full:     'sprites/resource_mine_full.png',
    half:     'sprites/resource_mine_half.png',
    depleted: 'sprites/resource_mine_depleted.png',
  },
};

/* ── Helpers ──────────────────────────────────────────────── */

/**
 * _buildingFrame(type, level)
 * Returns 'lv1' | 'lv2' | 'lv3' based on building level.
 */
function _buildingFrame(level) {
  if (level <= 1) return 'lv1';
  if (level <= 3) return 'lv2';
  return 'lv3';
}

/**
 * _resourceFrame(ratio)
 * Returns 'full' | 'half' | 'depleted' based on resource ratio.
 */
function _resourceFrame(ratio) {
  if (ratio > 0.6) return 'full';
  if (ratio > 0.2) return 'half';
  return 'depleted';
}

/* ── Public draw functions ────────────────────────────────── */

/**
 * drawBuildingSprite(ctx, type, level, w, h)
 *
 * Call this AFTER the canvas placeholder art has been drawn,
 * while the ctx is still translated to building centre.
 *
 * The sprite is drawn to cover the full building footprint:
 *   x: -w/2 .. w/2
 *   y: -h*1.2 .. h*0.3   (tall enough to include roof)
 *
 * Returns true if an image was drawn, false if placeholder showing.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string}  type   – building type key
 * @param {number}  level  – current building level
 * @param {number}  w      – scaled width  (def.w * perspScale)
 * @param {number}  h      – scaled height (def.h * perspScale)
 */
export function drawBuildingSprite(ctx, type, level, w, h) {
  var frames = BUILDING_SPRITES[type];
  if (!frames) return false;

  var frame = _buildingFrame(level);
  var img   = _load(frames[frame]);
  if (!img) return false;

  // Cover the full building: from top of roof to bottom of base
  var sx = -w / 2;
  var sy = -h * 1.25;     // above roof peak
  var sw = w;
  var sh = h * 1.55;      // roof + walls + base

  ctx.save();
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.restore();
  return true;
}

/**
 * drawResourceSprite(ctx, type, ratio, w, h)
 *
 * Call AFTER canvas placeholder art, while ctx is translated
 * to resource centre.
 *
 * Sprite covers: x: -w/2..w/2, y: -h*0.9..h*0.3
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string}  type   – 'forest' | 'river' | 'mine'
 * @param {number}  ratio  – resource fullness 0..1
 * @param {number}  w      – scaled width
 * @param {number}  h      – scaled height
 */
export function drawResourceSprite(ctx, type, ratio, w, h) {
  var frames = RESOURCE_SPRITES[type];
  if (!frames) return false;

  var frame = _resourceFrame(ratio);
  var img   = _load(frames[frame]);
  if (!img) return false;

  var sx = -w / 2;
  var sy = -h * 0.95;
  var sw = w;
  var sh = h * 1.25;

  ctx.save();
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.restore();
  return true;
}

/* ── Ground / terrain sprites ─────────────────────────────── */

/**
 * GROUND_SPRITES
 * Optional terrain textures drawn over the gradient ground.
 * Each is a full-canvas image tiled or stretched to fit.
 *
 * Filenames:
 *   sprites/ground_grass.png   — main green field texture
 *   sprites/ground_path.png    — dirt road/path overlay
 */
export var GROUND_SPRITES = {
  grass: 'sprites/ground_grass.png',
  path:  'sprites/ground_path.png',
};

/**
 * drawGroundSprite(ctx, key, x, y, w, h)
 * Draws a ground texture over a rectangle.
 * Call AFTER _drawGround() in main.js render.
 * Returns true if image was drawn, false if placeholder showing.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} key   — 'grass' | 'path'
 * @param {number} x, y  — top-left corner
 * @param {number} w, h  — width and height to fill
 */
export function drawGroundSprite(ctx, key, x, y, w, h) {
  var path = GROUND_SPRITES[key];
  if (!path) return false;
  var img = _load(path);
  if (!img) return false;
  ctx.save();
  ctx.globalAlpha = 0.85;   // slight transparency so gradient depth still shows
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  return true;
}

export function preloadAll() {
  // Buildings
  Object.keys(BUILDING_SPRITES).forEach(function(type) {
    var frames = BUILDING_SPRITES[type];
    ['lv1','lv2','lv3'].forEach(function(f) { _load(frames[f]); });
  });
  // Resources
  Object.keys(RESOURCE_SPRITES).forEach(function(type) {
    var frames = RESOURCE_SPRITES[type];
    ['full','half','depleted'].forEach(function(f) { _load(frames[f]); });
  });
  // Ground
  Object.keys(GROUND_SPRITES).forEach(function(k) { _load(GROUND_SPRITES[k]); });
}