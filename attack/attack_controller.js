/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attack_controller.js
   (UPDATED with Missile Warfare Integration + Camera Centering Fix)
   
   Fixed: accurate click mapping, camera centers on building.
   Fixed: World centering on attack screen (matches main.js)
   UI separated to attackUI.js
   NEW: Scout mode for coordinate capture, missile panel integration
═══════════════════════════════════════════════════════════════ */

import {
  generateDefenderVillage,
  drawBattleScene,
  drawTimeOverlay,
  tickDefenderVillagers,
  tickBattle,
  createTroop,
  TROOP_DEFS,
  DEF_WORLD_W,
  DEF_WORLD_H,
  BUILDING_DEFS,
  perspScale,
  dist,
  calculateETA,
  getDistanceBetweenPoints,
  selectMissileTargets
} from './attack.js';

import {
  MILITARY, ROLE_POWER, ROLE_ICON, ROLE_LABEL, ROLE_COLOR,
  getMilitaryInventory, updateHUD, renderTroopBar, updatePowerBar,
  showDeployUI, updateDeployUI, updateDestructionBar, showResultModal,
  clearPanels, hideResultModal
} from './attackUI.js';

/* ── Camera ───────────────────────────────────────────────── */
var _cam = {
  x: DEF_WORLD_W / 2, y: DEF_WORLD_H / 2,
  tx: DEF_WORLD_W / 2, ty: DEF_WORLD_H / 2,
  zoom: 1.5, tzoom: 1.5,
  MIN_ZOOM: 1.5, MAX_ZOOM: 4.0, ZOOM_SPEED: 7,
  selectedBuilding: null
};

var _VW = 0, _VH = 0;

function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function _lerp(a, b, t) { return a + (b - a) * t; }

function _clampCamTarget() {
  _cam.tzoom = _clamp(_cam.tzoom, _cam.MIN_ZOOM, _cam.MAX_ZOOM);
  var halfW = _VW / (2 * _cam.tzoom);
  var halfH = _VH / (2 * _cam.tzoom);
  _cam.tx = _clamp(_cam.tx, halfW, DEF_WORLD_W - halfW);
  _cam.ty = _clamp(_cam.ty, halfH, DEF_WORLD_H - halfH);
}

function _clampCamCurrent() {
  var halfW = _VW / (2 * _cam.zoom);
  var halfH = _VH / (2 * _cam.zoom);
  _cam.x = _clamp(_cam.x, halfW, DEF_WORLD_W - halfW);
  _cam.y = _clamp(_cam.y, halfH, DEF_WORLD_H - halfH);
}

/* ════════════════════════════════════════════════════════════
   SCREEN ↔ WORLD COORDINATE CONVERSION
   Reused by missile scouting system
   ════════════════════════════════════════════════════════════ */
export function _s2w(sx, sy) {
  return {
    x: (sx - _VW / 2) / _cam.zoom + _cam.x,
    y: (sy - _VH / 2) / _cam.zoom + _cam.y,
  };
}

export function _w2s(wx, wy) {
  return {
    x: (wx - _cam.x) * _cam.zoom + _VW / 2,
    y: (wy - _cam.y) * _cam.zoom + _VH / 2,
  };
}

/* ════════════════════════════════════════════════════════════
   FIXED CAMERA INITIALIZATION (matches main.js pattern)
   ════════════════════════════════════════════════════════════ */
function _initCam(vw, vh) {
  _VW = vw; 
  _VH = vh;
  
  // ✅ Match main.js: calculate fit zoom first
  var fitZoom = Math.min(vw / DEF_WORLD_W, vh / DEF_WORLD_H);
  _cam.zoom = _clamp(fitZoom, _cam.MIN_ZOOM, _cam.MAX_ZOOM);
  _cam.tzoom = _cam.zoom;
  
  // ✅ Set center position BEFORE clamping
  _cam.x = _cam.tx = DEF_WORLD_W / 2;
  _cam.y = _cam.ty = DEF_WORLD_H / 2;
  
  // ✅ Apply clamping AFTER centering
  _clampCamTarget();
  _clampCamCurrent();
}

function _updateCamera(dt) {
  var s = _clamp(_cam.ZOOM_SPEED * dt, 0, 1);
  _cam.zoom = _clamp(_lerp(_cam.zoom, _cam.tzoom, s), _cam.MIN_ZOOM, _cam.MAX_ZOOM);
  _cam.x = _lerp(_cam.x, _cam.tx, s);
  _cam.y = _lerp(_cam.y, _cam.ty, s);
  _clampCamCurrent();
}

function _camApply(ctx) {
  ctx.save();
  ctx.translate(_VW / 2, _VH / 2);
  ctx.scale(_cam.zoom, _cam.zoom);
  ctx.translate(-_cam.x, -_cam.y);
}

function _camReset(ctx) { ctx.restore(); }

/* ── State ───────────────────────────────────────────────── */
var _enemy = null, _troops = [], _sel = {};
var _raf = null, _lastT = 0, _gameTime = 10;
var _canvas = null, _ctx = null;
var _inBattle = false, _battleOver = false;
var _deployRole = null, _deployQueue = {}, _checkTimer = 0;

/* ════════════════════════════════════════════════════════════
   MISSILE WARFARE STATE (NEW)
   ════════════════════════════════════════════════════════════ */
var _missileState = {
  active: false,
  scoutMode: false,
  capturedCoords: null,
  targetPreview: null,
  launchConfirm: null,
};

/* ── Drag / Pan ──────────────────────────────────────────── */
var _drag = {
  active: false, moved: false,
  startX: 0, startY: 0,
  camStartX: 0, camStartY: 0,
  THRESHOLD: 6,
};

var _mouseScreenX = 0, _mouseScreenY = 0;
var _pinch = {
  active: false,
  startDist: 0, startZoom: 0,
  midX: 0, midY: 0,
  wptX: 0, wptY: 0,
};

function G(id) { return document.getElementById(id); }

/* ════════════════════════════════════════════════════════════
   ACCURATE SCREEN → CANVAS COORDINATES
   ════════════════════════════════════════════════════════════ */
function _screenPos(e) {
  var rect = _canvas.getBoundingClientRect();
  var cssW = rect.width, cssH = rect.height;
  var pxW = _canvas.width, pxH = _canvas.height;
  var scaleX = pxW / cssW, scaleY = pxH / cssH;
  var clientX = (e.clientX - rect.left);
  var clientY = (e.clientY - rect.top);
  clientX = Math.max(0, Math.min(clientX, cssW));
  clientY = Math.max(0, Math.min(clientY, cssH));
  return { x: clientX * scaleX, y: clientY * scaleY };
}

function _getScaledTouchPos(touch) {
  var rect = _canvas.getBoundingClientRect();
  var cssW = rect.width, cssH = rect.height;
  var pxW = _canvas.width, pxH = _canvas.height;
  var scaleX = pxW / cssW, scaleY = pxH / cssH;
  var clientX = touch.clientX - rect.left;
  var clientY = touch.clientY - rect.top;
  clientX = Math.max(0, Math.min(clientX, cssW));
  clientY = Math.max(0, Math.min(clientY, cssH));
  return { x: clientX * scaleX, y: clientY * scaleY };
}

/* ════════════════════════════════════════════════════════════
   BUILDING CLICK DETECTION (ACCURATE BOUNDS)
   ════════════════════════════════════════════════════════════ */
function _isPointInsideBuilding(wx, wy, b) {
  var sc = perspScale(b.y);
  var w = (b.w || 60) * sc * 0.5;
  var h = (b.h || 40) * sc * 0.55;
  return (wx >= b.x - w && wx <= b.x + w && wy >= b.y - h && wy <= b.y + h);
}

function _getClickedBuilding(wx, wy) {
  if (!_enemy) return null;
  for (var i = 0; i < _enemy.buildings.length; i++) {
    var b = _enemy.buildings[i];
    if (b.hp > 0 && _isPointInsideBuilding(wx, wy, b)) return b;
  }
  return null;
}

function _selectBuilding(bld) {
  if (!bld) {
    _cam.selectedBuilding = null;
    _hideBuildingInfo();
    return;
  }
  _cam.selectedBuilding = bld;
  _cam.tx = bld.x;
  _cam.ty = bld.y;
  _cam.tzoom = _cam.MAX_ZOOM;
  _clampCamTarget();
  _showBuildingInfo(bld);
}

/* ════════════════════════════════════════════════════════════
   BUILDING INFO PANEL
   ════════════════════════════════════════════════════════════ */
var _infoTimeout = null;

function _showBuildingInfo(bld) {
  var def = BUILDING_DEFS[bld.type];
  if (!def) return;
  var hpPct = (bld.hp / bld.maxHp * 100).toFixed(0);
  var hpColor = bld.hp/bld.maxHp > 0.5 ? '#27ae60' : bld.hp/bld.maxHp > 0.25 ? '#f39c12' : '#e74c3c';
  
  var html = `<div style="background:rgba(0,0,0,0.9); border-radius:12px; padding:12px; border-left:4px solid ${def.attackRange>0?'#ff4444':'#f5c842'}; min-width:220px;">
    <div style="display:flex; gap:8px; margin-bottom:8px;">
      <span style="font-size:28px;">${def.attackRange>0?'🏰':'🏠'}</span>
      <div>
        <div style="font-weight:bold; color:#f5c842;">${def.label}</div>
        <div style="font-size:10px;">Level ${bld.level}</div>
      </div>
    </div>
    <div>
      <div style="font-size:10px;">HP:</div>
      <div style="background:#2c2c2c; border-radius:4px; height:10px;">
        <div style="width:${hpPct}%; background:${hpColor}; height:100%;"></div>
      </div>
      <div style="font-size:10px;">${Math.floor(bld.hp)}/${bld.maxHp}</div>
    </div>
    ${def.attackRange>0 ? `
      <div style="margin-top:6px; font-size:9px;">
        🗡️ Range: ${Math.floor(bld.attackRange)}<br>
        💥 DPS: ${bld.attackDPS.toFixed(1)}
      </div>` : ''}
    <div style="margin-top:6px; font-size:9px; text-align:center;">🔍 I-click muli para i-focus</div>
  </div>`;
  
  var panel = G('building-info-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'building-info-panel';
    panel.style.cssText = 'position:fixed; bottom:90px; right:20px; z-index:1000; pointer-events:none; transition:opacity 0.2s; font-family:Oldenburg;';
    document.body.appendChild(panel);
  }
  panel.innerHTML = html;
  panel.style.opacity = '1';
  if (_infoTimeout) clearTimeout(_infoTimeout);
  _infoTimeout = setTimeout(() => { if (panel) panel.style.opacity = '0'; }, 4000);
}

function _hideBuildingInfo() {
  var p = G('building-info-panel');
  if (p) p.style.opacity = '0';
  if (_infoTimeout) clearTimeout(_infoTimeout);
}

/* ════════════════════════════════════════════════════════════
   MISSILE SCOUTING FUNCTIONS (NEW)
   ════════════════════════════════════════════════════════════ */

export function enterScoutMode() {
  _missileState.scoutMode = true;
  _missileState.capturedCoords = null;
  _showScoutHint();
  if (window.showMsg) window.showMsg('🔭 Scout Mode: I-click ang building para kumuha ng coordinates', 'info');
}

export function exitScoutMode() {
  _missileState.scoutMode = false;
  _missileState.targetPreview = null;
  _hideScoutHint();
}

function _showScoutHint() {
  var hint = G('scout-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'scout-hint';
    hint.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#f5c842; padding:8px 16px; border-radius:8px; font-family:Oldenburg; font-size:14px; z-index:2000; pointer-events:none;';
    document.body.appendChild(hint);
  }
  hint.textContent = '🔭 I-click ang building para kopyahin ang coordinates';
  hint.style.opacity = '1';
}

function _hideScoutHint() {
  var h = G('scout-hint');
  if (h) h.style.opacity = '0';
}

function _captureBuildingCoords(bld) {
  if (!_missileState.scoutMode) return null;
  
  var zones = ['SENTRO', 'HILAGA', 'TIMOG', 'SILANGAN', 'KANLURAN'];
  var zone = zones[Math.floor(Math.random() * zones.length)];
  
  var coords = {
    x: bld.x.toFixed(2),
    y: bld.y.toFixed(2),
    zone: zone,
    name: 'Nayon ni ' + ['Juan', 'Maria', 'Pedro', 'Ana'][Math.floor(Math.random() * 4)],
    buildingType: bld.type,
    buildingLevel: bld.level
  };
  
  _missileState.capturedCoords = coords;
  
  if (window.showMsg) {
    window.showMsg(`📍 Coordinates captured: X:${coords.x}, Y:${coords.y}, ZONE:${coords.zone}`, 'success');
  }
  
  if (navigator.clipboard) {
    var coordStr = `X:${coords.x}, Y:${coords.y}, ZONE:${coords.zone}`;
    navigator.clipboard.writeText(coordStr).catch(function() {});
  }
  
  _showCapturedCoordsPanel(coords);
  return coords;
}

function _showCapturedCoordsPanel(coords) {
  var panel = G('captured-coords-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'captured-coords-panel';
    panel.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(20,30,50,0.95); border:2px solid #4a8aff; border-radius:12px; padding:12px 20px; min-width:280px; z-index:2000; font-family:Oldenburg;';
    document.body.appendChild(panel);
  }
  
  panel.innerHTML = `
    <div style="color:#4a8aff; font-size:16px; margin-bottom:8px;">📍 Captured Coordinates</div>
    <div style="color:#fff; font-size:13px; margin:4px 0;">Target: ${coords.name}</div>
    <div style="color:#aaa; font-size:11px; margin:4px 0;">X: ${coords.x} | Y: ${coords.y}</div>
    <div style="color:#aaa; font-size:11px; margin:4px 0;">Zone: ${coords.zone}</div>
    <div style="margin-top:10px; display:flex; gap:8px;">
      <button id="copy-coords-btn" style="flex:1; background:#4a8aff; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">📋 Copy</button>
      <button id="use-coords-btn" style="flex:1; background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🚀 Use</button>
    </div>
  `;
  
  panel.style.opacity = '1';
  
  setTimeout(function() {
    var copyBtn = G('copy-coords-btn');
    var useBtn = G('use-coords-btn');
    if (copyBtn) copyBtn.onclick = function() {
      var str = `X:${coords.x}, Y:${coords.y}, ZONE:${coords.zone}`;
      if (navigator.clipboard) navigator.clipboard.writeText(str);
      if (window.showMsg) window.showMsg('📋 Coordinates copied!', 'info');
    };
    if (useBtn) useBtn.onclick = function() {
      _openMissilePanelWithCoords(coords);
    };
  }, 0);
  
  setTimeout(function() {
    if (panel) panel.style.opacity = '0';
  }, 10000);
}

function _openMissilePanelWithCoords(coords) {
  exitScoutMode();
  if (window.openMissilePanel && typeof window.openMissilePanel === 'function') {
    window.openMissilePanel({
      targetX: parseFloat(coords.x),
      targetY: parseFloat(coords.y),
      targetZone: coords.zone,
      targetName: coords.name
    });
  }
}

/* ════════════════════════════════════════════════════════════
   MISSILE PANEL INTEGRATION (NEW)
   ════════════════════════════════════════════════════════════ */

export function openMissilePanel(prefillCoords) {
  _missileState.active = true;
  if (prefillCoords) {
    _missileState.capturedCoords = prefillCoords;
  }
  if (window.showMissilePanel && typeof window.showMissilePanel === 'function') {
    window.showMissilePanel({
      inventory: window._VS?.missileInventory || {},
      prefill: prefillCoords,
      onLaunch: _handleMissileLaunch,
      onClose: function() { _missileState.active = false; }
    });
  }
}

function _handleMissileLaunch(launchData) {
  if (window._launchMissile && typeof window._launchMissile === 'function') {
    var result = window._launchMissile(
      launchData.missileType,
      launchData.targetX,
      launchData.targetY,
      launchData.targetZone,
      launchData.targetName,
      launchData.count || 1
    );
    if (result?.ok) {
      _missileState.active = false;
      if (window.closeMissilePanel) window.closeMissilePanel();
    }
    return result;
  }
  return { ok: false, msg: 'Missile system not initialized.' };
}

/* ════════════════════════════════════════════════════════════
   RENDER LOOP
   ════════════════════════════════════════════════════════════ */
function _render(ts) {
  var dt = Math.min(0.05, (ts - _lastT) / 1000);
  _lastT = ts;
  _gameTime += dt * 0.22;
  if (_gameTime >= 24) _gameTime -= 24;
  
  _updateCamera(dt);
  
  if (!_enemy || !_ctx) { _raf = requestAnimationFrame(_render); return; }
  
  tickDefenderVillagers(_enemy.villagers, dt, DEF_WORLD_W, DEF_WORLD_H, _enemy.waypoints);
  
  if (_inBattle && !_battleOver) {
    tickBattle(_troops, _enemy, dt);
    _checkTimer += dt;
    if (_checkTimer >= 0.5) { _checkTimer = 0; _checkBattleEnd(); }
  }
  
  _ctx.setTransform(1,0,0,1,0,0);
  _ctx.clearRect(0,0,_VW,_VH);
  
  _camApply(_ctx);
  drawBattleScene(_ctx, _enemy, _troops, _gameTime, _inBattle, ts);
  
  if (_missileState.scoutMode && _missileState.targetPreview) {
    _drawScoutPreview(_ctx, _missileState.targetPreview, ts);
  }
  
  if (_cam.selectedBuilding && _cam.selectedBuilding.hp > 0 && _cam.selectedBuilding.attackRange > 0) {
    var sc = perspScale(_cam.selectedBuilding.y);
    var range = _cam.selectedBuilding.attackRange * sc;
    _ctx.save();
    _ctx.globalAlpha = 0.4;
    _ctx.strokeStyle = '#ff6666';
    _ctx.fillStyle = 'rgba(255,80,80,0.1)';
    _ctx.lineWidth = 2.5;
    _ctx.setLineDash([10,8]);
    _ctx.beginPath();
    _ctx.arc(_cam.selectedBuilding.x, _cam.selectedBuilding.y, range, 0, Math.PI*2);
    _ctx.fill();
    _ctx.stroke();
    _ctx.setLineDash([]);
    _ctx.restore();
  }
  
  _camReset(_ctx);
  
  _ctx.setTransform(1,0,0,1,0,0);
  drawTimeOverlay(_ctx, _VW, _VH, _gameTime);
  
  if (_deployRole && !_battleOver && !_drag.moved) _drawDeployHint(ts);
  
  updateDestructionBar(_enemy?.buildings);
  
  _raf = requestAnimationFrame(_render);
}

function _drawScoutPreview(ctx, bld, now) {
  var sc = perspScale(bld.y);
  var w = (bld.w || 60) * sc;
  var h = (bld.h || 40) * sc;
  
  ctx.save();
  ctx.translate(bld.x, bld.y);
  
  var pulse = 0.3 + 0.2 * Math.sin(now / 200);
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#4a8aff';
  ctx.lineWidth = 3 * sc;
  ctx.setLineDash([8*sc, 4*sc]);
  ctx.beginPath();
  ctx.rect(-w/2 - 5*sc, -h/2 - 5*sc, w + 10*sc, h + 10*sc);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2 * sc;
  ctx.beginPath();
  ctx.moveTo(-20*sc, 0); ctx.lineTo(20*sc, 0);
  ctx.moveTo(0, -20*sc); ctx.lineTo(0, 20*sc);
  ctx.stroke();
  
  ctx.restore();
}

function _drawDeployHint(now) {
  if (!_deployRole) return;
  var r = 18 + 4 * Math.sin(now/200);
  _ctx.save();
  _ctx.strokeStyle = ROLE_COLOR[_deployRole] || '#fff';
  _ctx.lineWidth = 2.5;
  _ctx.globalAlpha = 0.75;
  _ctx.beginPath();
  _ctx.arc(_mouseScreenX, _mouseScreenY, r, 0, Math.PI*2);
  _ctx.stroke();
  _ctx.font = '18px serif';
  _ctx.textAlign = 'center';
  _ctx.textBaseline = 'middle';
  _ctx.fillText(ROLE_ICON[_deployRole] || '?', _mouseScreenX, _mouseScreenY);
  _ctx.restore();
}

/* ════════════════════════════════════════════════════════════
   BATTLE END
   ════════════════════════════════════════════════════════════ */
function _checkBattleEnd() {
  if (_battleOver) return;
  var aliveBuildings = _enemy.buildings.filter(b => b.hp > 0);
  if (aliveBuildings.length === 0) { _endBattle(true); return; }
  var aliveT = _troops.filter(t => t.hp > 0);
  var remaining = Object.keys(_deployQueue).reduce((s,r) => s + (_deployQueue[r]||0), 0);
  if (aliveT.length === 0 && remaining === 0) _endBattle(false);
}

function _endBattle(won) {
  _battleOver = true;
  _deployRole = null;
  _cam.selectedBuilding = null;
  _hideBuildingInfo();
  
  var total = _enemy.buildings.length;
  var destroyed = _enemy.buildings.filter(b => b.hp <= 0).length;
  var pct = total ? destroyed/total : 0;
  var stars = pct >= 1 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
  
  var lootFrac = won ? (0.7 + Math.random()*0.3) : (pct*0.5 + Math.random()*0.1);
  var lg = Math.floor(_enemy.goldLoot * lootFrac);
  var lr = Math.floor(_enemy.riceLoot * lootFrac);
  
  var vs = window._VS;
  if (vs && (won || pct > 0)) {
    vs.res.gold = Math.min(vs.resCap.gold, (vs.res.gold||0) + lg);
    vs.res.rice = Math.min(vs.resCap.rice, (vs.res.rice||0) + lr);
  }
  
  var casualties = _troops.filter(t => t.hp <= 0);
  _removeSoldiers(casualties);
  
  setTimeout(() => {
    showResultModal(won, stars, lg, lr, casualties.length, pct);
    _updateDeployUI();
  }, 600);
}

/* ════════════════════════════════════════════════════════════
   POINTER HANDLERS
   ════════════════════════════════════════════════════════════ */
function _onMouseDown(e) {
  var p = _screenPos(e);
  _drag.active = true; _drag.moved = false;
  _drag.startX = p.x; _drag.startY = p.y;
  _drag.camStartX = _cam.tx; _drag.camStartY = _cam.ty;
  _mouseScreenX = p.x; _mouseScreenY = p.y;
}

function _onMouseMove(e) {
  var p = _screenPos(e);
  _mouseScreenX = p.x; _mouseScreenY = p.y;
  
  if (_missileState.scoutMode && _enemy) {
    var wp = _s2w(p.x, p.y);
    var bld = _getClickedBuilding(wp.x, wp.y);
    _missileState.targetPreview = bld;
  }
  
  if (!_drag.active) return;
  var dx = p.x - _drag.startX, dy = p.y - _drag.startY;
  if (!_drag.moved && Math.hypot(dx,dy) > _drag.THRESHOLD) _drag.moved = true;
  if (_drag.moved) {
    _cam.tx = _drag.camStartX - dx / _cam.zoom;
    _cam.ty = _drag.camStartY - dy / _cam.zoom;
    _clampCamTarget();
  }
}

function _onMouseUp(e) {
  if (!_drag.active) return;
  _drag.active = false;
  
  if (!_drag.moved) {
    var p = _screenPos(e);
    _deployOrClickAtScreen(p.x, p.y);
  }
}

function _onWheel(e) {
  e.preventDefault();
  var p = _screenPos(e);
  var wpt = _s2w(p.x, p.y);
  var prev = _cam.tzoom;
  _cam.tzoom = _clamp(_cam.tzoom * (e.deltaY < 0 ? 1.12 : 0.89), _cam.MIN_ZOOM, _cam.MAX_ZOOM);
  var ratio = _cam.tzoom / prev;
  _cam.tx = wpt.x + (_cam.tx - wpt.x) / ratio;
  _cam.ty = wpt.y + (_cam.ty - wpt.y) / ratio;
  _clampCamTarget();
}

function _touchDist(t1, t2) {
  var p1 = _getScaledTouchPos(t1), p2 = _getScaledTouchPos(t2);
  return Math.hypot(p1.x-p2.x, p1.y-p2.y);
}

function _touchMid(t1, t2) {
  var p1 = _getScaledTouchPos(t1), p2 = _getScaledTouchPos(t2);
  return { x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2 };
}

function _onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    var p = _getScaledTouchPos(e.touches[0]);
    _drag.active = true; _drag.moved = false;
    _drag.startX = p.x; _drag.startY = p.y;
    _drag.camStartX = _cam.tx; _drag.camStartY = _cam.ty;
    _mouseScreenX = p.x; _mouseScreenY = p.y;
    _pinch.active = false;
  } else if (e.touches.length === 2) {
    _drag.active = false;
    _pinch.active = true;
    _pinch.startDist = _touchDist(e.touches[0], e.touches[1]);
    _pinch.startZoom = _cam.tzoom;
    var mid = _touchMid(e.touches[0], e.touches[1]);
    _pinch.midX = mid.x; _pinch.midY = mid.y;
    var wpt = _s2w(mid.x, mid.y);
    _pinch.wptX = wpt.x; _pinch.wptY = wpt.y;
  }
}

function _onTouchMove(e) {
  e.preventDefault();
  if (_pinch.active && e.touches.length === 2) {
    var newDist = _touchDist(e.touches[0], e.touches[1]);
    var prev = _cam.tzoom;
    _cam.tzoom = _clamp(_pinch.startZoom * (newDist / _pinch.startDist), _cam.MIN_ZOOM, _cam.MAX_ZOOM);
    var ratio = _cam.tzoom / prev;
    _cam.tx = _pinch.wptX + (_cam.tx - _pinch.wptX) / ratio;
    _cam.ty = _pinch.wptY + (_cam.ty - _pinch.wptY) / ratio;
    var newMid = _touchMid(e.touches[0], e.touches[1]);
    _cam.tx -= (newMid.x - _pinch.midX) / _cam.zoom;
    _cam.ty -= (newMid.y - _pinch.midY) / _cam.zoom;
    _pinch.midX = newMid.x; _pinch.midY = newMid.y;
    _clampCamTarget();
  } else if (_drag.active && e.touches.length === 1) {
    var p = _getScaledTouchPos(e.touches[0]);
    _mouseScreenX = p.x; _mouseScreenY = p.y;
    var dx = p.x - _drag.startX, dy = p.y - _drag.startY;
    if (!_drag.moved && Math.hypot(dx,dy) > _drag.THRESHOLD) _drag.moved = true;
    if (_drag.moved) {
      _cam.tx = _drag.camStartX - dx / _cam.zoom;
      _cam.ty = _drag.camStartY - dy / _cam.zoom;
      _clampCamTarget();
    }
  }
}

function _onTouchEnd(e) {
  e.preventDefault();
  if (_pinch.active && e.touches.length < 2) _pinch.active = false;
  if (_drag.active && e.touches.length === 0) {
    _drag.active = false;
    if (!_drag.moved) _deployOrClickAtScreen(_drag.startX, _drag.startY);
  }
}

/* ── Deploy or click ──────────────────────────────────────── */
function _deployOrClickAtScreen(sx, sy) {
  var wp = _s2w(sx, sy);
  
  if (_missileState.scoutMode) {
    var bld = _getClickedBuilding(wp.x, wp.y);
    if (bld) {
      _captureBuildingCoords(bld);
      return;
    }
    exitScoutMode();
    return;
  }
  
  if (_missileState.active) {
    return;
  }
  
  if (_deployRole && !_battleOver && _enemy && _deployQueue[_deployRole] > 0) {
    var troop = createTroop(_deployRole, wp.x, wp.y);
    if (troop) {
      _troops.push(troop);
      _deployQueue[_deployRole]--;
      if (_deployQueue[_deployRole] <= 0) delete _deployQueue[_deployRole];
      _inBattle = true;
      _updateDeployUI();
      return;
    }
  }
  
  var bld = _getClickedBuilding(wp.x, wp.y);
  if (bld) _selectBuilding(bld);
  else {
    _cam.selectedBuilding = null;
    _hideBuildingInfo();
  }
}

/* ════════════════════════════════════════════════════════════
   UI WRAPPERS
   ════════════════════════════════════════════════════════════ */
function _updateHUD() { updateHUD(_enemy); }
function _renderTroopBar() { renderTroopBar(_sel, _deployRole); }
function _refreshPowerBar() { updatePowerBar(_sel, _enemy?.defPower); }
function _showDeployUI() { showDeployUI(); _updateDeployUI(); }
function _updateDeployUI() { updateDeployUI(_deployQueue, _deployRole, _troops, _enemy); }
function _clearUIPanels() { clearPanels(); }

function _removeSoldiers(deadTroops) {
  var vs = window._VS;
  if (!vs || !vs.villagers || deadTroops.length === 0) return;
  var roleCounts = {};
  deadTroops.forEach(function(t) { roleCounts[t.role] = (roleCounts[t.role]||0)+1; });
  Object.keys(roleCounts).forEach(function(role) {
    var count = roleCounts[role];
    var pool = vs.villagers.filter(function(v) {
      return (v._typeDef||{}).type === role && !v.isTraining;
    });
    for (var i = 0; i < pool.length && count > 0; i++) {
      var idx = vs.villagers.indexOf(pool[i]);
      if (idx !== -1) { vs.villagers.splice(idx,1); count--; }
    }
  });
}

/* ════════════════════════════════════════════════════════════
   CANVAS & VILLAGE LOADER (FIXED CENTERING)
   ════════════════════════════════════════════════════════════ */
function _sizeCanvas() {
  // Set canvas INTERNAL pixel dimensions to world size
  _canvas.width = DEF_WORLD_W;
  _canvas.height = DEF_WORLD_H;
  
  // ✅ CRITICAL: _VW/_VH must be canvas internal dimensions (matches main.js)
  // These are used by _camApply() for the transform math
  _VW = _canvas.width;   // = DEF_WORLD_W
  _VH = _canvas.height;  // = DEF_WORLD_H
  
  // Use viewport ONLY for CSS display sizing (browser scales the canvas)
  var screen = G('attack-screen');
  var displayW = screen.clientWidth || window.innerWidth;
  var displayH = screen.clientHeight || window.innerHeight;
  
  _canvas.style.position = 'absolute';
  _canvas.style.top = '0';
  _canvas.style.left = '0';
  _canvas.style.width = displayW + 'px';
  _canvas.style.height = displayH + 'px';
  _canvas.style.display = 'block';
  
  // ✅ Set window globals to internal dimensions (matches main.js pattern)
  window._VW = _VW;
  window._VH = _VH;
}

function _loadVillage() {
  _sizeCanvas();
  _enemy = generateDefenderVillage(null);
  _sel = {};
  _troops = [];
  _deployQueue = {};
  _deployRole = null;
  _inBattle = false;
  _battleOver = false;
  _checkTimer = 0;
  _cam.selectedBuilding = null;
  _hideBuildingInfo();
  
  // ✅ Initialize camera with proper dimensions
  _initCam(_VW, _VH);
  
  _updateHUD();
  _renderTroopBar();
  _clearUIPanels();
}
/* ════════════════════════════════════════════════════════════
   PUBLIC API
   ════════════════════════════════════════════════════════════ */
window.openAttackScreen = function() {
  _canvas = G('enemy-canvas');
  _ctx = _canvas.getContext('2d');
  G('attack-screen').style.display = 'block';
  _loadVillage();
  
  // ════════════════════════════════════════════════════════
  // SWITCH TO BATTLE MUSIC
  // ════════════════════════════════════════════════════════
  if (typeof window.switchToBattleMusic === 'function') {
    window.switchToBattleMusic();
  }
  // ════════════════════════════════════════════════════════
  
  var handlers = [
    ['mousedown', _onMouseDown], ['mousemove', _onMouseMove], ['mouseup', _onMouseUp],
    ['mouseleave', _onMouseUp], ['wheel', _onWheel, { passive: false }],
    ['touchstart', _onTouchStart, { passive: false }],
    ['touchmove', _onTouchMove, { passive: false }],
    ['touchend', _onTouchEnd, { passive: false }],
    ['touchcancel', _onTouchEnd, { passive: false }]
  ];
  
  handlers.forEach(function(h) {
    _canvas.removeEventListener(h[0], h[1]);
    _canvas.addEventListener(h[0], h[1], h[2] || {});
  });
  
  if (!_raf) { _lastT = performance.now(); _raf = requestAnimationFrame(_render); }
};

window._atkClose = function() {
  G('attack-screen').style.display = 'none';
  _cam.selectedBuilding = null;
  _hideBuildingInfo();
  
  // ════════════════════════════════════════════════════════
  // RESUME DAY/NIGHT MUSIC
  // ════════════════════════════════════════════════════════
  if (typeof window.resumeRegularMusic === 'function') {
    window.resumeRegularMusic();
  }
  // ════════════════════════════════════════════════════════
  
  if (_raf) cancelAnimationFrame(_raf);
  _raf = null;
};
window._atkNewVillage = _loadVillage;

window._atkChg = function(role, delta) {
  var inv = getMilitaryInventory();
  _sel[role] = Math.max(0, Math.min(inv[role]||0, (_sel[role]||0)+delta));
  var el = G('tsel-'+role);
  if (el) el.textContent = _sel[role];
  _refreshPowerBar();
};

window._atkSelectDeploy = function(role) {
  if (!_deployQueue[role] || _deployQueue[role] <= 0) return;
  _deployRole = role;
  _updateDeployUI();
};

window._atkLusubin = function() {
  if (!_enemy) return;
  var atk = MILITARY.reduce(function(s,r) { return s + (_sel[r]||0)*ROLE_POWER[r]; }, 0);
  if (atk === 0) {
    if (window.showMsg) window.showMsg('Pumili muna ng sundalo!','warning');
    return;
  }
  MILITARY.forEach(function(r) {
    if (_sel[r]) _deployQueue[r] = (_deployQueue[r]||0) + _sel[r];
  });
  _deployRole = MILITARY.find(function(r) { return _deployQueue[r] > 0; }) || null;
  _showDeployUI();
};

/* ════════════════════════════════════════════════════════════
   MISSILE WARFARE PUBLIC API (NEW)
   ════════════════════════════════════════════════════════════ */
window._enterScoutMode = enterScoutMode;
window._openMissilePanel = openMissilePanel;
window._getCapturedCoords = function() { return _missileState.capturedCoords; };

window._calculateMissileETA = function(missileType, targetX, targetY) {
  if (!_enemy) return null;
  var playerPos = { x: DEF_WORLD_W/2, y: DEF_WORLD_H/2 };
  var distance = getDistanceBetweenPoints(playerPos.x, playerPos.y, targetX, targetY);
  return calculateETA(distance, missileType);
};

window._previewMissileTargets = function(missileType, targetX, targetY) {
  if (!_enemy) return [];
  return selectMissileTargets(_enemy.buildings, missileType);
};

/* ════════════════════════════════════════════════════════════
   RESIZE HANDLER (FIXED: re-centers on resize)
   ════════════════════════════════════════════════════════════ */
window.addEventListener('resize', function() {
  var scr = G('attack-screen');
  if (!scr || scr.style.display === 'none' || !_canvas) return;
  
  // ✅ Update CSS display size ONLY - don't touch _VW/_VH!
  var displayW = scr.clientWidth || window.innerWidth;
  var displayH = scr.clientHeight || window.innerHeight;
  _canvas.style.width = displayW + 'px';
  _canvas.style.height = displayH + 'px';
  
  // ✅ Re-center camera on world center
  _cam.x = _cam.tx = DEF_WORLD_W / 2;
  _cam.y = _cam.ty = DEF_WORLD_H / 2;
  _clampCamTarget();
  _clampCamCurrent();
});