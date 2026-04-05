import { clamp, lerp } from '../utils/perspective.js';

export var WORLD_W = 1280;
export var WORLD_H = 720;

var MIN_ZOOM = .5;  // Default value
var MAX_ZOOM = 4.0;

export var cam = {
  x: 0, y: 0,
  zoom: 1,
  tx: 0, ty: 0,
  tzoom: 1,
  ZOOM_IN: 3.2,
  ZOOM_SPEED: 7,
  focused: false,
  followTarget: null,
};

var _VW = 0;
var _VH = 0;

// Function to detect if device is desktop/large screen
function isDesktopScreen() {
  // Consider screens wider than 1024px as desktop
  // Also check for touch capability - desktop usually doesn't have touch
  var isLargeScreen = window.innerWidth >= 1024;
  var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Desktop: large screen AND not a touch device (or large screen tablet)
  // For tablets with large screens, we still use 1.0 for better visibility
  return isLargeScreen && !isTouchDevice;
}

// Function to update MIN_ZOOM based on screen size
export function updateMinZoomForScreen() {
  if (isDesktopScreen()) {
    MIN_ZOOM = 2.0;
  } else {
    MIN_ZOOM = 1.0;
  }
  
  // Ensure current zoom respects the new min zoom
  if (cam.zoom < MIN_ZOOM) {
    cam.zoom = MIN_ZOOM;
    cam.tzoom = MIN_ZOOM;
  }
  if (cam.tzoom < MIN_ZOOM) {
    cam.tzoom = MIN_ZOOM;
  }
  
  // Re-clamp camera position with new zoom constraints
  if (_VW > 0 && _VH > 0) {
    _clampTarget();
    clampCurrent();
  }
}

export function initCamera(vw, vh) {
  _VW = vw;
  _VH = vh;
  
  // Set initial min zoom based on screen size
  updateMinZoomForScreen();
  
  if (cam.zoom < MIN_ZOOM) { cam.zoom = MIN_ZOOM; }
  if (cam.tzoom < MIN_ZOOM) { cam.tzoom = MIN_ZOOM; }
}

export function camRecentre() {
  // Center camera on the actual game world center
  cam.x = cam.tx = WORLD_W / 2;
  cam.y = cam.ty = WORLD_H / 2;
  cam.zoom = cam.tzoom = MIN_ZOOM;
  cam.focused = false;
  cam.followTarget = null;
}

function _halfExtent(viewportSize, zoom) {
  return viewportSize / (2 * zoom);
}

function _clampAxis(val, worldSize, viewportSize, zoom) {
  var he = _halfExtent(viewportSize, zoom);
  // Clamp to world boundaries
  return clamp(val, he, worldSize - he);
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

export function camApply(ctx) {
  ctx.save();
  ctx.translate(_VW / 2, _VH / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
}

export function camReset(ctx) {
  ctx.restore();
}

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

export function zoomTo(wx, wy, follow, showMsgFn) {
  cam.tzoom = cam.ZOOM_IN;
  cam.tx = clamp(wx, 0, WORLD_W);
  cam.ty = clamp(wy, 0, WORLD_H);
  cam.focused = true;
  cam.followTarget = follow || null;
  _clampTarget();
  if (showMsgFn) showMsgFn('Pinalapit');
}

export function zoomOut() {
  cam.tzoom = MIN_ZOOM;
  cam.focused = false;
  cam.followTarget = null;
  _clampTarget();
}

export function panTo(wx, wy) {
  cam.followTarget = null;
  cam.tx = clamp(wx, 0, WORLD_W);
  cam.ty = clamp(wy, 0, WORLD_H);
  _clampTarget();
}

export function softPan(wx, wy, duration) {
  cam.tx = clamp(wx, 0, WORLD_W);
  cam.ty = clamp(wy, 0, WORLD_H);
  _clampTarget();
  if (duration && duration > 0) {
    clearTimeout(cam._softPanTimeout);
    cam._softPanTimeout = setTimeout(function() {
      if (!cam.focused) {
        cam.tx = WORLD_W / 2;
        cam.ty = WORLD_H / 2;
        _clampTarget();
      }
    }, duration * 1000);
  }
}

export function updateCamera(dt) {
  if (cam.followTarget) {
    cam.tx = clamp(cam.followTarget.x, 0, WORLD_W);
    cam.ty = clamp(cam.followTarget.y, 0, WORLD_H);
    _clampTarget();
  }

  var s = clamp(cam.ZOOM_SPEED * dt, 0, 1);
  cam.zoom = clamp(lerp(cam.zoom, cam.tzoom, s), MIN_ZOOM, MAX_ZOOM);
  cam.x = lerp(cam.x, cam.tx, s);
  cam.y = lerp(cam.y, cam.ty, s);
  clampCurrent();
}

export function getMinZoom() { return MIN_ZOOM; }
export var CAMERA_MIN_ZOOM = MIN_ZOOM;
export var CAMERA_MAX_ZOOM = MAX_ZOOM;

export function expandWorld(dw, dh) {
  if (dw) WORLD_W += dw;
  if (dh) WORLD_H += dh;
}

export function getViewportSize() {
  return { w: _VW, h: _VH };
}

// Add resize event listener to update zoom on screen rotation/resize
if (typeof window !== 'undefined') {
  window.addEventListener('resize', function() {
    updateMinZoomForScreen();
  });
  
  // Also listen for orientation change on mobile
  window.addEventListener('orientationchange', function() {
    setTimeout(updateMinZoomForScreen, 100);
  });
}