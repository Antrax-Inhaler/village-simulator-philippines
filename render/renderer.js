/* ═══════════════════════════════════════════════════════════════
Mini Bayan — render/renderer.js  (with Missile Warfare Support)
══════════════════════════════════════════════════════════════ */
import { perspScale, clamp, lerp }  from '../utils/perspective.js';
import { getTimeStr, getTimeOfDay, getOverlayColor, getSunMoonState } from '../utils/time.js';
import { drawGroundSprite }         from '../utils/sprites.js';
import { getMainHallLevel, getMainHallRules } from '../buildings/building.js';
import { drawVillager }             from '../villagers/villager.js';
import { cam, camApply, camReset, w2s, WORLD_W, WORLD_H } from './camera.js';
import { getActiveCalamity } from '../government/events.js';
import { getWasteStats }     from '../resources/economy.js';
import { drawZoneArrows }    from '../world/zones.js';

/* ══════════════════════════════════════════════════════════════
USER ADJUSTABLE: Max Upgrade Footprint Multiplier
2.0 = 2x the base building size (green guide shows max upgrade space)
MUST MATCH input.js VALUE!
══════════════════════════════════════════════════════════════ */
var MAX_UPGRADE_FOOTPRINT_MULTIPLIER = 2.0;

/* ══════════════════════════════════════════════════════════════
Missile Sprite System Imports
══════════════════════════════════════════════════════════════ */
import {
  drawMissileOnMap,
  MissileImpactEffect,
  drawMissileLaunch,
  getMissileColor
} from './missileSprites.js';

/* ══════════════════════════════════════════════════════════════
Wind particles — persist across frames
══════════════════════════════════════════════════════════════ */
var _windParticles = (function() {
  var arr = [];
  for (var i = 0; i < 120; i++) {
    arr.push({
      x:    Math.random(),
      y:    Math.random(),
      len:  20 + Math.random() * 60,
      spd:  0.18 + Math.random() * 0.32,
      alpha: 0.3 + Math.random() * 0.5,
    });
  }
  return arr;
})();

/* ══════════════════════════════════════════════════════════════
Missile Effects Storage (for current session)
══════════════════════════════════════════════════════════════ */
var _missileTrails = {};      // missileId → trail particles array
var _missileImpacts = [];     // Active impact effects
var _missileLaunches = [];    // Active launch effects

/* ══════════════════════════════════════════════════════════════
renderFrame
Single entry point called by main.js each animation frame.
══════════════════════════════════════════════════════════════ */
export function renderFrame(canvas, ctx, state) {
  var VW = state.VW, VH = state.VH;
  if (!VW || !ctx) return;
  ctx.clearRect(0, 0, VW, VH);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  /* ── Update missile effects ───────────────────────────────── */
  _updateMissileEffects(state.VS, 1/60);

  /* ── World-space draws ─────────────────────────────────── */
  camApply(ctx);
  if (state.shakeX || state.shakeY) {
    ctx.translate(state.shakeX || 0, state.shakeY || 0);
  }
  drawGround(ctx, VW, VH);
  if (state.drawZoneGrid)   state.drawZoneGrid(ctx, VW, VH, state.VS);
  drawZoneArrows(ctx, VW, VH, state.VS);
  drawEntitiesSorted(ctx, state);
  drawBuildPreview(ctx, state);
  drawMissileEffects(ctx, state);
  camReset(ctx);

  /* ── Calamity overlay ──────────────────────────────────── */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  var _cal = getActiveCalamity(state.VS);
  if (_cal) drawCalamityOverlay(ctx, VW, VH, _cal);

  /* ── Screen-space draws ────────────────────────────────── */
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawTimeOverlay(ctx, VW, VH, state.VS.time);
  drawHUD(ctx, state.VS, VW);
  drawZoomBadge(ctx, VW, VH);
  drawRankBadge(ctx, VW, VH, state.VS);
  drawMissileStatusBadge(ctx, VW, VH, state.VS);
  updateBarUI(state.VS, state.dayCount);
  updateBubblePositions(canvas, state.activeBubbles, state.VW, state.VH);

  /* ── Waste display (DOM panel) ─────────────────────────── */
  updateWasteDisplay(state.VS);
}

/* ══════════════════════════════════════════════════════════════
Update Missile Effects (launch, travel, impact)
══════════════════════════════════════════════════════════════ */
function _updateMissileEffects(VS, dt) {
  var frameCount = Math.floor(performance.now() / 16);
  _missileImpacts = _missileImpacts.filter(function(effect) {
    return effect.update(dt);
  });
  _missileLaunches = _missileLaunches.filter(function(effect) {
    return effect.update(dt);
  });
  if (VS.missiles && VS.missiles.outgoing) {
    VS.missiles.outgoing.forEach(function(missile) {
      if (missile.status === 'traveling' && !missile.cancelled) {
        if (!_missileTrails[missile.id]) {
          _missileTrails[missile.id] = [];
        }
        var elapsed = Date.now() - missile.launchTime;
        var total = missile.impactTime - missile.launchTime;
        missile.progress = clamp(elapsed / total, 0, 1);
        if (!missile.startX || !missile.startY) {
          var silo = _findMissileSilo(VS);
          missile.startX = silo ? silo.x : (WORLD_W / 2);
          missile.startY = silo ? silo.y : (WORLD_H / 2);
        }
      }
    });
    Object.keys(_missileTrails).forEach(function(id) {
      var missile = VS.missiles.outgoing.find(function(m) { return m.id === id; });
      if (!missile || missile.status !== 'traveling') {
        delete _missileTrails[id];
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════
Find Missile Silo building (for launch position)
══════════════════════════════════════════════════════════════ */
function _findMissileSilo(VS) {
  if (!VS || !VS.buildings) return null;
  for (var i = 0; i < VS.buildings.length; i++) {
    var b = VS.buildings[i];
    if (b.type === 'missilesilo' && b.hp > 0) {
      return b;
    }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
Draw Missile Effects (traveling missiles, impacts, launches)
══════════════════════════════════════════════════════════════ */
function drawMissileEffects(ctx, state) {
  var VS = state.VS;
  var sc = cam.zoom;
  var frameCount = Math.floor(performance.now() / 16);
  _missileLaunches.forEach(function(effect) {
    effect.draw(ctx);
  });
  if (VS.missiles && VS.missiles.outgoing) {
    VS.missiles.outgoing.forEach(function(missile) {
      if (missile.status === 'traveling' && !missile.cancelled && missile.progress !== undefined) {
        var trailParticles = _missileTrails[missile.id] || [];
        drawMissileOnMap(ctx, missile, sc, frameCount, trailParticles);
      }
    });
  }
  _missileImpacts.forEach(function(effect) {
    effect.draw(ctx);
  });
}

/* ══════════════════════════════════════════════════════════════
Add Missile Launch Effect (called when missile launches)
══════════════════════════════════════════════════════════════ */
export function addMissileLaunch(siloX, siloY, missileType) {
  var sc = cam.zoom;
  var effect = {
    x: siloX,
    y: siloY,
    missileType: missileType,
    sc: sc,
    progress: 0,
    maxProgress: 1,
    active: true,
    update: function(dt) {
      this.progress += dt * 2;
      if (this.progress >= this.maxProgress) {
        this.active = false;
      }
      return this.active;
    },
    draw: function(ctx) {
      drawMissileLaunch(ctx, this.x, this.y, this.missileType, this.sc, this.progress);
    }
  };
  _missileLaunches.push(effect);
}

/* ══════════════════════════════════════════════════════════════
Add Missile Impact Effect (called when missile hits)
══════════════════════════════════════════════════════════════ */
export function addMissileImpact(targetX, targetY, missileType) {
  var sc = cam.zoom;
  var effect = new MissileImpactEffect(targetX, targetY, missileType, sc);
  _missileImpacts.push(effect);
}

/* ══════════════════════════════════════════════════════════════
Clear All Missile Effects (for cleanup)
══════════════════════════════════════════════════════════════ */
export function clearMissileEffects() {
  _missileTrails = {};
  _missileImpacts = [];
  _missileLaunches = [];
}

/* ══════════════════════════════════════════════════════════════
updateWasteDisplay
══════════════════════════════════════════════════════════════ */
export function updateWasteDisplay(VS) {
  if (typeof window.updateWasteDisplay !== 'function') return;
  if (!VS) return;
  var w = getWasteStats(VS);
  window.updateWasteDisplay(w);
}

/* ══════════════════════════════════════════════════════════════
drawGround
══════════════════════════════════════════════════════════════ */
export function drawGround(ctx, canvasW, canvasH) {
  var g = ctx.createLinearGradient(0, 0, 0, canvasH);
  g.addColorStop(0,    '#4a7c5a');
  g.addColorStop(0.35, '#5d8c6b');
  g.addColorStop(0.7,  '#507860');
  g.addColorStop(1,    '#3d5e46');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WORLD_W, WORLD_H);
  ctx.clip();

  ctx.fillStyle = 'rgba(150,110,55,0.22)';
  ctx.beginPath();
  ctx.moveTo(WORLD_W*0.46, 0);
  ctx.bezierCurveTo(WORLD_W*0.49, WORLD_H*0.3,  WORLD_W*0.45, WORLD_H*0.5,  WORLD_W*0.5,  WORLD_H*0.43);
  ctx.bezierCurveTo(WORLD_W*0.55, WORLD_H*0.36, WORLD_W*0.53, WORLD_H*0.65, WORLD_W*0.54, WORLD_H);
  ctx.lineTo(WORLD_W*0.61, WORLD_H);
  ctx.bezierCurveTo(WORLD_W*0.60, WORLD_H*0.65, WORLD_W*0.62, WORLD_H*0.36, WORLD_W*0.57, WORLD_H*0.43);
  ctx.bezierCurveTo(WORLD_W*0.52, WORLD_H*0.5,  WORLD_W*0.56, WORLD_H*0.3,  WORLD_W*0.53, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(150,110,55,0.16)';
  ctx.beginPath();
  ctx.moveTo(0, WORLD_H*0.40);
  ctx.bezierCurveTo(WORLD_W*0.25, WORLD_H*0.43, WORLD_W*0.45, WORLD_H*0.40, WORLD_W*0.5, WORLD_H*0.43);
  ctx.bezierCurveTo(WORLD_W*0.55, WORLD_H*0.46, WORLD_W*0.75, WORLD_H*0.42, WORLD_W,     WORLD_H*0.44);
  ctx.lineTo(WORLD_W, WORLD_H*0.50);
  ctx.bezierCurveTo(WORLD_W*0.75, WORLD_H*0.48, WORLD_W*0.55, WORLD_H*0.52, WORLD_W*0.5, WORLD_H*0.49);
  ctx.bezierCurveTo(WORLD_W*0.45, WORLD_H*0.46, WORLD_W*0.25, WORLD_H*0.49, 0,      WORLD_H*0.47);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(38,90,38,0.28)';
  var dots = [
    [0.063,0.132],[0.156,0.243],[0.328,0.083],[0.547,0.118],[0.742,0.271],[0.859,0.188],
    [0.219,0.708],[0.484,0.660],[0.688,0.722],[0.820,0.771],[0.117,0.875],[0.625,0.858],
  ];
  dots.forEach(function(t) {
    ctx.beginPath();
    ctx.ellipse(t[0]*WORLD_W, t[1]*WORLD_H, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  drawGroundSprite(ctx, 'grass', 0, 0, WORLD_W, WORLD_H);
  ctx.restore();

  ctx.strokeStyle = 'rgba(197, 154, 78, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
}

/* ══════════════════════════════════════════════════════════════
drawEntitiesSorted — Shows ALL buildings' max footprints when moving
══════════════════════════════════════════════════════════════ */
export function drawEntitiesSorted(ctx, state) {
  var VS     = state.VS;
  var drag   = state.drag;
  var drawer = state.drawer;
  var ents   = [];

  /* ── Draw ALL buildings' max footprints when moving a building ── */
  var isMovingBuilding = (drag && drag.building && drag.moved);
  
  VS.buildings.forEach(function(b) {
    ents.push({
      y: b.y,
      draw: function() {
        /* Show max footprint for ALL other buildings when dragging */
        if (isMovingBuilding && drag.building !== b) {
          var sc = perspScale(b.y);
          var def = b.getDef();
          var maxW = def.w * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
          var maxH = def.h * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
          
          ctx.save();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = '#44ff88';
          ctx.fillRect(b.x - maxW/2, b.y - maxH, maxW, maxH);
          ctx.strokeStyle = '#44ff88';
          ctx.lineWidth = 1 / cam.zoom;
          ctx.setLineDash([4/cam.zoom, 4/cam.zoom]);
          ctx.strokeRect(b.x - maxW/2, b.y - maxH, maxW, maxH);
          ctx.setLineDash([]);
          ctx.restore();
        }
        
        /* Draw building being dragged with overlap feedback */
        if (drag && drag.building === b && drag.moved) {
          var sc = perspScale(b.y);
          var def = b.getDef();
          
          /* Determine color based on overlap/zone violation */
          var hasOverlap = b._hasOverlap || false;
          var hasZoneViolation = b._zoneViolation || false;
          var isInvalid = hasOverlap || hasZoneViolation;
          
          var footprintColor = isInvalid ? '#ff4444' : '#44ff88';
          var fillColor = isInvalid ? 'rgba(255,68,68,0.15)' : 'rgba(68,255,136,0.15)';
          
          /* MAX UPGRADE FOOTPRINT (GREEN or RED) */
          var maxW = def.w * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
          var maxH = def.h * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
          
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = fillColor;
          ctx.fillRect(b.x - maxW/2, b.y - maxH, maxW, maxH);
          ctx.strokeStyle = footprintColor;
          ctx.lineWidth = 2 / cam.zoom;
          ctx.setLineDash([8/cam.zoom, 6/cam.zoom]);
          ctx.strokeRect(b.x - maxW/2, b.y - maxH, maxW, maxH);
          ctx.setLineDash([]);
          
          /* Label */
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = footprintColor;
          ctx.font = 'bold ' + (8*sc) + 'px "Oldenburg",serif';
          ctx.textAlign = 'center';
          var label = isInvalid ? '⚠️ Overlap!' : 'Max Upgrade';
          ctx.fillText(label, b.x, b.y - maxH - 5*sc);
          ctx.restore();
          
          /* Current size outline */
          ctx.save();
          ctx.strokeStyle = footprintColor;
          ctx.lineWidth   = 2 / cam.zoom;
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          ctx.globalAlpha = 0.85;
          ctx.strokeRect(b.x - b.w*sc*0.6, b.y - b.h*sc*1.2, b.w*sc*1.2, b.h*sc*1.4);
          ctx.setLineDash([]);
          ctx.restore();
        }
        
        b.draw(ctx);
      },
    });
  });

  VS.resourceNodes.forEach(function(n) {
    ents.push({
      y: n.y,
      draw: function() { n.draw(ctx, performance.now()); },
    });
  });

  VS.villagers.forEach(function(v) {
    ents.push({
      y: v.y,
      draw: function() {
        if (drawer && drawer.visible && drawer.kind === 'villager' && drawer.target === v) {
          var sc = perspScale(v.y);
          ctx.save();
          ctx.strokeStyle = '#f5c842';
          ctx.lineWidth   = 2 / cam.zoom;
          ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 380));
          ctx.beginPath();
          ctx.ellipse(v.x, v.y + 2*sc, 14*sc, 5*sc, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        drawVillager(ctx, v);
      },
    });
  });

  ents.sort(function(a, b) { return a.y - b.y; });
  ents.forEach(function(e) { ctx.shadowBlur = 0; e.draw(); });
}

/* ══════════════════════════════════════════════════════════════
drawBuildPreview — Shows guide when PLACING NEW buildings
══════════════════════════════════════════════════════════════ */
export function drawBuildPreview(ctx, state) {
  var gameMode         = state.gameMode;
  var pendingBuildType = state.pendingBuildType;
  var mouseX           = state.mouseX;
  var mouseY           = state.mouseY;
  var BUILDING_DEFS    = state.BUILDING_DEFS;
  var drawer           = state.drawer;

  /* ── MOVE BUILDING MODE (existing building) ──────────────── */
  if (gameMode === 'move_building' && drawer && drawer.target) {
    var wp0 = state.s2w(mouseX, mouseY);
    var bm  = drawer.target;
    var sc0 = perspScale(wp0.y);
    var def = bm.getDef();
    
    /* Determine color based on overlap/zone violation */
    var hasOverlap = bm._hasOverlap || false;
    var hasZoneViolation = bm._zoneViolation || false;
    var isInvalid = hasOverlap || hasZoneViolation;
    
    var footprintColor = isInvalid ? '#ff4444' : '#44ff88';
    var fillColor = isInvalid ? 'rgba(255,68,68,0.15)' : 'rgba(68,255,136,0.15)';

    /* MAX UPGRADE FOOTPRINT (GREEN or RED) */
    var maxW = def.w * sc0 * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
    var maxH = def.h * sc0 * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = fillColor;
    ctx.fillRect(wp0.x - maxW/2, wp0.y - maxH, maxW, maxH);
    ctx.strokeStyle = footprintColor;
    ctx.lineWidth = 2 / cam.zoom;
    ctx.setLineDash([8/cam.zoom, 6/cam.zoom]);
    ctx.strokeRect(wp0.x - maxW/2, wp0.y - maxH, maxW, maxH);
    ctx.setLineDash([]);

    /* Label */
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = footprintColor;
    ctx.font = 'bold ' + (8*sc0) + 'px "Oldenburg",serif';
    ctx.textAlign = 'center';
    var label = isInvalid ? '⚠️ Overlap!' : 'Max Upgrade';
    ctx.fillText(label, wp0.x, wp0.y - maxH - 5*sc0);
    ctx.restore();

    /* Current size outline */
    ctx.save();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = footprintColor;
    ctx.lineWidth   = 2 / cam.zoom;
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([6/cam.zoom, 4/cam.zoom]);
    ctx.strokeRect(wp0.x - bm.w*sc0*0.6, wp0.y - bm.h*sc0*1.2, bm.w*sc0*1.2, bm.h*sc0*1.4);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle   = fillColor;
    ctx.fillRect(wp0.x - bm.w*sc0*0.6, wp0.y - bm.h*sc0*1.2, bm.w*sc0*1.2, bm.h*sc0*1.4);
    ctx.fillStyle   = footprintColor;
    ctx.globalAlpha = 0.9;
    ctx.font        = (9*sc0) + 'px "Oldenburg",serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'alphabetic';
    var dropLabel = isInvalid ? 'Hindi pwede!' : 'I-drop dito';
    ctx.fillText(dropLabel, wp0.x, wp0.y - bm.h*sc0*1.3);
    ctx.restore();
    return;
  }

  /* ── BUILD SHOP MODE (new building placement) ────────────── */
  if (gameMode !== 'build_shop' || !pendingBuildType) return;

  var wp  = state.s2w(mouseX, mouseY);
  var def = BUILDING_DEFS[pendingBuildType] || BUILDING_DEFS.house;
  var sc  = perspScale(wp.y);
  var bw  = def.w * sc;
  var bh  = def.h * sc;

  /* MAX UPGRADE FOOTPRINT (GREEN GUIDE) — NEW BUILDINGS */
  var maxW = def.w * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;
  var maxH = def.h * sc * MAX_UPGRADE_FOOTPRINT_MULTIPLIER;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#44ff88';
  ctx.fillRect(Math.round(wp.x - maxW/2), Math.round(wp.y - maxH), Math.round(maxW), Math.round(maxH));
  ctx.strokeStyle = '#44ff88';
  ctx.lineWidth = 2 / cam.zoom;
  ctx.setLineDash([8/cam.zoom, 6/cam.zoom]);
  ctx.strokeRect(Math.round(wp.x - maxW/2), Math.round(wp.y - maxH), Math.round(maxW), Math.round(maxH));
  ctx.setLineDash([]);

  /* Label */
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#44ff88';
  ctx.font = 'bold ' + (8*sc) + 'px "Oldenburg",serif';
  ctx.textAlign = 'center';
  ctx.fillText('Max Upgrade', wp.x, wp.y - maxH - 5*sc);
  ctx.restore();

  /* Zone validation check */
  var zoneOk  = true;
  var zoneMsg = '';
  if (state.canBuildInZone) {
    var zr  = state.canBuildInZone(pendingBuildType, wp.x, wp.y);
    zoneOk  = zr.ok;
    zoneMsg = zr.msg || '';
  }

  /* Current building preview */
  var strokeClr = zoneOk ? '#44ff88' : '#ff3333';
  var fillClr   = zoneOk ? 'rgba(68,255,136,0.08)' : 'rgba(255,50,50,0.22)';
  var textClr   = zoneOk ? '#44ff88' : '#ff6666';

  ctx.save();
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = strokeClr;
  ctx.lineWidth   = 2 / cam.zoom;
  ctx.setLineDash([5/cam.zoom, 4/cam.zoom]);
  ctx.strokeRect(Math.round(wp.x-bw/2), Math.round(wp.y-bh), Math.round(bw), Math.round(bh));
  ctx.fillStyle = fillClr;
  ctx.fillRect(Math.round(wp.x-bw/2), Math.round(wp.y-bh), Math.round(bw), Math.round(bh));
  ctx.setLineDash([]);

  ctx.globalAlpha  = 0.95;
  ctx.fillStyle    = textClr;
  ctx.font         = 'bold ' + (10*sc) + 'px "Oldenburg",serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(def.label, Math.round(wp.x), Math.round(wp.y - bh - 5*sc));

  if (!zoneOk && zoneMsg) {
    var fsM  = Math.max(8, 8*sc);
    ctx.font = fsM + 'px "Crimson Pro",serif';
    var msgW = ctx.measureText(zoneMsg).width;
    var py   = Math.round(wp.y + 8*sc);
    ctx.fillStyle = 'rgba(40,0,0,0.82)';
    _rrectPrev(ctx, Math.round(wp.x - msgW/2 - 7), py, msgW + 14, fsM + 8, 4);
    ctx.fill();
    ctx.fillStyle    = '#ffaaaa';
    ctx.textBaseline = 'top';
    ctx.fillText(zoneMsg, Math.round(wp.x), py + 4);
  }
  ctx.restore();
}

function _rrectPrev(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

/* ══════════════════════════════════════════════════════════════
drawTimeOverlay
══════════════════════════════════════════════════════════════ */
export function drawTimeOverlay(ctx, VW, VH, time) {
  ctx.shadowBlur = 0;
  var sm = getSunMoonState(time, VW, VH);
  if (sm.visible) {
    var glow = ctx.createRadialGradient(sm.x, sm.y, 0, sm.x, sm.y, sm.glowR);
    glow.addColorStop(0, sm.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sm.x, sm.y, sm.glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sm.color;
    ctx.beginPath();
    ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = getOverlayColor(time);
  ctx.fillRect(0, 0, VW, VH);
}

/* ══════════════════════════════════════════════════════════════
drawHUD
══════════════════════════════════════════════════════════════ */
export function drawHUD(ctx, VS, VW) {
  /* No-op — replaced by the DOM left sidebar (dashboard.js). */
}

/* ══════════════════════════════════════════════════════════════
drawZoomBadge
══════════════════════════════════════════════════════════════ */
export function drawZoomBadge(ctx, VW, VH) {
  if (cam.zoom < 1.15) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0;
  var isMobile = VW < 768;
  var bottomMargin = isMobile ? 70 : 80;
  var leftMargin = 12;
  var badgeWidth = 110;
  var badgeHeight = 28;
  var x = leftMargin;
  var y = VH - bottomMargin;
  ctx.fillStyle = 'rgba(13,8,4,0.82)';
  rrect(ctx, x, y, badgeWidth, badgeHeight, 5);
  ctx.fill();
  ctx.strokeStyle = '#8a6030';
  ctx.lineWidth   = 1;
  rrect(ctx, x, y, badgeWidth, badgeHeight, 5);
  ctx.stroke();
  ctx.fillStyle    = '#f5c842';
  ctx.font         = 'bold 14px "Oldenburg",serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔍 ' + cam.zoom.toFixed(1) + 'x', x + 10, y + badgeHeight/2);
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
drawRankBadge
══════════════════════════════════════════════════════════════ */
function drawRankBadge(ctx, VW, VH, VS) {
  if (!VS || !VS.rank) return;
  import('../ranking/rankingSystem.js').then(module => {
    const rank = module.getRankFromScore(VS.rank.score);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;
    const isMobile = VW < 768;
    const bottomMargin = isMobile ? 60 : 70;
    const x = (VW / 2) - 65;
    const y = VH - bottomMargin;
    const badgeWidth = 130;
    const badgeHeight = 28;
    ctx.fillStyle = 'rgba(26, 18, 8, 0.85)';
    ctx.strokeStyle = '#c49a4e';
    ctx.lineWidth = 1;
    rrect(ctx, x, y, badgeWidth, badgeHeight, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f5c842';
    ctx.font = 'bold 11px "Oldenburg",serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${rank.badge} ${rank.title}`, x + 8, y + badgeHeight/2);
    ctx.fillStyle = '#88dd88';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${Math.floor(VS.rank.score)} pts`, x + badgeWidth - 38, y + badgeHeight/2);
    ctx.restore();
  }).catch(err => {
    console.warn('[renderer] Failed to load ranking module:', err);
  });
}

/* ══════════════════════════════════════════════════════════════
drawMissileStatusBadge
══════════════════════════════════════════════════════════════ */
function drawMissileStatusBadge(ctx, VW, VH, VS) {
  if (!VS || !VS.missileInventory) return;
  var inv = VS.missileInventory;
  var hasMissiles = inv.basic > 0 || inv.precision > 0 || inv.ballistic > 0 || inv.mirv > 0;
  if (!hasMissiles) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowBlur = 0;
  var isMobile = VW < 768;
  var x = isMobile ? VW - 140 : VW - 160;
  var y = isMobile ? VH - 110 : VH - 100;
  var badgeW = 130;
  var badgeH = 80;
  ctx.fillStyle = 'rgba(20, 25, 40, 0.9)';
  ctx.strokeStyle = '#4a6aff';
  ctx.lineWidth = 1;
  rrect(ctx, x, y, badgeW, badgeH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4a8aff';
  ctx.font = 'bold 10px "Oldenburg",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('🚀 Missile Stock', x + badgeW/2, y + 6);
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  var items = [
    { label: 'Basic', count: inv.basic, color: '#88ccff' },
    { label: 'Precision', count: inv.precision, color: '#ffcc44' },
    { label: 'Ballistic', count: inv.ballistic, color: '#ff6644' },
    { label: 'MIRV', count: inv.mirv, color: '#ff44ff' }
  ];
  var itemY = y + 24;
  items.forEach(function(item, i) {
    if (item.count > 0) {
      ctx.fillStyle = item.color;
      ctx.fillText(item.label + ':', x + 8, itemY + i * 13);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText('×' + item.count, x + badgeW - 8, itemY + i * 13);
      ctx.textAlign = 'left';
    }
  });
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
updateBarUI
══════════════════════════════════════════════════════════════ */
export function updateBarUI(VS, dayCount) {
  var ts  = document.getElementById('barTimeStr');
  var tod = document.getElementById('barTOD');
  var d   = document.getElementById('barDayStr');
  if (ts)  ts.textContent  = getTimeStr(VS.time);
  if (tod) tod.textContent = getTimeOfDay(VS.time);
  if (d)   d.textContent   = 'Araw ' + dayCount;
}

/* ══════════════════════════════════════════════════════════════
updateBubblePositions
══════════════════════════════════════════════════════════════ */
export function updateBubblePositions(canvas, activeBubbles, VW, VH) {
  if (!canvas || !activeBubbles) return;
  var cr = canvas.getBoundingClientRect();
  activeBubbles.forEach(function(b) {
    if (!b._built) return;
    if (b.elA && b.vA) _repoBubble(b.elA, b.vA, cr, b.vB ? -1 : 0);
    if (b.elB && b.vB) _repoBubble(b.elB, b.vB, cr, 1);
  });
}

function _repoBubble(el, v, cr, side) {
  var sc  = perspScale(v.y) * (v._typeScale || 1);
  var sp  = w2s(v.x, v.y - 38 * sc);
  var elW = el.offsetWidth  || 160;
  var elH = el.offsetHeight || 50;
  var px  = cr.left + sp.x + side * 30;
  var py  = cr.top  + sp.y;
  el.style.left = Math.round(Math.max(cr.left + 4, Math.min(px - elW/2, cr.right - elW - 4))) + 'px';
  el.style.top  = Math.round(py - elH - 4) + 'px';
}

/* ══════════════════════════════════════════════════════════════
drawCalamityOverlay
══════════════════════════════════════════════════════════════ */
function drawCalamityOverlay(ctx, VW, VH, cal) {
  var t   = cal.intensity;
  var now = performance.now();
  ctx.save();
  if (cal.type === 'bagyo') {
    ctx.globalAlpha = 0.30 * t;
    ctx.fillStyle   = 'rgba(10,20,60,1)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 0.18 * t;
    var vgn = ctx.createRadialGradient(VW/2, VH/2, VH*0.3, VW/2, VH/2, VH*0.85);
    vgn.addColorStop(0, 'rgba(0,0,0,0)');
    vgn.addColorStop(1, 'rgba(0,10,40,1)');
    ctx.fillStyle = vgn;
    ctx.fillRect(0, 0, VW, VH);
    var activePct = 0.3 + t * 0.7;
    var speedMult = 0.4 + t * 0.6;
    var dt_ms     = 16;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(220,235,255,1)';
    ctx.lineCap     = 'round';
    for (var i = 0; i < _windParticles.length; i++) {
      if (i / _windParticles.length > activePct) break;
      var p = _windParticles[i];
      p.x += p.spd * speedMult * (dt_ms / 1000);
      if (p.x > 1.15) { p.x = -0.15; p.y = Math.random(); }
      p.y += 0.0002 * (i % 3 - 1);
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      var wx  = p.x * VW;
      var wy  = p.y * VH;
      var len = p.len * (0.6 + t * 0.4);
      ctx.globalAlpha = p.alpha * t * 0.8;
      ctx.lineWidth   = 0.8 + t * 0.7;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx - len, wy + len * 0.08);
      ctx.stroke();
    }
  } else if (cal.type === 'lindol') {
    var mag = t * 6;
    ctx.translate((Math.random()-0.5)*mag*2, (Math.random()-0.5)*mag*2);
    ctx.globalAlpha = 0.22 * t;
    ctx.fillStyle   = 'rgba(120,60,10,1)';
    ctx.fillRect(-10, -10, VW+20, VH+20);
  } else if (cal.type === 'tagtuyot') {
    ctx.globalAlpha = 0.20 * t;
    ctx.fillStyle   = 'rgba(200,120,0,1)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 0.12 * t;
    var shimmer = ctx.createLinearGradient(0, 0, 0, VH);
    shimmer.addColorStop(0,   'rgba(255,200,50,1)');
    shimmer.addColorStop(0.6, 'rgba(200,100,0,0.4)');
    shimmer.addColorStop(1,   'rgba(100,50,0,0)');
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = 0.06 * t * (0.7 + 0.3 * Math.sin(now / 800));
    ctx.fillStyle   = 'rgba(255,180,0,1)';
    ctx.fillRect(0, 0, VW, VH);
  } else if (cal.type === 'implasyon' || cal.type === 'welga') {
    ctx.globalAlpha = 0.14 * t;
    ctx.fillStyle   = 'rgba(100,20,20,1)';
    ctx.fillRect(0, 0, VW, VH);
  } else if (cal.type === 'protesta' || cal.type === 'iskandalo') {
    ctx.globalAlpha = 0.12 * t;
    ctx.fillStyle   = 'rgba(60,20,80,1)';
    ctx.fillRect(0, 0, VW, VH);
  } else {
    ctx.globalAlpha = 0.12 * t;
    ctx.fillStyle   = 'rgba(40,40,40,1)';
    ctx.fillRect(0, 0, VW, VH);
  }
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════════
Canvas helpers
══════════════════════════════════════════════════════════════ */
export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);         ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x + w, y + h - r);     ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x + r, y + h);         ctx.arcTo(x,   y+h, x,   y+h-r, r);
  ctx.lineTo(x, y + r);             ctx.arcTo(x,   y,   x+r, y,     r);
  ctx.closePath();
}