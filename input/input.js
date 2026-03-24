/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — input/input.js
   INPUT SYSTEM — fixed for MIN_ZOOM 2.4 panning
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, dist } from '../utils/perspective.js';
import { showProcurementModal }       from '../ui/procurementModal.js';
import {
  cam, s2w, w2s,
  zoomTo, zoomOut, panTo,
  clampCurrent,
  CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM,
} from '../render/camera.js';

var _deps   = null;
var _canvas = null;
var _mouseX = 0;
var _mouseY = 0;

var _drag = {
  active: false, startSX: 0, startSY: 0,
  startCamX: 0, startCamY: 0,
  moved: false, building: null, bldOffX: 0, bldOffY: 0,
};

var _lastClickTime = 0;
var _lastClickX    = 0;
var _lastClickY    = 0;
var DOUBLE_TAP_MS  = 320;
var DOUBLE_TAP_PX  = 30;

var _hoveredVillager = null;

/* ── Touch state ────────────────────────────────────────────── */
var _touch = {
  active:      false,
  count:       0,         /* number of active touch points */
  /* single-finger pan / tap */
  id0:         null,      /* primary touch identifier */
  startSX:     0, startSY: 0,
  startCamX:   0, startCamY: 0,
  moved:       false,
  /* pinch-zoom */
  id1:         null,      /* secondary touch identifier */
  pinchStartDist: 0,
  pinchStartZoom: 1,
};

export function initInput(canvas, deps) {
  _canvas = canvas;
  _deps   = deps;
  canvas.addEventListener('mousedown',   _onMouseDown);
  canvas.addEventListener('mouseup',     _onMouseUp);
  canvas.addEventListener('mousemove',   _onMouseMove);
  canvas.addEventListener('contextmenu', _onRightClick);
  canvas.addEventListener('wheel',       _onWheel, { passive: false });
  window.addEventListener('mouseup',     _onMouseUp);
  window.addEventListener('keydown',     _onKeyDown);

  /* ── Touch events ───────────────────────────────────────── */
  canvas.addEventListener('touchstart',  _onTouchStart,  { passive: false });
  canvas.addEventListener('touchmove',   _onTouchMove,   { passive: false });
  canvas.addEventListener('touchend',    _onTouchEnd,    { passive: false });
  canvas.addEventListener('touchcancel', _onTouchCancel, { passive: false });
}

export function getMousePos()        { return { x: _mouseX, y: _mouseY }; }
export function getHoveredVillager() { return _hoveredVillager; }
export function getDragState()       { return _drag; }

/* ── Mouse down ─────────────────────────────────────────────── */
function _onMouseDown(e) {
  if (e.button !== 0) return;
  var rect = _canvas.getBoundingClientRect();
  var sx   = e.clientX - rect.left;
  var sy   = e.clientY - rect.top;
  var mode = _deps.getGameMode();

  if (mode === 'build_shop' || mode === 'move_building') {
    _drag.active = true; _drag.moved = false; _drag.building = null;
    _drag.startSX = sx; _drag.startSY = sy;
    return;
  }

  _drag.building = null;
  var drawer = _deps.getDrawer();
  /* Only pick up buildings when at base zoom — any higher zoom = pan mode */
  if (mode === 'view' && !drawer.visible && cam.tzoom <= CAMERA_MIN_ZOOM + 0.05) {
    var wp0 = s2w(sx, sy);
    var VS  = _deps.VS;
    for (var b = 0; b < VS.buildings.length; b++) {
      var bld = VS.buildings[b];
      if (dist(wp0.x, wp0.y, bld.x, bld.y) < bld.w * perspScale(bld.y) * 0.6) {
        _drag.building = bld;
        _drag.bldOffX  = wp0.x - bld.x;
        _drag.bldOffY  = wp0.y - bld.y;
        break;
      }
    }
  }

  _drag.active    = true;
  _drag.moved     = false;
  _drag.startSX   = sx;        _drag.startSY   = sy;
  _drag.startCamX = cam.tx;    _drag.startCamY = cam.ty;
}

/* ── Mouse move ─────────────────────────────────────────────── */
function _onMouseMove(e) {
  var rect = _canvas.getBoundingClientRect();
  _mouseX  = e.clientX - rect.left;
  _mouseY  = e.clientY - rect.top;

  var mode   = _deps.getGameMode();
  var drawer = _deps.getDrawer();
  var VS     = _deps.VS;

  /* Hover-to-stop villager under cursor */
  if (!_drag.active) {
    var wp   = s2w(_mouseX, _mouseY);
    var VT   = _deps.VILLAGER_TYPES;
    var found = null;
    for (var i = 0; i < VS.villagers.length; i++) {
      var v  = VS.villagers[i];
      var vt = VT[v.typeIdx] || VT[0];
      if (dist(wp.x, wp.y, v.x, v.y) < 18 * perspScale(v.y) * vt.scale) { found = v; break; }
    }
    if (_hoveredVillager && _hoveredVillager !== found && _hoveredVillager._hoverStopped) {
      _hoveredVillager.waitT = 0; _hoveredVillager._hoverStopped = false;
    }
    if (found && found !== _hoveredVillager) {
      if (!found.isHome && !found.isTraining && !(drawer.visible && drawer.target === found)) {
        found._savedWaitT = found.waitT; found.waitT = 9999; found._hoverStopped = true;
      }
    }
    _hoveredVillager = found;
  }

  /* Cursor style */
  if (mode === 'build_shop' || mode === 'move_building') {
    _canvas.style.cursor = 'crosshair';
  } else if (!_drag.active) {
    var wp3    = s2w(_mouseX, _mouseY);
    var overBld = VS.buildings.some(function(b) {
      return dist(wp3.x, wp3.y, b.x, b.y) < b.w * perspScale(b.y) * 0.55;
    });
    /* Panning always available — grab cursor on empty land at any zoom */
    _canvas.style.cursor = overBld ? 'grab' : (_hoveredVillager ? 'pointer' : 'grab');
  }

  /* Move-building live follow */
  if (mode === 'move_building' && drawer.target) {
    var wpM = s2w(_mouseX, _mouseY);
    drawer.target.x = clamp(wpM.x, 40, window._VW - 40);
    drawer.target.y = clamp(wpM.y, 40, window._VH - 80);
    _canvas.style.cursor = 'crosshair';
    return;
  }

  if (!_drag.active) return;

  var dx = _mouseX - _drag.startSX;
  var dy = _mouseY - _drag.startSY;
  if (!_drag.moved && Math.sqrt(dx*dx + dy*dy) > 8) _drag.moved = true;
  if (!_drag.moved) return;

  /* Drag a building */
  if (_drag.building && (mode === 'move_building' || (mode === 'view' && !drawer.visible))) {
    var wp2 = s2w(_mouseX, _mouseY);
    _drag.building.x = clamp(wp2.x - _drag.bldOffX, 40, window._VW - 40);
    _drag.building.y = clamp(wp2.y - _drag.bldOffY, 40, window._VH - 80);
    _canvas.style.cursor = 'move';

  /* ── Camera pan — always allowed at ANY zoom level ──────────
     FIX: removed (cam.focused || tzoom > MIN+0.01) gate that
     blocked all panning at base zoom 2.4 when MIN_ZOOM=2.4.
     FIX: clamp now uses world-space bounds so the full world
     is reachable by panning at 2.4x. ───────────────────────── */
  } else if (!_drag.building) {
    var panScale = 1 / Math.max(cam.zoom, 0.1);
    cam.followTarget = null;
    cam.tx = _drag.startCamX - dx * panScale;
    cam.ty = _drag.startCamY - dy * panScale;
    var nz = clamp(cam.tzoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
    var hw = window._VW / (2 * nz);
    var hh = window._VH / (2 * nz);
    cam.tx = (2 * hw >= window._VW) ? window._VW / 2 : clamp(cam.tx, hw, window._VW - hw);
    cam.ty = (2 * hh >= window._VH) ? window._VH / 2 : clamp(cam.ty, hh, window._VH - hh);
    _canvas.style.cursor = 'grabbing';
  }
}

/* ── Mouse up ───────────────────────────────────────────────── */
function _onMouseUp(e) {
  if (!_drag.active) return;
  var rect   = _canvas.getBoundingClientRect();
  var sx     = e.clientX - rect.left;
  var sy     = e.clientY - rect.top;
  var moved  = _drag.moved;
  var wasBld = _drag.building;
  var mode   = _deps.getGameMode();

  _drag.active = false; _drag.moved = false; _drag.building = null;
  _canvas.style.cursor = '';

  if (mode === 'build_shop' || mode === 'move_building') { _processClick(sx, sy); return; }
  if (wasBld && moved) {
    _deps.initWaypoints(); _deps.recalcCaps();
    _deps.showMsg(wasBld.getDef().label + ' inilipat!');
    return;
  }
  if (moved) return;
  _processClick(sx, sy);
}

/* ── processClick ───────────────────────────────────────────── */
function _processClick(sx, sy) {
  var now  = Date.now();
  var mode = _deps.getGameMode();

  /* ── Double-tap ─────────────────────────────────────────────
     At high zoom  → zoomOut() back to base 2.4
     At base zoom  → panTo() that world point (smooth pan)     */
  var isDoubleTap = (
    now - _lastClickTime < DOUBLE_TAP_MS &&
    dist(sx, sy, _lastClickX, _lastClickY) < DOUBLE_TAP_PX
  );

  if (isDoubleTap) {
    _lastClickTime = 0;
    if (cam.zoom > CAMERA_MIN_ZOOM + 0.15) {
      zoomOut();
      _deps.closeDrawer();
    } else {
      var wpD = s2w(sx, sy);
      panTo(wpD.x, wpD.y);
    }
    return;
  }

  _lastClickTime = now;
  _lastClickX    = sx;
  _lastClickY    = sy;

  /* Place building — show procurement modal at clicked world position */
  if (mode === 'build_shop') {
    var bt  = _deps.getPendingBuildType();
    var wp  = s2w(sx, sy);
    var chk = _deps.canPlaceBuilding(bt, _deps.VS.buildings, wp.x, wp.y);
    if (!chk.ok) { _deps.showMsg(chk.msg); return; }
    var bdef  = _deps.BUILDING_DEFS[bt] || {};
    var btime = bdef.buildTime || 60;
    var VS    = _deps.VS;

    /* Resources were already validated in drawer.js shop card click.
       Modal deducts them on confirm (may include over-declaration). */
    showProcurementModal({
      mode:         'build',
      buildingType: bt,
      def:          bdef,
      actualCost:   { gold: bdef.shopCost ? bdef.shopCost.gold : 0,
                      rice: bdef.shopCost ? bdef.shopCost.rice : 0,
                      langis: bdef.shopCost ? (bdef.shopCost.langis || 0) : 0 },
      buildTime:    btime,
      wx:           wp.x,
      wy:           wp.y,
      VS:           VS,
      dayCount:     _deps.dayCount ? _deps.dayCount() : 1,
      showMsg:      _deps.showMsg,
      onConfirm: function(declared) {
        /* Resources deducted in modal — place building at chosen location */
        var newBld = new _deps.Building(bt, wp.x, wp.y);
        if (btime > 0) {
          newBld.underConstruction = true;
          newBld.constructionTime  = btime;
          newBld.constructionMax   = btime;
        }
        VS.buildings.push(newBld);
        _deps.initWaypoints();
        _deps.assignHomes(VS.villagers, VS.buildings);
        _deps.assignWork(VS.villagers, VS.buildings);
        _deps.recalcCaps();
        var ts = btime > 0 ? ' (' + (btime >= 60 ? Math.ceil(btime/60) + 'min' : btime + 's') + ')' : '';
        _deps.showMsg(bdef.label + ' — pagsisimula ng konstruksyon' + ts + '!');
        _deps.setGameMode('view');
        _deps.setPendingBuildType(null);
      },
      onCancel: function() {
        /* Keep build_shop mode active so player can pick another location */
        /* (or they can press Esc to cancel) */
      },
    });
    return;
  }

  /* Drop building after move */
  if (mode === 'move_building') {
    var wp0    = s2w(sx, sy);
    var drawer = _deps.getDrawer();
    if (drawer.target) {
      drawer.target.x = clamp(wp0.x, 40, window._VW - 40);
      drawer.target.y = clamp(wp0.y, 40, window._VH - 80);
    }
    _deps.setGameMode('view');
    drawer.movingBuilding = false;
    _deps.initWaypoints();
    _deps.assignHomes(_deps.VS.villagers, _deps.VS.buildings);
    _deps.recalcCaps();
    _deps.showMsg((drawer.target ? drawer.target.getDef().label : 'Gusali') + ' inilipat!');
    _deps.renderDrawer();
    return;
  }

  /* Entity selection */
  var wp2 = s2w(sx, sy);
  var VS  = _deps.VS;
  var VT  = _deps.VILLAGER_TYPES;

  /* Resource bubbles */
  for (var bc = 0; bc < VS.buildings.length; bc++) {
    var bld2 = VS.buildings[bc];
    var sc2  = perspScale(bld2.y);
    var bh2  = bld2.h * sc2;
    if (bld2.uncollectedGold >= 5) {
      if (dist(wp2.x, wp2.y, bld2.x, bld2.y - bh2 * 1.55) < 18 * sc2) {
        var goldAmt = Math.floor(bld2.uncollectedGold);
        VS.res.gold = Math.min(VS.resCap.gold, VS.res.gold + goldAmt);
        bld2.uncollectedGold = 0;
        _deps.showMsg('+' + goldAmt + ' 🪙 ginto nakolekta!');
        return;
      }
    }
    if ((bld2.uncollectedFood || 0) >= 5) {
      var bw2   = bld2.w * sc2;
      var fxOff = bld2.uncollectedGold >= 5 ? bw2 * 0.7 : 0;
      if (dist(wp2.x, wp2.y, bld2.x + fxOff, bld2.y - bh2 * 1.55) < 18 * sc2) {
        var foodAmt = Math.floor(bld2.uncollectedFood);
        if (VS.food) VS.food.pool = Math.min(2000, (VS.food.pool || 0) + foodAmt);
        VS.res.rice = Math.min(VS.resCap.rice, VS.res.rice + Math.floor(foodAmt * 0.5));
        bld2.uncollectedFood = 0;
        _deps.showMsg('+' + foodAmt + ' 🌾 pagkain nakolekta!');
        return;
      }
    }
  }

  /* Villager click */
  for (var i = 0; i < VS.villagers.length; i++) {
    var v  = VS.villagers[i];
    var vt = VT[v.typeIdx] || VT[0];
    if (dist(wp2.x, wp2.y, v.x, v.y) < 16 * perspScale(v.y) * vt.scale) {
      _deps.openDrawer(v, 'villager'); return;
    }
  }

  /* Building click */
  for (var b = 0; b < VS.buildings.length; b++) {
    var bld = VS.buildings[b];
    if (dist(wp2.x, wp2.y, bld.x, bld.y) < bld.w * perspScale(bld.y) * 0.65) {
      _deps.openDrawer(bld, 'building'); return;
    }
  }

  if (cam.focused) _deps.closeDrawer();
}

/* ── Right click ────────────────────────────────────────────── */
function _onRightClick(e) {
  e.preventDefault();
  var mode = _deps.getGameMode();
  if (mode === 'build_shop' || mode === 'move_building') {
    _deps.setGameMode('view');
    _deps.setPendingBuildType(null);
    var drawer = _deps.getDrawer();
    if (drawer) drawer.movingBuilding = false;
    _deps.showMsg('Kinansela.');
    return;
  }
  if (cam.focused) _deps.closeDrawer();
}

/* ── Keyboard ───────────────────────────────────────────────── */
function _onKeyDown(e) {
  if (e.key !== 'Escape') return;
  var mode   = _deps.getGameMode();
  var drawer = _deps.getDrawer();
  if (mode === 'build_shop' || mode === 'move_building') {
    _deps.setGameMode('view');
    _deps.setPendingBuildType(null);
    if (drawer) drawer.movingBuilding = false;
    _deps.showMsg('Kinansela.');
    return;
  }
  if (drawer && drawer.visible) { _deps.closeDrawer(); return; }
  if (cam.zoom > CAMERA_MIN_ZOOM + 0.15) zoomOut();
}

/* ── Wheel — zoom toward cursor ─────────────────────────────── */
function _onWheel(e) {
  e.preventDefault();
  var drawer = _deps.getDrawer();
  if (drawer && drawer.visible) return;

  var dz = e.deltaY > 0 ? -0.18 : 0.18;
  var nz = clamp(cam.tzoom + dz, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  var wp = s2w(_mouseX, _mouseY);

  cam.followTarget = null;
  cam.tzoom   = nz;
  cam.tx      = wp.x + (_mouseX - window._VW / 2) / (-nz);
  cam.ty      = wp.y + (_mouseY - window._VH / 2) / (-nz);
  cam.focused = cam.tzoom > CAMERA_MIN_ZOOM + 0.05;

  /* Correct world-space clamp */
  var hw = window._VW / (2 * cam.tzoom);
  var hh = window._VH / (2 * cam.tzoom);
  cam.tx = (2 * hw >= window._VW) ? window._VW / 2 : clamp(cam.tx, hw, window._VW - hw);
  cam.ty = (2 * hh >= window._VH) ? window._VH / 2 : clamp(cam.ty, hh, window._VH - hh);
}

/* ══════════════════════════════════════════════════════════════
   TOUCH HANDLERS
   Strategy:
   • 1 finger  → pan (mirrors mouse drag) + tap / double-tap
   • 2 fingers → pinch-zoom centred on midpoint
   • 3+ fingers → ignored
══════════════════════════════════════════════════════════════ */

/* Helper: find a touch by identifier inside a TouchList */
function _getTouch(list, id) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].identifier === id) return list[i];
  }
  return null;
}

/* Helper: canvas-relative position from a Touch point */
function _touchPos(touch) {
  var rect = _canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}

/* Helper: distance between two Touch points */
function _touchDist(t0, t1) {
  var dx = t0.clientX - t1.clientX;
  var dy = t0.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/* ── touchstart ─────────────────────────────────────────────── */
function _onTouchStart(e) {
  e.preventDefault();

  var touches = e.touches;
  _touch.count = touches.length;

  if (touches.length === 1) {
    /* Single finger — begin pan / tap tracking */
    var t   = touches[0];
    var pos = _touchPos(t);

    _touch.active    = true;
    _touch.id0       = t.identifier;
    _touch.startSX   = pos.x;
    _touch.startSY   = pos.y;
    _touch.startCamX = cam.tx;
    _touch.startCamY = cam.ty;
    _touch.moved     = false;

    /* Update shared mouse position so build preview follows finger */
    _mouseX = pos.x;
    _mouseY = pos.y;

    /* Move-building live follow (mirrors mousemove) */
    var mode = _deps.getGameMode();
    if (mode === 'move_building') {
      var drawer = _deps.getDrawer();
      if (drawer && drawer.target) {
        var wp = s2w(pos.x, pos.y);
        drawer.target.x = clamp(wp.x, 40, window._VW - 40);
        drawer.target.y = clamp(wp.y, 40, window._VH - 80);
      }
    }

  } else if (touches.length === 2) {
    /* Two fingers — begin pinch-zoom; cancel any ongoing pan */
    _touch.id0           = touches[0].identifier;
    _touch.id1           = touches[1].identifier;
    _touch.pinchStartDist = _touchDist(touches[0], touches[1]);
    _touch.pinchStartZoom = cam.tzoom;
    _touch.moved         = true; /* suppress tap on lift */
  }
}

/* ── touchmove ──────────────────────────────────────────────── */
function _onTouchMove(e) {
  e.preventDefault();

  var touches = e.touches;
  _touch.count = touches.length;

  if (touches.length === 2) {
    /* ── Pinch-zoom ─────────────────────────────────────────
       Scale zoom proportionally from pinch start distance.
       Zoom toward the midpoint of the two fingers.          */
    var t0 = _getTouch(touches, _touch.id0) || touches[0];
    var t1 = _getTouch(touches, _touch.id1) || touches[1];

    var currentDist = _touchDist(t0, t1);
    if (_touch.pinchStartDist === 0) return;

    var scaleFactor = currentDist / _touch.pinchStartDist;
    var nz = clamp(_touch.pinchStartZoom * scaleFactor, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);

    /* Midpoint in screen space */
    var rect = _canvas.getBoundingClientRect();
    var midSX = ((t0.clientX + t1.clientX) / 2) - rect.left;
    var midSY = ((t0.clientY + t1.clientY) / 2) - rect.top;

    /* Zoom toward midpoint (same algebra as wheel handler) */
    var wp = s2w(midSX, midSY);
    cam.followTarget = null;
    cam.tzoom = nz;
    cam.tx    = wp.x + (midSX - window._VW / 2) / (-nz);
    cam.ty    = wp.y + (midSY - window._VH / 2) / (-nz);
    cam.focused = cam.tzoom > CAMERA_MIN_ZOOM + 0.05;

    var hw = window._VW / (2 * cam.tzoom);
    var hh = window._VH / (2 * cam.tzoom);
    cam.tx = (2 * hw >= window._VW) ? window._VW / 2 : clamp(cam.tx, hw, window._VW - hw);
    cam.ty = (2 * hh >= window._VH) ? window._VH / 2 : clamp(cam.ty, hh, window._VH - hh);
    return;
  }

  if (touches.length !== 1 || !_touch.active) return;

  /* ── Single-finger pan ───────────────────────────────────── */
  var t   = _getTouch(touches, _touch.id0) || touches[0];
  var pos = _touchPos(t);

  _mouseX = pos.x;
  _mouseY = pos.y;

  var mode   = _deps.getGameMode();
  var drawer = _deps.getDrawer();

  /* Move-building live follow */
  if (mode === 'move_building' && drawer && drawer.target) {
    var wpM = s2w(pos.x, pos.y);
    drawer.target.x = clamp(wpM.x, 40, window._VW - 40);
    drawer.target.y = clamp(wpM.y, 40, window._VH - 80);
    return;
  }

  var dx = pos.x - _touch.startSX;
  var dy = pos.y - _touch.startSY;
  if (!_touch.moved && Math.sqrt(dx * dx + dy * dy) > 8) _touch.moved = true;
  if (!_touch.moved) return;

  if (mode === 'build_shop') return; /* no pan during placement */

  /* Pan camera */
  var panScale = 1 / Math.max(cam.zoom, 0.1);
  cam.followTarget = null;
  cam.tx = _touch.startCamX - dx * panScale;
  cam.ty = _touch.startCamY - dy * panScale;
  var nz2 = clamp(cam.tzoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  var hw2 = window._VW / (2 * nz2);
  var hh2 = window._VH / (2 * nz2);
  cam.tx = (2 * hw2 >= window._VW) ? window._VW / 2 : clamp(cam.tx, hw2, window._VW - hw2);
  cam.ty = (2 * hh2 >= window._VH) ? window._VH / 2 : clamp(cam.ty, hh2, window._VH - hh2);
}

/* ── touchend ───────────────────────────────────────────────── */
function _onTouchEnd(e) {
  e.preventDefault();

  /* If we were pinching and one finger lifts, reset to single-pan state */
  if (_touch.count === 2 && e.touches.length === 1) {
    var remaining    = e.touches[0];
    var pos          = _touchPos(remaining);
    _touch.id0       = remaining.identifier;
    _touch.id1       = null;
    _touch.startSX   = pos.x;
    _touch.startSY   = pos.y;
    _touch.startCamX = cam.tx;
    _touch.startCamY = cam.ty;
    _touch.moved     = true; /* don't fire a tap */
    _touch.count     = 1;
    return;
  }

  _touch.count = e.touches.length;

  if (e.touches.length > 0) return; /* still fingers on screen */

  /* All fingers lifted — decide tap vs drag */
  _touch.active = false;

  var sx    = _touch.startSX + (_mouseX - _touch.startSX); /* last known pos */
  var sy    = _touch.startSY + (_mouseY - _touch.startSY);
  var moved = _touch.moved;

  _touch.id0   = null;
  _touch.id1   = null;
  _touch.moved = false;

  var mode = _deps.getGameMode();
  if (mode === 'build_shop' || mode === 'move_building') {
    _processClick(_mouseX, _mouseY);
    return;
  }

  if (moved) return; /* was a drag, not a tap */

  _processClick(_mouseX, _mouseY);
}

/* ── touchcancel ────────────────────────────────────────────── */
function _onTouchCancel(e) {
  _touch.active = false;
  _touch.moved  = false;
  _touch.id0    = null;
  _touch.id1    = null;
  _touch.count  = 0;
}