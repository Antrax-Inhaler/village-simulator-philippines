/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — input/input.js
   INPUT SYSTEM — fixed panning at all zoom levels, uses WORLD_W/H
   FIXED: Proper canvas coordinate scaling for mouse/touch events
   FIXED: Added langis collection from resource bubbles
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, dist } from '../utils/perspective.js';
import { showProcurementModal }       from '../ui/procurementModal.js';
import {
  cam, s2w, w2s,
  zoomTo, zoomOut, panTo,
  clampCurrent,
  CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM,
  WORLD_W, WORLD_H,
} from '../render/camera.js';
import { getZoneArrowAt, ZONE_DEFS, purchaseZone } from '../world/zones.js';

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
  count:       0,
  id0:         null,
  startSX:     0, startSY: 0,
  startCamX:   0, startCamY: 0,
  moved:       false,
  id1:         null,
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
  canvas.addEventListener('touchstart',  _onTouchStart,  { passive: false });
  canvas.addEventListener('touchmove',   _onTouchMove,   { passive: false });
  canvas.addEventListener('touchend',    _onTouchEnd,    { passive: false });
  canvas.addEventListener('touchcancel', _onTouchCancel, { passive: false });
}

export function getMousePos()        { return { x: _mouseX, y: _mouseY }; }
export function getHoveredVillager() { return _hoveredVillager; }
export function getDragState()       { return _drag; }

/* ── Helper: Get properly scaled canvas coordinates ─────────── */
function getCanvasCoords(e) {
  if (!_canvas) return { x: 0, y: 0 };
  const rect = _canvas.getBoundingClientRect();
  let clientX, clientY;
  
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  /* CRITICAL: Scale coordinates to match canvas pixel dimensions */
  const scaleX = _canvas.width / rect.width;
  const scaleY = _canvas.height / rect.height;
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

/* ── Mouse down ─────────────────────────────────────────────── */
function _onMouseDown(e) {
  if (e.button !== 0) return;
  const pos = getCanvasCoords(e);
  const sx = pos.x;
  const sy = pos.y;
  const mode = _deps.getGameMode();

  if (mode === 'build_shop' || mode === 'move_building') {
    _drag.active = true; _drag.moved = false; _drag.building = null;
    _drag.startSX = sx; _drag.startSY = sy;
    return;
  }

  _drag.building = null;
  const drawer = _deps.getDrawer();
  if (mode === 'view' && !drawer.visible && cam.tzoom <= CAMERA_MIN_ZOOM + 0.2) {
    const wp0 = s2w(sx, sy);
    const VS  = _deps.VS;
    for (var b = 0; b < VS.buildings.length; b++) {
      const bld = VS.buildings[b];
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
  const pos = getCanvasCoords(e);
  _mouseX = pos.x;
  _mouseY = pos.y;

  const mode   = _deps.getGameMode();
  const drawer = _deps.getDrawer();
  const VS     = _deps.VS;

  /* Hover‑to‑stop villager */
  if (!_drag.active) {
    const wp   = s2w(_mouseX, _mouseY);
    const VT   = _deps.VILLAGER_TYPES;
    let found = null;
    for (var i = 0; i < VS.villagers.length; i++) {
      const v  = VS.villagers[i];
      const vt = VT[v.typeIdx] || VT[0];
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
    const wp3    = s2w(_mouseX, _mouseY);
    const overBld = VS.buildings.some(function(b) {
      return dist(wp3.x, wp3.y, b.x, b.y) < b.w * perspScale(b.y) * 0.55;
    });
    const overArrow = !!getZoneArrowAt(wp3.x, wp3.y, VS);
    _canvas.style.cursor = overArrow ? 'pointer' : (overBld ? 'grab' : (_hoveredVillager ? 'pointer' : 'grab'));
  }

  /* Move‑building live follow */
  if (mode === 'move_building' && drawer.target) {
    const wpM = s2w(_mouseX, _mouseY);
    drawer.target.x = clamp(wpM.x, 40, window._VW - 40);
    drawer.target.y = clamp(wpM.y, 40, window._VH - 80);
    _canvas.style.cursor = 'crosshair';
    return;
  }

  if (!_drag.active) return;

  const dx = _mouseX - _drag.startSX;
  const dy = _mouseY - _drag.startSY;
  if (!_drag.moved && Math.sqrt(dx*dx + dy*dy) > 8) _drag.moved = true;
  if (!_drag.moved) return;

  /* Drag a building */
  if (_drag.building && (mode === 'move_building' || (mode === 'view' && !drawer.visible))) {
    const wp2 = s2w(_mouseX, _mouseY);
    _drag.building.x = clamp(wp2.x - _drag.bldOffX, 40, window._VW - 40);
    _drag.building.y = clamp(wp2.y - _drag.bldOffY, 40, window._VH - 80);
    _canvas.style.cursor = 'move';

  /* ── Camera pan — ALWAYS allowed at ANY zoom level ────────── */
  } else if (!_drag.building) {
    const panScale = 1 / Math.max(cam.zoom, 0.1);
    cam.followTarget = null;
    cam.tx = _drag.startCamX - dx * panScale;
    cam.ty = _drag.startCamY - dy * panScale;

    const nz = clamp(cam.tzoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
    const hw = window._VW / (2 * nz);
    const hh = window._VH / (2 * nz);
    const extraW = WORLD_W * 0.05;
    const extraH = WORLD_H * 0.05;

    cam.tx = (2 * hw >= WORLD_W + extraW) ? WORLD_W / 2 : clamp(cam.tx, hw - extraW, WORLD_W - hw + extraW);
    cam.ty = (2 * hh >= WORLD_H + extraH) ? WORLD_H / 2 : clamp(cam.ty, hh - extraH, WORLD_H - hh + extraH);

    _canvas.style.cursor = 'grabbing';
  }
}

/* ── Mouse up ───────────────────────────────────────────────── */
function _onMouseUp(e) {
  if (!_drag.active) return;
  const pos = getCanvasCoords(e);
  const sx = pos.x;
  const sy = pos.y;
  const moved  = _drag.moved;
  const wasBld = _drag.building;
  const mode   = _deps.getGameMode();

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
  const now  = Date.now();
  const mode = _deps.getGameMode();

  const isDoubleTap = (
    now - _lastClickTime < DOUBLE_TAP_MS &&
    dist(sx, sy, _lastClickX, _lastClickY) < DOUBLE_TAP_PX
  );

  if (isDoubleTap) {
    _lastClickTime = 0;
    if (cam.zoom > CAMERA_MIN_ZOOM + 0.15) {
      zoomOut();
      _deps.closeDrawer();
    } else {
      const wpD = s2w(sx, sy);
      panTo(wpD.x, wpD.y);
    }
    return;
  }

  _lastClickTime = now;
  _lastClickX    = sx;
  _lastClickY    = sy;

  /* Place building — show procurement modal */
  if (mode === 'build_shop') {
    const bt  = _deps.getPendingBuildType();
    const wp  = s2w(sx, sy);
    const chk = _deps.canPlaceBuilding(bt, _deps.VS.buildings, wp.x, wp.y);
    if (!chk.ok) { _deps.showMsg(chk.msg); return; }
    const bdef  = _deps.BUILDING_DEFS[bt] || {};
    const btime = bdef.buildTime || 60;
    const VS    = _deps.VS;

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
        const newBld = new _deps.Building(bt, wp.x, wp.y);
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
        const ts = btime > 0 ? ' (' + (btime >= 60 ? Math.ceil(btime/60) + 'min' : btime + 's') + ')' : '';
        _deps.showMsg(bdef.label + ' — pagsisimula ng konstruksyon' + ts + '!');
        _deps.setGameMode('view');
        _deps.setPendingBuildType(null);
      },
      onCancel: function() { /* keep build_shop mode */ },
    });
    return;
  }

  /* Drop building after move */
  if (mode === 'move_building') {
    const wp0    = s2w(sx, sy);
    const drawer = _deps.getDrawer();
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
  const wp2 = s2w(sx, sy);
  const VS  = _deps.VS;
  const VT  = _deps.VILLAGER_TYPES;

  /* Resource bubbles - GOLD */
  for (var bc = 0; bc < VS.buildings.length; bc++) {
    const bld2 = VS.buildings[bc];
    const sc2  = perspScale(bld2.y);
    const bh2  = bld2.h * sc2;
    if (bld2.uncollectedGold >= 5) {
      if (dist(wp2.x, wp2.y, bld2.x, bld2.y - bh2 * 1.55) < 18 * sc2) {
        const goldAmt = Math.floor(bld2.uncollectedGold);
        VS.res.gold = Math.min(VS.resCap.gold, VS.res.gold + goldAmt);
        bld2.uncollectedGold = 0;
        _deps.showMsg('+' + goldAmt + ' 🪙 ginto nakolekta!');
        return;
      }
    }
  }

  /* Resource bubbles - RICE */
  for (var bc = 0; bc < VS.buildings.length; bc++) {
    const bld2 = VS.buildings[bc];
    const sc2  = perspScale(bld2.y);
    const bh2  = bld2.h * sc2;
    if ((bld2.uncollectedFood || 0) >= 5) {
      const bw2   = bld2.w * sc2;
      const fxOff = bld2.uncollectedGold >= 5 ? bw2 * 0.7 : 0;
      if (dist(wp2.x, wp2.y, bld2.x + fxOff, bld2.y - bh2 * 1.55) < 18 * sc2) {
        const foodAmt = Math.floor(bld2.uncollectedFood);
        if (VS.food) VS.food.pool = Math.min(2000, (VS.food.pool || 0) + foodAmt);
        VS.res.rice = Math.min(VS.resCap.rice, VS.res.rice + Math.floor(foodAmt * 0.5));
        bld2.uncollectedFood = 0;
        _deps.showMsg('+' + foodAmt + ' 🌾 pagkain nakolekta!');
        return;
      }
    }
  }

  /* Resource bubbles - LANGIS (FIXED) */
  for (var bc = 0; bc < VS.buildings.length; bc++) {
    const bld2 = VS.buildings[bc];
    const sc2  = perspScale(bld2.y);
    const bh2  = bld2.h * sc2;
    
    if ((bld2.uncollectedLangis || 0) >= 5) {
      const bw2 = bld2.w * sc2;
      let xOff = 0;
      
      // Determine offset based on other indicators (matches building.js draw logic)
      const hasGold = (bld2.uncollectedGold || 0) >= 5;
      const hasFood = (bld2.uncollectedFood || 0) >= 5;
      
      if (hasGold && hasFood) {
        xOff = -bw2 * 0.5;
      } else if (hasGold) {
        xOff = bw2 * 0.35;
      } else if (hasFood) {
        xOff = -bw2 * 0.35;
      }
      
      // Langis indicator position with bob animation (matches building.js)
      const bobL = Math.sin(Date.now() / 800 + bld2.x + 2) * 3 * sc2;
      const indicatorX = bld2.x + xOff;
      const indicatorY = bld2.y - bh2 * 1.55 + bobL;
      const radius = 18 * sc2;
      
      if (dist(wp2.x, wp2.y, indicatorX, indicatorY) < radius) {
        const langisAmt = Math.floor(bld2.uncollectedLangis);
        VS.res.langis = Math.min(VS.resCap.langis, (VS.res.langis || 0) + langisAmt);
        bld2.uncollectedLangis = 0;
        _deps.showMsg('+' + langisAmt + ' ⛽ langis nakolekta!');
        return;
      }
    }
  }

  /* Villager click */
  for (var i = 0; i < VS.villagers.length; i++) {
    const v  = VS.villagers[i];
    const vt = VT[v.typeIdx] || VT[0];
    if (dist(wp2.x, wp2.y, v.x, v.y) < 16 * perspScale(v.y) * vt.scale) {
      if (typeof window.playSound === 'function') {
        window.playSound(v.gender === 'female' ? 'sfx-villager-female' : 'sfx-villager-male');
      }
      _deps.openDrawer(v, 'villager'); return;
    }
  }

  /* ── Zone arrow click — show purchase confirmation ────────── */
  const zoneKey = getZoneArrowAt(wp2.x, wp2.y, VS);
  if (zoneKey) {
    _showZonePurchaseModal(zoneKey);
    return;
  }

  /* Building click */
  for (var b = 0; b < VS.buildings.length; b++) {
    const bld = VS.buildings[b];
    if (dist(wp2.x, wp2.y, bld.x, bld.y) < bld.w * perspScale(bld.y) * 0.65) {
      _deps.openDrawer(bld, 'building'); return;
    }
  }

  if (cam.focused) _deps.closeDrawer();
}

/* ── Right click ────────────────────────────────────────────── */
function _onRightClick(e) {
  e.preventDefault();
  const mode = _deps.getGameMode();
  if (mode === 'build_shop' || mode === 'move_building') {
    _deps.setGameMode('view');
    _deps.setPendingBuildType(null);
    const drawer = _deps.getDrawer();
    if (drawer) drawer.movingBuilding = false;
    _deps.showMsg('Kinansela.');
    return;
  }
  if (cam.focused) _deps.closeDrawer();
}

/* ── Zone purchase confirmation modal ────────────────────────── */
function _showZonePurchaseModal(key) {
  var VS  = _deps.VS;
  var def = ZONE_DEFS[key];
  if (!def) return;

  /* Check hall requirement */
  var mhLv = 1;
  (VS.buildings || []).forEach(function(b) {
    if (b.type === 'mainHall') mhLv = Math.max(mhLv, b.level || 1);
  });

  var hallOk    = mhLv >= (def.prereqHall || 1);
  var canAfford = hallOk &&
    (VS.res.gold  || 0) >= def.cost.gold &&
    (VS.res.rice  || 0) >= def.cost.rice &&
    (VS.res.langis|| 0) >= def.cost.langis;

  /* Remove any existing zone-purchase modal */
  var existing = document.getElementById('_zonePurchaseModal');
  if (existing) existing.remove();

  /* Build modal DOM */
  var overlay = document.createElement('div');
  overlay.id = '_zonePurchaseModal';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9800;',
    'display:flex;align-items:center;justify-content:center;',
    'background:rgba(5,3,1,0.72);',
    'animation:_zpFadeIn 0.18s ease;',
  ].join('');

  /* Inject keyframe once */
  if (!document.getElementById('_zpStyles')) {
    var st = document.createElement('style');
    st.id  = '_zpStyles';
    st.textContent = [
      '@keyframes _zpFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes _zpSlideUp{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@keyframes _zpBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    ].join('');
    document.head.appendChild(st);
  }

  var costLine = def.cost.gold + ' 🪙';
  if (def.cost.rice)   costLine += '  ' + def.cost.rice  + ' 🌾';
  if (def.cost.langis) costLine += '  ' + def.cost.langis + ' 💧';

  var hallMsg  = hallOk
    ? '<span style="color:#8ecf60">✓ Hall Lv' + mhLv + ' — OK</span>'
    : '<span style="color:#ff7a5a">✗ Kailangan Hall Lv' + def.prereqHall + ' (ikaw: Lv' + mhLv + ')</span>';

  var btnStyle = canAfford
    ? 'background:linear-gradient(135deg,#f5c842,#c8920a);color:#1a0e00;'
    : 'background:#4a3a28;color:#7a6a58;cursor:not-allowed;';

  var card = document.createElement('div');
  card.style.cssText = [
    'position:relative;',
    'background:linear-gradient(160deg,#1e1508 0%,#120e04 100%);',
    'border:2px solid #8a6030;border-radius:14px;',
    'padding:28px 32px 24px;min-width:300px;max-width:370px;width:90%;',
    'box-shadow:0 8px 40px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,220,80,0.08);',
    'font-family:"Oldenburg",serif;color:#e8d8a0;',
    'animation:_zpSlideUp 0.22s cubic-bezier(.25,.8,.25,1);',
  ].join('');

  card.innerHTML = [
    /* Arrow icon bouncing at top */
    '<div style="text-align:center;margin-bottom:4px;">',
    '  <span style="font-size:2.2rem;display:inline-block;',
    canAfford ? 'animation:_zpBounce 1.1s ease-in-out infinite;' : '',
    '">', def.icon, '</span>',
    '</div>',

    /* Zone name */
    '<h2 style="text-align:center;margin:0 0 4px;font-size:1.2rem;',
    'color:#f5c842;text-shadow:0 1px 6px rgba(245,200,66,0.4);">',
    def.label, '</h2>',

    /* Specialty tag */
    '<div style="text-align:center;margin-bottom:14px;">',
    '<span style="background:#2a1e08;border:1px solid #6a4a18;',
    'border-radius:20px;padding:2px 12px;font-size:0.72rem;color:#c8a050;letter-spacing:.05em;">',
    (def.sign || def.specialty.toUpperCase()), '</span></div>',

    /* Description */
    '<p style="font-size:0.82rem;color:#c8b880;margin:0 0 14px;',
    'text-align:center;line-height:1.5;">', def.desc, '</p>',

    /* Divider */
    '<div style="border-top:1px solid rgba(138,96,48,0.4);margin-bottom:14px;"></div>',

    /* Hall requirement */
    '<div style="font-size:0.78rem;margin-bottom:8px;text-align:center;">', hallMsg, '</div>',

    /* Cost */
    '<div style="text-align:center;margin-bottom:18px;">',
    '<span style="font-size:0.78rem;color:#a08848;">Gastos: </span>',
    '<span style="font-size:0.9rem;font-weight:bold;color:#f5c842;">', costLine, '</span>',
    '</div>',

    /* Not-affordable note */
    (!canAfford && hallOk) ? '<div style="text-align:center;font-size:0.75rem;color:#ff9a7a;margin-bottom:14px;">Hindi sapat ang mga yaman.</div>' : '',

    /* Buttons */
    '<div style="display:flex;gap:10px;justify-content:center;">',
    '<button id="_zpCancel" style="',
    'flex:1;padding:10px 0;border-radius:8px;border:1px solid #6a4a18;',
    'background:#1a1208;color:#a08848;font-family:inherit;font-size:0.85rem;cursor:pointer;',
    '">Ibalik</button>',
    '<button id="_zpConfirm" ', (canAfford ? '' : 'disabled'), ' style="',
    'flex:1;padding:10px 0;border-radius:8px;border:none;',
    btnStyle,
    'font-family:inherit;font-size:0.85rem;font-weight:bold;transition:opacity .15s;',
    '">I-unlock ✓</button>',
    '</div>',
  ].join('');

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  /* Close helpers */
  function _close() {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  overlay.addEventListener('click', function(e) { if (e.target === overlay) _close(); });

  var cancelBtn  = document.getElementById('_zpCancel');
  var confirmBtn = document.getElementById('_zpConfirm');

  cancelBtn.addEventListener('click', _close);

  if (canAfford) {
    confirmBtn.addEventListener('click', function() {
      var result = purchaseZone(key, VS, _deps.showMsg, WORLD_W, WORLD_H);
      if (result.ok) {
        _close();
      } else {
        _deps.showMsg(result.msg);
        _close();
      }
    });

    /* Hover glow for confirm button */
    confirmBtn.addEventListener('mouseenter', function() { this.style.opacity = '0.85'; });
    confirmBtn.addEventListener('mouseleave', function() { this.style.opacity = '1'; });
  }
}

/* ── Keyboard ───────────────────────────────────────────────── */
function _onKeyDown(e) {
  if (e.key !== 'Escape') return;

  /* Close zone purchase modal if open */
  var zm = document.getElementById('_zonePurchaseModal');
  if (zm) { zm.parentNode && zm.parentNode.removeChild(zm); return; }

  const mode   = _deps.getGameMode();
  const drawer = _deps.getDrawer();
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
  const drawer = _deps.getDrawer();
  if (drawer && drawer.visible) return;

  const dz = e.deltaY > 0 ? -0.18 : 0.18;
  const nz = clamp(cam.tzoom + dz, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  const wp = s2w(_mouseX, _mouseY);

  cam.followTarget = null;
  cam.tzoom   = nz;
  cam.tx      = wp.x + (_mouseX - window._VW / 2) / (-nz);
  cam.ty      = wp.y + (_mouseY - window._VH / 2) / (-nz);
  cam.focused = cam.tzoom > CAMERA_MIN_ZOOM + 0.05;

  const hw = window._VW / (2 * cam.tzoom);
  const hh = window._VH / (2 * cam.tzoom);
  const extraW = WORLD_W * 0.05;
  const extraH = WORLD_H * 0.05;
  cam.tx = (2 * hw >= WORLD_W + extraW) ? WORLD_W / 2 : clamp(cam.tx, hw - extraW, WORLD_W - hw + extraW);
  cam.ty = (2 * hh >= WORLD_H + extraH) ? WORLD_H / 2 : clamp(cam.ty, hh - extraH, WORLD_H - hh + extraH);
}

/* ══════════════════════════════════════════════════════════════
   TOUCH HANDLERS — using scaled coordinates
══════════════════════════════════════════════════════════════ */
function _getTouch(list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
  return null;
}

function _getScaledTouchPos(touch) {
  if (!_canvas) return { x: 0, y: 0 };
  const rect = _canvas.getBoundingClientRect();
  const scaleX = _canvas.width / rect.width;
  const scaleY = _canvas.height / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY
  };
}

function _touchDist(t0, t1) {
  const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

function _onTouchStart(e) {
  e.preventDefault();
  const touches = e.touches;
  _touch.count = touches.length;
  
  if (touches.length === 1) {
    const t   = touches[0];
    const pos = _getScaledTouchPos(t);
    _touch.active    = true;
    _touch.id0       = t.identifier;
    _touch.startSX   = pos.x;
    _touch.startSY   = pos.y;
    _touch.startCamX = cam.tx;
    _touch.startCamY = cam.ty;
    _touch.moved     = false;
    _mouseX = pos.x; _mouseY = pos.y;
    const mode = _deps.getGameMode();
    if (mode === 'move_building') {
      const drawer = _deps.getDrawer();
      if (drawer && drawer.target) {
        const wp = s2w(pos.x, pos.y);
        drawer.target.x = clamp(wp.x, 40, window._VW - 40);
        drawer.target.y = clamp(wp.y, 40, window._VH - 80);
      }
    }
  } else if (touches.length === 2) {
    _touch.id0           = touches[0].identifier;
    _touch.id1           = touches[1].identifier;
    _touch.pinchStartDist = _touchDist(touches[0], touches[1]);
    _touch.pinchStartZoom = cam.tzoom;
    _touch.moved         = true;
  }
}

function _onTouchMove(e) {
  e.preventDefault();
  const touches = e.touches;
  _touch.count = touches.length;

  if (touches.length === 2) {
    const t0 = _getTouch(touches, _touch.id0) || touches[0];
    const t1 = _getTouch(touches, _touch.id1) || touches[1];
    const currentDist = _touchDist(t0, t1);
    if (_touch.pinchStartDist === 0) return;
    const scaleFactor = currentDist / _touch.pinchStartDist;
    const nz = clamp(_touch.pinchStartZoom * scaleFactor, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width / rect.width;
    const scaleY = _canvas.height / rect.height;
    const midSX = ((t0.clientX + t1.clientX) / 2 - rect.left) * scaleX;
    const midSY = ((t0.clientY + t1.clientY) / 2 - rect.top) * scaleY;
    const wp = s2w(midSX, midSY);
    cam.followTarget = null;
    cam.tzoom = nz;
    cam.tx    = wp.x + (midSX - window._VW / 2) / (-nz);
    cam.ty    = wp.y + (midSY - window._VH / 2) / (-nz);
    cam.focused = cam.tzoom > CAMERA_MIN_ZOOM + 0.05;
    const hw = window._VW / (2 * cam.tzoom), hh = window._VH / (2 * cam.tzoom);
    const extraW = WORLD_W * 0.05, extraH = WORLD_H * 0.05;
    cam.tx = (2 * hw >= WORLD_W + extraW) ? WORLD_W / 2 : clamp(cam.tx, hw - extraW, WORLD_W - hw + extraW);
    cam.ty = (2 * hh >= WORLD_H + extraH) ? WORLD_H / 2 : clamp(cam.ty, hh - extraH, WORLD_H - hh + extraH);
    return;
  }

  if (touches.length !== 1 || !_touch.active) return;

  const t   = _getTouch(touches, _touch.id0) || touches[0];
  const pos = _getScaledTouchPos(t);
  _mouseX = pos.x; _mouseY = pos.y;

  const mode   = _deps.getGameMode();
  const drawer = _deps.getDrawer();

  if (mode === 'move_building' && drawer && drawer.target) {
    const wpM = s2w(pos.x, pos.y);
    drawer.target.x = clamp(wpM.x, 40, window._VW - 40);
    drawer.target.y = clamp(wpM.y, 40, window._VH - 80);
    return;
  }

  const dx = pos.x - _touch.startSX;
  const dy = pos.y - _touch.startSY;
  if (!_touch.moved && Math.sqrt(dx*dx + dy*dy) > 8) _touch.moved = true;
  if (!_touch.moved) return;
  if (mode === 'build_shop') return;

  const panScale = 1 / Math.max(cam.zoom, 0.1);
  cam.followTarget = null;
  cam.tx = _touch.startCamX - dx * panScale;
  cam.ty = _touch.startCamY - dy * panScale;

  const nz2 = clamp(cam.tzoom, CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);
  const hw2 = window._VW / (2 * nz2), hh2 = window._VH / (2 * nz2);
  const extraW = WORLD_W * 0.05, extraH = WORLD_H * 0.05;
  cam.tx = (2 * hw2 >= WORLD_W + extraW) ? WORLD_W / 2 : clamp(cam.tx, hw2 - extraW, WORLD_W - hw2 + extraW);
  cam.ty = (2 * hh2 >= WORLD_H + extraH) ? WORLD_H / 2 : clamp(cam.ty, hh2 - extraH, WORLD_H - hh2 + extraH);
}

function _onTouchEnd(e) {
  e.preventDefault();
  if (_touch.count === 2 && e.touches.length === 1) {
    const remaining = e.touches[0];
    const pos = _getScaledTouchPos(remaining);
    _touch.id0       = remaining.identifier;
    _touch.id1       = null;
    _touch.startSX   = pos.x;
    _touch.startSY   = pos.y;
    _touch.startCamX = cam.tx;
    _touch.startCamY = cam.ty;
    _touch.moved     = true;
    _touch.count     = 1;
    return;
  }
  _touch.count = e.touches.length;
  if (e.touches.length > 0) return;
  _touch.active = false;
  const sx = _touch.startSX + (_mouseX - _touch.startSX);
  const sy = _touch.startSY + (_mouseY - _touch.startSY);
  const moved = _touch.moved;
  _touch.id0 = _touch.id1 = null;
  _touch.moved = false;
  const mode = _deps.getGameMode();
  if (mode === 'build_shop' || mode === 'move_building') { _processClick(_mouseX, _mouseY); return; }
  if (moved) return;
  _processClick(_mouseX, _mouseY);
}

function _onTouchCancel(e) {
  _touch.active = false;
  _touch.moved  = false;
  _touch.id0 = _touch.id1 = null;
  _touch.count = 0;
}