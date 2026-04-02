/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — world/world.js
   Pre-planned road network for the village.
   Roads are placed before the player starts — the village already
   has a layout; the player just upgrades the buildings and roads.

   ROAD SEGMENT FORMAT:
     { x, y, dir, len }
       x, y  — world-space centre of the road segment
       dir   — 'h' (horizontal) or 'v' (vertical)
       len   — length of this segment in world units

   ROAD VISUAL DIMENSIONS  (mirrors _drawKalye):
     Road width  (across traffic) : ROAD_W = 16   px  (kalye def.h)
     Road length (along traffic)  : varies per segment

   BUILDING SLOT SIZES used for spacing maths:
     Smallest building  ≈  32 × 24  (moog)
     Typical building   ≈  60 × 44
     Large building     ≈  84 × 52  (farm / mainHall)

   SPACING RULES applied here:
     • Single-building block  → 120 w × 92  h gap between roads
     • Double-building block  → 240 w × 92  h gap
     • Triple-building block  → 360 w × 92  h gap

   The road grid is NOT a repeating pattern.  Instead it follows
   three organic "rings":
     Ring 0 — tight loop around the mainHall (plasa)
     Ring 1 — inner neighbourhood with diagonal-offset blocks
     Ring 2 — outer perimeter / expansion spurs

   All coordinates are for a 1280 × 720 world.
   mainHall is centred at (640, 360).
═══════════════════════════════════════════════════════════════ */

/* ── Constants ──────────────────────────────────────────────── */
export var ROAD_W   = 16;   // visual width across traffic (kalye h)
export var ROAD_LEN = 80;   // default segment length     (kalye w)

/* Half-widths used for collision / placement checks */
var _RH = ROAD_W / 2;       //  8

/*
  WORLD_W = 1280, WORLD_H = 720
  mainHall cx = 640, cy = 360
*/

/* ═══════════════════════════════════════════════════════════════
   ROAD SEGMENTS
   Each entry is { x, y, dir, len } where x,y is the CENTRE of
   the segment.  'h' = horizontal road (traffic flows left-right),
   'v' = vertical road (traffic flows up-down).
═══════════════════════════════════════════════════════════════ */
export var ROAD_SEGMENTS = (function() {

  /* ── helper: push a horizontal segment ─────────────────────── */
  function h(cx, cy, len) { return { x: cx, y: cy, dir: 'h', len: len }; }
  /* ── helper: push a vertical segment ───────────────────────── */
  function v(cx, cy, len) { return { x: cx, y: cy, dir: 'v', len: len }; }

  var segs = [];

  /* ════════════════════════════════════════════════════════════
     RING 0 — PLASA  (surrounding mainHall at 640,360)
     mainHall size: 72×52  →  half = 36w, 26h
     We want ~20 px clearance on all sides before the road centre.
     Road centre offset from hall edge: 20 + ROAD_W/2 ≈ 28
     So plasa box:
       top    road  cy = 360 - 26 - 28 = 306
       bottom road  cy = 360 + 26 + 28 = 414
       left   road  cx = 640 - 36 - 28 = 576
       right  road  cx = 640 + 36 + 28 = 704
     Horizontal segments span left-road to right-road: 704-576 = 128 → len 128+ROAD_W
     Vertical segments span top-road to bottom-road:   414-306 = 108 → len 108+ROAD_W
  ════════════════════════════════════════════════════════════ */

  var mhCX = 640, mhCY = 360;

  // Plasa corners in road-centre coords
  var pL = mhCX - 64;   // 576
  var pR = mhCX + 64;   // 704
  var pT = mhCY - 54;   // 306
  var pB = mhCY + 54;   // 414

  // Four sides of the plasa loop
  segs.push( h( (pL+pR)/2, pT,   pR-pL+ROAD_W ) );   // top    horizontal
  segs.push( h( (pL+pR)/2, pB,   pR-pL+ROAD_W ) );   // bottom horizontal
  segs.push( v( pL, (pT+pB)/2,   pB-pT+ROAD_W ) );   // left   vertical
  segs.push( v( pR, (pT+pB)/2,   pB-pT+ROAD_W ) );   // right  vertical

  /* ════════════════════════════════════════════════════════════
     RING 1 — INNER NEIGHBOURHOOD
     Block depth from plasa road:
       single-building column  → 92 h gap  → next road centre at +92+ROAD_W = +108
       double-building column  → 184 h gap → next road centre at +184+ROAD_W = +200

     Block width:
       single col  → 120 w
       double col  → 240 w

     We carve out four "arms" N / S / W / E from the plasa,
     then connect them with two cross-streets and a ring road.
  ════════════════════════════════════════════════════════════ */

  /* --- NORTH ARM (above plasa) ------------------------------ */
  // Road running north from top of plasa → 1 double-building block deep
  // North perimeter road  cy = pT - 108  = 306 - 108 = 198
  var northRoad = pT - 108;   // 198

  // Horizontal perimeter road spanning full inner zone
  segs.push( h( mhCX, northRoad, 480 ) );

  // Three vertical connectors: left, centre, right
  // Centre connector: straight up the middle (already have plasa left/right verticals)
  var northConnLen = pT - northRoad + ROAD_W;   // 108+16 = 124
  segs.push( v( mhCX,       pT - northConnLen/2 + ROAD_W/2, northConnLen ) );
  segs.push( v( mhCX - 160, pT - northConnLen/2 + ROAD_W/2, northConnLen ) );
  segs.push( v( mhCX + 160, pT - northConnLen/2 + ROAD_W/2, northConnLen ) );

  /* --- SOUTH ARM (below plasa) ------------------------------ */
  // Single-building block then double → two parallel east-west roads
  var southRoad1 = pB + 108;   // 414 + 108 = 522
  var southRoad2 = pB + 216;   // 414 + 216 = 630

  segs.push( h( mhCX, southRoad1, 480 ) );
  segs.push( h( mhCX, southRoad2, 360 ) );

  // Vertical connectors
  var southConnLen1 = southRoad1 - pB + ROAD_W;
  var southConnLen2 = southRoad2 - southRoad1 + ROAD_W;
  segs.push( v( mhCX,       pB + southConnLen1/2 - ROAD_W/2, southConnLen1 ) );
  segs.push( v( mhCX - 140, pB + southConnLen1/2 - ROAD_W/2, southConnLen1 ) );
  segs.push( v( mhCX + 140, pB + southConnLen1/2 - ROAD_W/2, southConnLen1 ) );
  // Side connectors between southRoad1 and southRoad2
  segs.push( v( mhCX - 100, southRoad1 + southConnLen2/2 - ROAD_W/2, southConnLen2 ) );
  segs.push( v( mhCX + 100, southRoad1 + southConnLen2/2 - ROAD_W/2, southConnLen2 ) );

  /* --- WEST ARM (left of plasa) ----------------------------- */
  // Double-building block width  west then another single
  var westRoad1 = pL - 200;    // 576 - 200 = 376
  var westRoad2 = pL - 320;    // 576 - 320 = 256

  // Vertical roads spanning the inner zone height
  var westVSpan = southRoad1 - northRoad + ROAD_W;   // 522-198+16 = 340
  var westVCY   = (northRoad + southRoad1) / 2;      // 360

  segs.push( v( westRoad1, westVCY, westVSpan ) );
  segs.push( v( westRoad2, westVCY, westVSpan - 60 ) );

  // Horizontal connectors at north-road and south-road levels
  var westHLen1 = pL - westRoad1 + ROAD_W;
  var westHLen2 = westRoad1 - westRoad2 + ROAD_W;
  segs.push( h( pL - westHLen1/2 + ROAD_W/2, northRoad, westHLen1 ) );
  segs.push( h( pL - westHLen1/2 + ROAD_W/2, southRoad1, westHLen1 ) );
  segs.push( h( westRoad1 - westHLen2/2 + ROAD_W/2, mhCY, westHLen2 ) );   // mid alley

  /* --- EAST ARM (right of plasa) ---------------------------- */
  var eastRoad1 = pR + 200;    // 704 + 200 = 904
  var eastRoad2 = pR + 320;    // 704 + 320 = 1024

  var eastVCY = westVCY;

  segs.push( v( eastRoad1, eastVCY, westVSpan ) );
  segs.push( v( eastRoad2, eastVCY, westVSpan - 60 ) );

  var eastHLen1 = eastRoad1 - pR + ROAD_W;
  var eastHLen2 = eastRoad2 - eastRoad1 + ROAD_W;
  segs.push( h( pR + eastHLen1/2 - ROAD_W/2, northRoad, eastHLen1 ) );
  segs.push( h( pR + eastHLen1/2 - ROAD_W/2, southRoad1, eastHLen1 ) );
  segs.push( h( eastRoad1 + eastHLen2/2 - ROAD_W/2, mhCY, eastHLen2 ) );  // mid alley

  /* ════════════════════════════════════════════════════════════
     RING 2 — OUTER PERIMETER & EXPANSION SPURS
     Connect west and east road2 with a grand perimeter road N & S,
     then add diagonal-offset spurs toward the map edges.
  ════════════════════════════════════════════════════════════ */

  // Grand north perimeter: connects northRoad westward and eastward
  var grandNorth = northRoad - 80;   // 198 - 80 = 118
  segs.push( h( mhCX, grandNorth, 800 ) );

  // Connectors from grandNorth to northRoad
  var grandNConnLen = northRoad - grandNorth + ROAD_W;
  segs.push( v( westRoad2,  grandNorth + grandNConnLen/2 - ROAD_W/2, grandNConnLen ) );
  segs.push( v( eastRoad2,  grandNorth + grandNConnLen/2 - ROAD_W/2, grandNConnLen ) );
  segs.push( v( mhCX - 300, grandNorth + grandNConnLen/2 - ROAD_W/2, grandNConnLen ) );
  segs.push( v( mhCX + 300, grandNorth + grandNConnLen/2 - ROAD_W/2, grandNConnLen ) );

  // Grand south perimeter: just below southRoad2
  var grandSouth = southRoad2 + 60;   // 630 + 60 = 690  (near map bottom)
  segs.push( h( mhCX, grandSouth, 700 ) );

  var grandSConnLen = grandSouth - southRoad2 + ROAD_W;
  segs.push( v( mhCX - 160, southRoad2 + grandSConnLen/2 - ROAD_W/2, grandSConnLen ) );
  segs.push( v( mhCX + 160, southRoad2 + grandSConnLen/2 - ROAD_W/2, grandSConnLen ) );

  // Left grand vertical — connecting grandNorth to grandSouth on far west
  var grandWestX = westRoad2 - 80;   // 256 - 80 = 176
  var grandLRLen = grandSouth - grandNorth + ROAD_W;
  segs.push( v( grandWestX, (grandNorth+grandSouth)/2, grandLRLen ) );

  // Right grand vertical — mirror east
  var grandEastX = eastRoad2 + 80;   // 1024 + 80 = 1104
  segs.push( v( grandEastX, (grandNorth+grandSouth)/2, grandLRLen ) );

  // Connectors tying west/east grand verticals to inner network
  var grandWHLen = westRoad2 - grandWestX + ROAD_W;
  segs.push( h( grandWestX + grandWHLen/2 - ROAD_W/2, northRoad,   grandWHLen ) );
  segs.push( h( grandWestX + grandWHLen/2 - ROAD_W/2, mhCY,        grandWHLen ) );
  segs.push( h( grandWestX + grandWHLen/2 - ROAD_W/2, southRoad1,  grandWHLen ) );

  var grandEHLen = grandEastX - eastRoad2 + ROAD_W;
  segs.push( h( eastRoad2 + grandEHLen/2 - ROAD_W/2, northRoad,   grandEHLen ) );
  segs.push( h( eastRoad2 + grandEHLen/2 - ROAD_W/2, mhCY,        grandEHLen ) );
  segs.push( h( eastRoad2 + grandEHLen/2 - ROAD_W/2, southRoad1,  grandEHLen ) );

  /* ── DIAGONAL SPURS (short jogs that break grid monotony) ── */
  // NW spur — offset north-west block mid-alley
  segs.push( h( grandWestX + 60, grandNorth + 40, 120 ) );
  segs.push( v( grandWestX + 60, grandNorth + 20, 80  ) );

  // NE spur
  segs.push( h( grandEastX - 60, grandNorth + 40, 120 ) );
  segs.push( v( grandEastX - 60, grandNorth + 20, 80  ) );

  // SW spur — near south-west, dock/harbour area feel
  segs.push( h( grandWestX + 80, grandSouth - 40, 160 ) );
  segs.push( v( grandWestX + 80, grandSouth - 20, 80  ) );

  // SE spur
  segs.push( h( grandEastX - 80, grandSouth - 40, 160 ) );
  segs.push( v( grandEastX - 80, grandSouth - 20, 80  ) );

  return segs;

})();

/* ═══════════════════════════════════════════════════════════════
   isOnRoad(wx, wy)
   Returns true if the world point (wx, wy) lies within the footprint
   of any road segment.  Used by input.js to block building placement.

   Footprint of a segment:
     horizontal → rect [ cx - len/2, cy - ROAD_W/2,  len, ROAD_W ]
     vertical   → rect [ cx - ROAD_W/2, cy - len/2,  ROAD_W, len ]
═══════════════════════════════════════════════════════════════ */
export function isOnRoad(wx, wy) {
  for (var i = 0; i < ROAD_SEGMENTS.length; i++) {
    var s = ROAD_SEGMENTS[i];
    var hw = (s.dir === 'h') ? s.len / 2 : _RH;
    var hh = (s.dir === 'v') ? s.len / 2 : _RH;
    if (wx >= s.x - hw && wx <= s.x + hw &&
        wy >= s.y - hh && wy <= s.y + hh) {
      return true;
    }
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════
   isRectOnRoad(wx, wy, bldW, bldH)
   Returns true if a building rectangle overlaps any road.
   Call this before placing a building.

   wx, wy   — world centre of the intended building footprint
   bldW, bldH — building dimensions (from BUILDING_DEFS[type].w/h)
═══════════════════════════════════════════════════════════════ */
export function isRectOnRoad(wx, wy, bldW, bldH) {
  var bLeft  = wx - bldW / 2;
  var bRight = wx + bldW / 2;
  var bTop   = wy - bldH / 2;
  var bBot   = wy + bldH / 2;

  for (var i = 0; i < ROAD_SEGMENTS.length; i++) {
    var s  = ROAD_SEGMENTS[i];
    var hw = (s.dir === 'h') ? s.len / 2 : _RH;
    var hh = (s.dir === 'v') ? s.len / 2 : _RH;

    var rLeft  = s.x - hw;
    var rRight = s.x + hw;
    var rTop   = s.y - hh;
    var rBot   = s.y + hh;

    // AABB overlap
    if (bLeft  < rRight && bRight  > rLeft &&
        bTop   < rBot   && bBot    > rTop) {
      return true;
    }
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════
   getRoadBlockingMsg()
   Human-readable rejection message to show the player.
═══════════════════════════════════════════════════════════════ */
export function getRoadBlockingMsg() {
  return 'Hindi pwede! May kalye dito. Mag-upgrade ng kalye o piliin ang ibang lugar.';
}

/* ═══════════════════════════════════════════════════════════════
   drawRoads(ctx)
   Draws every road segment onto the canvas using the same visual
   style as _drawKalye in buildingSprites.js.
   Call this from renderer.js after drawGround, before buildings.
═══════════════════════════════════════════════════════════════ */
export function drawRoads(ctx) {
  for (var i = 0; i < ROAD_SEGMENTS.length; i++) {
    _drawSegment(ctx, ROAD_SEGMENTS[i]);
  }
}

function _drawSegment(ctx, seg) {
  var len = seg.len;
  var w   = (seg.dir === 'h') ? len    : ROAD_W;
  var h   = (seg.dir === 'v') ? len    : ROAD_W;

  ctx.save();
  ctx.translate(seg.x, seg.y);

  /* ── Road base (dirt/packed earth) ──────────────────────── */
  ctx.fillStyle = '#7a6a50';
  if (seg.dir === 'h') {
    ctx.fillRect(-len * 0.5, -h * 0.3, len, h * 0.45);
  } else {
    // vertical: rotate logic — treat len as height, ROAD_W as width
    ctx.fillRect(-ROAD_W * 0.5, -len * 0.5, ROAD_W, len);
  }

  /* ── Centre dashed line ─────────────────────────────────── */
  ctx.strokeStyle = 'rgba(240,230,180,0.5)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  if (seg.dir === 'h') {
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo( len * 0.5, 0);
  } else {
    ctx.moveTo(0, -len * 0.5);
    ctx.lineTo(0,  len * 0.5);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  /* ── Edge lines ─────────────────────────────────────────── */
  ctx.strokeStyle = 'rgba(255,230,150,0.3)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  if (seg.dir === 'h') {
    // top edge
    ctx.moveTo(-len * 0.55, -h * 0.29);
    ctx.lineTo( len * 0.55, -h * 0.29);
    ctx.stroke();
    ctx.beginPath();
    // bottom edge
    ctx.moveTo(-len * 0.55,  h * 0.14);
    ctx.lineTo( len * 0.55,  h * 0.14);
  } else {
    // left edge
    ctx.moveTo(-ROAD_W * 0.55, -len * 0.5);
    ctx.lineTo(-ROAD_W * 0.55,  len * 0.5);
    ctx.stroke();
    ctx.beginPath();
    // right edge
    ctx.moveTo( ROAD_W * 0.55, -len * 0.5);
    ctx.lineTo( ROAD_W * 0.55,  len * 0.5);
  }
  ctx.stroke();

  /* ── Intersection filler (square patch at crossings) ───── */
  // Draw a filled square at the segment centre to cover gaps
  // where H and V segments meet — same dirt colour.
  ctx.fillStyle = '#7a6a50';
  ctx.fillRect(-ROAD_W * 0.5, -ROAD_W * 0.5, ROAD_W, ROAD_W);

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   ROAD UPGRADE SYSTEM
   Roads start as dirt; the player can upgrade them to stone, then
   paved.  Higher-tier roads boost nearby building production.
═══════════════════════════════════════════════════════════════ */
export var ROAD_TIERS = {
  dirt  : { label:'Lupa',     cost:{ gold:0,   rice:0  }, prodBonus:0.00, color:'#7a6a50', lineColor:'rgba(240,230,180,0.5)' },
  gravel: { label:'Graba',    cost:{ gold:40,  rice:10 }, prodBonus:0.05, color:'#9a8a70', lineColor:'rgba(255,240,200,0.6)' },
  stone : { label:'Bato',     cost:{ gold:100, rice:20 }, prodBonus:0.10, color:'#b0a090', lineColor:'rgba(255,255,220,0.7)' },
  paved : { label:'Simento',  cost:{ gold:200, rice:40 }, prodBonus:0.15, color:'#c8bca8', lineColor:'rgba(255,255,255,0.5)' },
};

// Map from segment index to current tier
// Loaded/saved alongside the rest of VS.
export var roadTiers = (function() {
  var t = [];
  for (var i = 0; i < ROAD_SEGMENTS.length; i++) t.push('dirt');
  return t;
})();

/**
 * upgradeRoad(segIndex, VS)
 * Advances a road segment one tier if the player can afford it.
 * Returns { ok, msg }.
 */
export function upgradeRoad(segIndex, VS) {
  var order = ['dirt', 'gravel', 'stone', 'paved'];
  var cur   = roadTiers[segIndex] || 'dirt';
  var ni    = order.indexOf(cur) + 1;
  if (ni >= order.length) return { ok: false, msg: 'Pinakamataas na antas na ito.' };

  var nextTier = order[ni];
  var cost     = ROAD_TIERS[nextTier].cost;

  if ((VS.res.gold || 0) < cost.gold || (VS.res.rice || 0) < cost.rice) {
    return { ok: false, msg: 'Hindi sapat ang mga resources para i-upgrade ang kalye.' };
  }

  VS.res.gold -= cost.gold;
  VS.res.rice -= cost.rice;
  roadTiers[segIndex] = nextTier;

  return { ok: true, msg: 'Nai-upgrade ang kalye sa ' + ROAD_TIERS[nextTier].label + '!' };
}

/**
 * getRoadNearbyBonus(wx, wy)
 * Returns the highest prodBonus from any road segment within
 * 60 world-units of the given point.  Used by building tick.
 */
export function getRoadNearbyBonus(wx, wy) {
  var best = 0;
  for (var i = 0; i < ROAD_SEGMENTS.length; i++) {
    var s    = ROAD_SEGMENTS[i];
    var dx   = wx - s.x;
    var dy   = wy - s.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      var tier  = roadTiers[i] || 'dirt';
      var bonus = ROAD_TIERS[tier].prodBonus;
      if (bonus > best) best = bonus;
    }
  }
  return best;
}

/* ═══════════════════════════════════════════════════════════════
   SERIALISE / DESERIALISE  (for save-game integration)
═══════════════════════════════════════════════════════════════ */
export function serializeRoads() {
  return roadTiers.slice();
}

export function deserializeRoads(saved) {
  if (!Array.isArray(saved)) return;
  for (var i = 0; i < saved.length && i < roadTiers.length; i++) {
    if (ROAD_TIERS[saved[i]]) roadTiers[i] = saved[i];
  }
}

/* ═══════════════════════════════════════════════════════════════
   drawRoadsWithTiers(ctx)
   Like drawRoads but respects the current upgrade tier per segment.
   Use this in renderer.js instead of drawRoads once upgrades are
   wired up, or use drawRoads during dev.
═══════════════════════════════════════════════════════════════ */
export function drawRoadsWithTiers(ctx) {
  for (var i = 0; i < ROAD_SEGMENTS.length; i++) {
    var tier = roadTiers[i] || 'dirt';
    _drawSegmentTiered(ctx, ROAD_SEGMENTS[i], tier);
  }
}

function _drawSegmentTiered(ctx, seg, tier) {
  var td  = ROAD_TIERS[tier];
  var len = seg.len;
  var h   = ROAD_W;

  ctx.save();
  ctx.translate(seg.x, seg.y);

  /* ── Road base ───────────────────────────────────────────── */
  ctx.fillStyle = td.color;
  if (seg.dir === 'h') {
    ctx.fillRect(-len * 0.5, -h * 0.3, len, h * 0.45);
  } else {
    ctx.fillRect(-h * 0.5, -len * 0.5, h, len);
  }

  /* ── Centre dashed line ─────────────────────────────────── */
  ctx.strokeStyle = td.lineColor;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  if (seg.dir === 'h') {
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo( len * 0.5, 0);
  } else {
    ctx.moveTo(0, -len * 0.5);
    ctx.lineTo(0,  len * 0.5);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  /* ── Edge lines ─────────────────────────────────────────── */
  ctx.strokeStyle = 'rgba(255,255,200,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  if (seg.dir === 'h') {
    ctx.moveTo(-len * 0.55, -h * 0.29);
    ctx.lineTo( len * 0.55, -h * 0.29);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-len * 0.55,  h * 0.14);
    ctx.lineTo( len * 0.55,  h * 0.14);
  } else {
    ctx.moveTo(-h * 0.55, -len * 0.5);
    ctx.lineTo(-h * 0.55,  len * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo( h * 0.55, -len * 0.5);
    ctx.lineTo( h * 0.55,  len * 0.5);
  }
  ctx.stroke();

  /* ── Intersection patch ─────────────────────────────────── */
  ctx.fillStyle = td.color;
  ctx.fillRect(-h * 0.5, -h * 0.5, h, h);

  ctx.restore();
}