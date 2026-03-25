import { clamp, lerp } from '../utils/perspective.js';

export var WORLD_W = 1280;
export var WORLD_H = 720;

var MIN_ZOOM = 1.0;
var MAX_ZOOM = 4.0;

function _calcMinZoom(vw, vh) {
  return 1.0;
}

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

export function initCamera(vw, vh) {
  _VW = vw;
  _VH = vh;
  MIN_ZOOM = 1.0;
  if (cam.zoom < MIN_ZOOM) { cam.zoom = MIN_ZOOM; }
  if (cam.tzoom < MIN_ZOOM) { cam.tzoom = MIN_ZOOM; }
}

export function camRecentre() {
  cam.x = cam.tx = WORLD_W / 2;
  cam.y = cam.ty = WORLD_H * 0.42;
  cam.zoom = cam.tzoom = MIN_ZOOM;
}

function _halfExtent(viewportSize, zoom) {
  return viewportSize / (2 * zoom);
}

function _clampAxis(val, worldSize, viewportSize, zoom) {
  var he = _halfExtent(viewportSize, zoom);
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
  cam.tx = wx;
  cam.ty = wy;
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
  cam.tx = wx;
  cam.ty = wy;
  _clampTarget();
}

export function softPan(wx, wy, duration) {
  cam.tx = wx;
  cam.ty = wy;
  _clampTarget();
  if (duration && duration > 0) {
    clearTimeout(cam._softPanTimeout);
    cam._softPanTimeout = setTimeout(function() {
      if (!cam.focused) {
        cam.tx = WORLD_W / 2;
        cam.ty = WORLD_H * 0.42;
        _clampTarget();
      }
    }, duration * 1000);
  }
}

export function updateCamera(dt) {
  if (cam.followTarget) {
    cam.tx = cam.followTarget.x;
    cam.ty = cam.followTarget.y;
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