/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — render/camera.js

   CAMERA SYSTEM
   ─────────────────────────────────────────────────────────────
   Lifted verbatim from main.js camera section (~41 lines) and
   promoted to its own module so renderer.js and input.js can
   both import coordinate helpers without circular deps.

   DESIGN
   ─────────────────────────────────────────────────────────────
   cam is a plain object exported by reference — every importer
   reads the same live state. VW/VH are set by main.js on init
   and resize; camera.js reads them from window._VW / window._VH
   (same pattern as perspective.js) so it stays in sync without
   circular imports.

   ZOOM LEVELS
   ─────────────────────────────────────────────────────────────
   MIN_ZOOM = 2.4   Base zoom — always active; player cannot zoom out.
                    Pan freely at this level.
   ZOOM_IN  = 3.2   Click-zoom when selecting a building or villager.
                    zoomOut() returns to 2.4 (not full zoom-out) and
                    releases the follow-lock so panning is unrestricted.
   MAX_ZOOM = 4.0   Hard ceiling.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   cam                      — live camera state object
   initCamera(vw, vh)       — call from main.js after canvas resize
   camApply(ctx)            — push world transform onto ctx
   camReset(ctx)            — pop world transform
   w2s(wx, wy)              — world → screen  { x, y }
   s2w(sx, sy)              — screen → world  { x, y }
   zoomTo(wx, wy, follow)   — focus zoom on a world point
   zoomOut()                — return to base 2.4× view (free pan)
   panTo(wx, wy)            — smooth pan to world point (double-click land)
   updateCamera(dt)         — lerp cam toward targets (call every frame)
═══════════════════════════════════════════════════════════════ */

import { clamp, lerp } from '../utils/perspective.js';

/* ── Constants ────────────────────────────────────────────── */
/* Fixed logical world size — entities are always placed in this
   coordinate space regardless of the actual device screen size.
   The camera zooms/pans to map this world onto whatever viewport
   the player has, so nothing ever compresses on mobile. */
export var WORLD_W = 1280;
export var WORLD_H = 720;

var MIN_ZOOM  = 1.0;   /* recalculated by initCamera() — do not mutate directly */
var MAX_ZOOM  = 4.0;

/* ── Compute MIN_ZOOM so the entire fixed world fits on screen.
   We need: viewport_size / zoom >= world_size
   i.e.     zoom >= viewport_size / world_size
   Take the LARGER of the two axes so the whole world is always
   visible, then clamp to [0.5, 2.4] as a reasonable range. ── */
function _calcMinZoom(vw, vh) {
  var zoomForW = vw / WORLD_W;
  var zoomForH = vh / WORLD_H;
  /* Use the axis that needs MORE zoom to cover the world */
  var responsive = Math.max(zoomForW, zoomForH);
  /* Clamp: never below 0.5 (too far out), never above 2.4 (desktop baseline) */
  return Math.min(2.4, Math.max(0.5, responsive));
}

/* ── Camera state (exported by reference) ─────────────────── */
export var cam = {
  x: 0, y: 0,          /* current position (lerped) */
  zoom: 1,              /* current zoom (lerped) */
  tx: 0, ty: 0,         /* target position */
  tzoom: 1,             /* target zoom */
  ZOOM_IN: 3.2,         /* zoom level used by zoomTo() — buildings & villagers */
  ZOOM_SPEED: 7,        /* lerp speed multiplier */
  focused: false,       /* true when zoomed into an entity */
  followTarget: null,   /* entity to track (has .x / .y) */
};

/* ── Live VW/VH refs (updated by initCamera) ──────────────── */
var _VW = 0;
var _VH = 0;

/* ══════════════════════════════════════════════════════════════
   initCamera
   Call from main.js after canvas is sized and on every resize.
══════════════════════════════════════════════════════════════ */
export function initCamera(vw, vh) {
  _VW = vw;
  _VH = vh;
  /* Recalculate the responsive floor zoom for this viewport */
  MIN_ZOOM = _calcMinZoom(vw, vh);
  /* If the current zoom is below the new floor, snap it up */
  if (cam.zoom   < MIN_ZOOM) { cam.zoom   = MIN_ZOOM; }
  if (cam.tzoom  < MIN_ZOOM) { cam.tzoom  = MIN_ZOOM; }
}

/* ── Centred reset (no lerp — used on first frame + resize) ── */
export function camRecentre() {
  cam.x    = cam.tx    = WORLD_W / 2;
  /* Start slightly above world centre so buildings aren't crowded at bottom */
  cam.y    = cam.ty    = WORLD_H * 0.42;
  cam.zoom = cam.tzoom = MIN_ZOOM;
}

/* ── Clamp helpers ────────────────────────────────────────── */
/*
   World size == WORLD_W × WORLD_H (fixed logical units).
   The visible half-extent in world units at a given zoom = viewport_size / (2 * zoom).
   Camera centre must stay inside [half_extent … world_size - half_extent]
   so the viewport never shows empty space outside the world.
   Guard: if the viewport is wider than the world (zoom < 1), just centre.
*/
function _halfExtent(viewportSize, zoom) {
  return viewportSize / (2 * zoom);
}
function _clampAxis(val, worldSize, viewportSize, zoom) {
  var he = _halfExtent(viewportSize, zoom);
  /* If the visible area is larger than the world, centre it */
  return (2 * he >= worldSize) ? worldSize / 2 : clamp(val, he, worldSize - he);
}

function _clampTarget() {
  cam.tzoom = clamp(cam.tzoom, MIN_ZOOM, MAX_ZOOM);
  cam.tx = _clampAxis(cam.tx, WORLD_W, _VW, cam.tzoom);
  cam.ty = _clampAxis(cam.ty, WORLD_H, _VH, cam.tzoom);
}

export function clampCurrent() {
  cam.x = _clampAxis(cam.x, WORLD_W, _VW, cam.zoom);
  cam.y = _clampAxis(cam.y, WORLD_H, _VH, cam.zoom);
}

/* ══════════════════════════════════════════════════════════════
   camApply / camReset
   Wrap world-space draw calls.
   Transform: translate viewport centre → scale by zoom → translate by -cam position.
   Entity positions in world space (0..WORLD_W, 0..WORLD_H) are mapped
   to screen pixels independently of the physical viewport size.
══════════════════════════════════════════════════════════════ */
export function camApply(ctx) {
  ctx.save();
  ctx.translate(_VW / 2, _VH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

export function camReset(ctx) {
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
   Coordinate conversions
══════════════════════════════════════════════════════════════ */
export function w2s(wx, wy) {
  return {
    x: (wx - cam.x) * cam.zoom + _VW / 2,
    y: (wy - cam.y) * cam.zoom + _VH / 2,
  };
}

export function s2w(sx, sy) {
  return {
    x: (sx - _VW / 2) / cam.zoom + cam.x,
    y: (sy - _VH / 2) / cam.zoom + cam.y,
  };
}

/* ══════════════════════════════════════════════════════════════
   zoomTo / zoomOut
   Called by ui/drawer.js when an entity is selected.
   showMsg is passed in to avoid importing it here.
══════════════════════════════════════════════════════════════ */
export function zoomTo(wx, wy, follow, showMsgFn) {
  cam.tzoom       = cam.ZOOM_IN;
  cam.tx          = wx;
  cam.ty          = wy;
  cam.focused     = true;
  cam.followTarget = follow || null;
  _clampTarget();
  // Removed "Esc para lumabas" message - just show zoom indicator only
  if (showMsgFn) showMsgFn('Pinalapit');
}

export function zoomOut() {
  cam.tzoom        = MIN_ZOOM;  /* back to base 2.4× — not full zoom-out */
  cam.focused      = false;
  cam.followTarget = null;      /* release entity lock so player can pan freely */
  _clampTarget();               /* keep tx/ty where they are — don't snap to centre */
}

/* ── panTo ────────────────────────────────────────────────────
   Smoothly pan to a world position at the current zoom level.
   Called by input.js on double-click of empty land.
   Does NOT change zoom or focused state.
─────────────────────────────────────────────────────────────── */
export function panTo(wx, wy) {
  cam.followTarget = null;   /* release any entity follow */
  cam.tx = wx;
  cam.ty = wy;
  _clampTarget();
}

/* ── softPan ──────────────────────────────────────────────────
   Gently pan toward a world position without locking the camera
   or changing zoom. Player can immediately override by dragging.
   Used for birth announcements, protest gatherings, events.
   duration: how long to hold before auto-releasing (seconds).
─────────────────────────────────────────────────────────────── */
export function softPan(wx, wy, duration) {
  cam.tx = wx;
  cam.ty = wy;
  _clampTarget();
  /* Auto-release after duration */
  if (duration && duration > 0) {
    clearTimeout(cam._softPanTimeout);
    cam._softPanTimeout = setTimeout(function() {
      /* Only release if player hasn't manually panned or zoomed */
      if (!cam.focused) {
        cam.tx = WORLD_W / 2;
        cam.ty = WORLD_H * 0.42;
        _clampTarget();
      }
    }, duration * 1000);
  }
}

/* ══════════════════════════════════════════════════════════════
   updateCamera
   Smooth lerp toward target. Call once per frame before render.
══════════════════════════════════════════════════════════════ */
export function updateCamera(dt) {
  /* If tracking a moving entity, keep target locked to it */
  if (cam.followTarget) {
    cam.tx = cam.followTarget.x;
    cam.ty = cam.followTarget.y;
    _clampTarget();
  }

  var s    = clamp(cam.ZOOM_SPEED * dt, 0, 1);
  cam.zoom = clamp(lerp(cam.zoom, cam.tzoom, s), MIN_ZOOM, MAX_ZOOM);
  cam.x    = lerp(cam.x, cam.tx, s);
  cam.y    = lerp(cam.y, cam.ty, s);
  clampCurrent();
}

/* ── Expose MIN/MAX for input.js ──────────────────────────── */
export function getMinZoom() { return MIN_ZOOM; }
export var CAMERA_MIN_ZOOM = MIN_ZOOM;
export var CAMERA_MAX_ZOOM = MAX_ZOOM;

/* ── expandWorld — called by expansionPanel when zones unlock ─
   Grows the logical world coordinate space. Camera clamps and
   MIN_ZOOM are recalculated on the next initCamera call.
─────────────────────────────────────────────────────────────── */
export function expandWorld(dw, dh) {
  if (dw) WORLD_W += dw;
  if (dh) WORLD_H += dh;
}