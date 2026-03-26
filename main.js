import { ZONE_DEFS, getZoneAt, isZoneUnlocked, purchaseZone, drawZoneGrid, canBuildInZone, getZoneProductionMult } from './world/zones.js';
import { clamp, dist, randRange, randInt } from './utils/perspective.js';
import { advanceTime, getTimeStr, getTimeOfDay, setTimeSpeed } from './utils/time.js';
import { saveGame, loadGame, updateAutoSave } from './utils/storage.js';
import { preloadAll as preloadSprites } from './utils/sprites.js';

import { ResourceNode, createDefaultResourceNodes, tickFoodPool } from './resources/resource.js';
import { tickEconomy, onNewDay as economyOnNewDay, setTaxRate, getTaxRate } from './resources/economy.js';
import { tickTrade } from './resources/trade.js';
import { Building, createDefaultBuildings, rebuildFromSave, BUILDING_DEFS, getMainHallLevel, getMainHallRules, canPlaceBuilding, getShopCatalogue, recalcResourceCaps } from './buildings/building.js';
import { applyQualityEffect } from './buildings/buildingUpgrade.js';
import { getRepairCost } from './buildings/wreckBuildings.js';

import { VILLAGER_TYPES, TRAINING_MAP, createVillager, updateVillager, rebuildVillagersFromSave, chooseNextWaypoint, assignHomes, assignWork, getBedtime, updateNightBehaviour, updateReproduction, updateGrowth, updateTraining, startTraining, tickQuips } from './villagers/villager.js';
import { checkVillagerInteractions, triggerPlayerGreeting, triggerBirthAnnouncement, triggerProtestGathering } from './villagers/aiInteraction.js';
import { tickNeeds, clearResolvedRequests, checkAndEmit } from './villagers/citizenNeeds.js';
import { tickPolitics, updateLeaders } from './villagers/politics.js';

import { cam, initCamera, camRecentre, updateCamera, zoomTo, zoomOut, softPan, WORLD_W, WORLD_H, expandWorld } from './render/camera.js';
import { renderFrame } from './render/renderer.js';

import { initInput, getDragState, getMousePos } from './input/input.js';

import { initDrawer, openDrawer, closeDrawer, renderDrawer, isDrawerVisible, getDrawerTarget, getDrawerKind, isMovingBuilding } from './ui/drawer.js';
import { initToasts, showMsg } from './ui/notifToast.js';
import { initDashboard, updateDashboard } from './ui/dashboard.js';
import { initRequestPanel, refreshRequests } from './ui/requestPanel.js';
import { initExpansionPanel, openExpansionPanel } from './ui/expansionPanel.js';
import { initTradePanel, refreshTradePanel } from './ui/tradePanel.js';

import { tickCorruption } from './government/corruption.js';
import { applyPolicies, getPolicyState, activatePolicy, deactivatePolicy } from './government/policy.js';
import { tickElection, getElectionState } from './government/election.js';
import { tickEvents, setEventDayCount, getActiveCalamity } from './government/events.js';
import { initPersonalFinance, serializePersonalFinance, resetPersonalFinance } from './government/personalFinance.js';

var canvas, ctx;
var VW = 0, VH = 0;
var BAR_H = 0;

var gameMode = 'view';
var dayCount = 1;
var activeBubbles = [];
var _bedtimes = {};
var _lastNightSetup = -1;
var _pendingBuildType = null;
var _reqRefreshTimer = 0;
var _initialized = false;

var BASE_RES_CAP = { gold: 2000, rice: 1500, langis: 800 };

var VS = {
  villagers: [],
  buildings: [],
  resourceNodes: [],
  waypoints: { all: [], mines: [], buildings: [] },
  res: { gold: 800, rice: 500, langis: 20 },
  resCap: { gold: 2000, rice: 1500, langis: 800 },
  pop: { cur: 0, max: 30 },
  time: 12,
  corruption: null,
  policies: null,
  election: null,
  events: null,
  needs: null,
  politics: null,
  trade: null,
  economy: null,
  unlockedZones: [],
  food: { pool: 200, consumption: 0, buffer: 0 },
};

var _drawer = {
  get visible() { return isDrawerVisible(); },
  get kind() { return getDrawerKind(); },
  get target() { return getDrawerTarget(); },
  get movingBuilding() { return isMovingBuilding(); },
};

function updateCenterTimeDisplay() {
  var timeStr = getTimeStr(VS.time);
  if (window.updateCenterTime) {
    window.updateCenterTime(timeStr, 'Araw ' + dayCount);
  }
}

var lastTime = 0;
var accumulator = 0;
var TICK = 1 / 60;

function gameLoop(ts) {
  var dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;
  accumulator += dt;

  while (accumulator >= TICK) {
    update(TICK);
    accumulator -= TICK;
  }

  updateCamera(dt);
  window._camZoom = cam.zoom;

  var _cal = getActiveCalamity(VS);
  var _shakeX = 0, _shakeY = 0;
  if (_cal && _cal.type === 'lindol') {
    var _mag = _cal.intensity * 5;
    _shakeX = (Math.random() - 0.5) * _mag * 2;
    _shakeY = (Math.random() - 0.5) * _mag * 2;
  }

  renderFrame(canvas, ctx, {
    VS: VS,
    VW: VW,
    VH: VH,
    dayCount: dayCount,
    shakeX: _shakeX,
    shakeY: _shakeY,
    drawZoneGrid: function(ctx, vw, vh, vs) { drawZoneGrid(ctx, WORLD_W, WORLD_H, vs); },
    canBuildInZone: function(bldType, wx, wy) { return canBuildInZone(bldType, wx, wy, WORLD_W, WORLD_H, VS); },
    gameMode: gameMode,
    pendingBuildType: _pendingBuildType,
    activeBubbles: activeBubbles,
    drag: getDragState(),
    drawer: _drawer,
    mouseX: getMousePos().x,
    mouseY: getMousePos().y,
    BUILDING_DEFS: BUILDING_DEFS,
    s2w: function(sx, sy) {
      return { x: (sx - VW / 2) / cam.zoom + cam.x, y: (sy - VH / 2) / cam.zoom + cam.y };
    },
  });

  updateDashboard(VS, dayCount);
  updateCenterTimeDisplay();
  _updateElectionBar();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  var prevH = Math.floor(VS.time);
  VS.time = advanceTime(dt, VS.time);
  if (Math.floor(VS.time) < prevH) { dayCount++; _onNewDay(); }

  if (VS.time >= 18.0 && _lastNightSetup !== dayCount) {
    _lastNightSetup = dayCount;
    _bedtimes = {};
    VS.villagers.forEach(function(v) { _bedtimes[v.id] = getBedtime(v); });
    assignHomes(VS.villagers, VS.buildings);
  }

  for (var i = 0; i < VS.villagers.length; i++) {
    var v = VS.villagers[i];
    if (_drawer.visible && _drawer.kind === 'villager' && _drawer.target === v) continue;
    var bed = _bedtimes[v.id] !== undefined ? _bedtimes[v.id] : Infinity;
    var nr = updateNightBehaviour(v, VS.time, bed);
    if (nr === 'home') continue;
    if (nr === 'wake') {
      v.isInsideWork = false;
      if (v.homeBuilding) {
        v.x = v.homeBuilding.x + randRange(-18, 18);
        v.y = v.homeBuilding.y + 14;
      }
      v.workTimer = randRange(10, 40);
      v.waitT = randRange(1, 3);
      continue;
    }
    updateVillager(v, dt, VS.waypoints);
  }

  var _mhSnap = {};
  for (var _si = 0; _si < VS.buildings.length; _si++) {
    var _sb = VS.buildings[_si];
    if (_sb.type === 'mainHall') {
      _mhSnap[_sb.id || 'mh0'] = { wasBuilding: !!_sb.underConstruction, level: _sb.level };
    }
  }

  for (var b = 0; b < VS.buildings.length; b++) VS.buildings[b].update(dt, VS);
  for (var r = 0; r < VS.resourceNodes.length; r++) VS.resourceNodes[r].update(dt);

  for (var _pi = 0; _pi < VS.buildings.length; _pi++) {
    var _pb = VS.buildings[_pi];
    if (_pb.type !== 'mainHall') continue;
    var _pk = _pb.id || 'mh0';
    var _pre = _mhSnap[_pk];
    if (_pre && _pre.wasBuilding && !_pb.underConstruction) {
      if (window.onHallUpgradeComplete) window.onHallUpgradeComplete(_pb.level);
    }
  }

  updateReproduction(VS.villagers, dt, VS, _spawnFromParents);
  updateGrowth(VS.villagers, dt, VS, showMsg);
  updateTraining(VS.villagers, dt);

  checkVillagerInteractions(VS.villagers, dt, VS.time, activeBubbles, VS);
  activeBubbles = activeBubbles.filter(function(bub) { return bub.update(dt); });

  tickQuips(dt, VS.villagers, VS);

  VS.pop.cur = VS.villagers.length;
  _recalcCaps();

  tickFoodPool(dt, VS);
  tickEconomy(dt, VS);
  tickTrade(dt, VS, showMsg);

  tickNeeds(dt, VS);
  tickPolitics(dt, VS, showMsg);

  VS.buildings.forEach(function(b) {
    if (b.upgradePath === 'quality') applyQualityEffect(b, VS.villagers, dt, 120);
  });

  tickCorruption(dt, VS);
  applyPolicies(dt, VS);
  tickElection(dt, VS, showMsg);
  
  var _evLogLenBefore = (VS.events && VS.events.log) ? VS.events.log.length : 0;
  tickEvents(dt, VS, showMsg);
  if (VS.events && VS.events.log && VS.events.log.length > _evLogLenBefore) {
    var _newEv = VS.events.log[0];
    if (_newEv && _newEv.detail && _newEv.detail.affectedBuildings && _newEv.detail.affectedBuildings.length > 0 && window.showEventModal) {
      (function(ev) {
        setTimeout(function() { window.showEventModal(ev); }, 800);
      })(_newEv);
    }
  }

  clearResolvedRequests(VS);
  updateAutoSave(dt, VS, dayCount);

  _reqRefreshTimer -= dt;
  if (_reqRefreshTimer <= 0) {
    _reqRefreshTimer = 1.0;
    refreshRequests(VS);
    checkAndEmit(VS);
    refreshTradePanel(VS);
  }
}

function _recalcCaps() {
  var caps = recalcResourceCaps(VS.buildings, BASE_RES_CAP);
  VS.resCap.gold = caps.gold;
  VS.resCap.rice = caps.rice;
  VS.resCap.langis = caps.langis;
  var maxPop = 30;
  VS.buildings.forEach(function(b) { maxPop += b.getStats().populationMax || 0; });
  VS.pop.max = maxPop;
}

function _onNewDay() {
  if (VS.villagers.length < VS.pop.max && Math.random() < 0.4) _spawnVillager(randInt(0, 9), true);
  assignHomes(VS.villagers, VS.buildings);
  assignWork(VS.villagers, VS.buildings);
  updateLeaders(VS);
  economyOnNewDay(VS, showMsg);
  setEventDayCount(dayCount, VS);
}

export function notifyHallUpgrade(newLevel, BUILDING_DEFS, showMsgFn, showUnlockFn) {
  var newlyUnlocked = Object.keys(BUILDING_DEFS).filter(function(k) {
    var def = BUILDING_DEFS[k];
    return def.minHallLevel === newLevel && def.shopCost;
  });
  if (newlyUnlocked.length === 0) return;
  if (showUnlockFn) showUnlockFn(newlyUnlocked, newLevel, BUILDING_DEFS);
}

function _spawnVillager(typeIdx, silent) {
  if (VS.villagers.length >= VS.pop.max) { if (!silent) showMsg('Puno na ang nayon!'); return; }
  var v = createVillager(typeIdx !== undefined ? typeIdx : randInt(0, 9));
  VS.villagers.push(v);
  if (!silent) showMsg((VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0]).role + ' ' + v.label + ' ay dumating!');
}

function _spawnFromParents(typeIdx, x, y, pA, pB) {
  if (VS.villagers.length >= VS.pop.max) return;
  var v = createVillager(typeIdx, x, y, pA, pB);
  VS.villagers.push(v);
  assignHomes(VS.villagers, VS.buildings);
  showMsg('Ipinanganak si ' + v.label + '! (' + pA.label + ' & ' + pB.label + ')');
  triggerBirthAnnouncement(v, pA, pB, activeBubbles);
}

export function initWaypoints() {
  VS.waypoints.all = [];
  VS.waypoints.mines = [];
  VS.waypoints.buildings = [];
  for (var gy = 0.12; gy <= 0.88; gy += 0.13) {
    for (var gx = 0.08; gx <= 0.92; gx += 0.10) {
      VS.waypoints.all.push({ wx: WORLD_W * gx, wy: WORLD_H * gy });
    }
  }
  VS.resourceNodes.forEach(function(n) {
    VS.waypoints.mines.push({ wx: n.x, wy: n.y });
    VS.waypoints.all.push({ wx: n.x, wy: n.y });
  });
  VS.buildings.forEach(function(b) {
    VS.waypoints.buildings.push({ wx: b.x, wy: b.y + 22 });
    VS.waypoints.all.push({ wx: b.x, wy: b.y + 22 });
  });
}

function _updateElectionBar() {
  var block = document.getElementById('bar-election-block');
  var timerEl = document.getElementById('barElectionTimer');
  var approvalEl = document.getElementById('barElectionApproval');
  if (!block || !timerEl) return;

  var est = getElectionState(VS);
  var secs = est.secondsLeft;
  var mins = Math.floor(secs / 60);
  var ss = Math.floor(secs % 60);

  block.style.display = 'flex';

  if (est.terminated) {
    timerEl.textContent = 'TAPOS';
    timerEl.style.color = '#e74c3c';
  } else if (est.electionPending) {
    timerEl.textContent = 'ELEKSYON!';
    timerEl.style.color = '#f5c842';
  } else {
    timerEl.textContent = mins + ':' + (ss < 10 ? '0' : '') + ss;
    timerEl.style.color = secs < 60 ? '#e74c3c' : secs < 180 ? '#e67e22' : '#8a7050';
  }

  if (approvalEl) {
    var pct = Math.round((est.liveApproval || 0) * 100);
    approvalEl.textContent = pct + '%';
    approvalEl.style.color = pct >= 60 ? '#44aa44' : pct >= 51 ? '#f5c842' : '#e74c3c';
    approvalEl.title = est.liveBreakdown
      ? 'Tiwala:' + est.liveBreakdown.trust + ' Kasiyahan:' + est.liveBreakdown.happy + ' Pagkain:' + est.liveBreakdown.food + ' Trabaho:' + est.liveBreakdown.employ + '%'
      : '';
  }
}

window.spawnVillager = function() { _spawnVillager(undefined, false); };
window.showMsg = showMsg;
window._VS = VS;

window.setMode = function(m) { gameMode = m; canvas.className = 'mode-' + m; };

window.setSpeed = function(s) {
  setTimeSpeed(s);
  document.querySelectorAll('.speed-btn').forEach(function(b) { b.classList.remove('active'); });
  var el = document.getElementById('spd' + s);
  if (el) el.classList.add('active');
  showMsg('Bilis: ' + s + 'x');
};

window.openShop = function() { openDrawer(null, '_shop'); };
window.softPan = function(wx, wy, dur) { softPan(wx, wy, dur); };
window.triggerProtest = function() { triggerProtestGathering(VS, activeBubbles); };
window.openExpand = openExpansionPanel;
window.purchaseZone = function(key) {
  var r = purchaseZone(key, VS, showMsg, WORLD_W, WORLD_H);
  if (!r.ok) showMsg(r.msg);
};
window._getRepairCost = getRepairCost;
window.ZONE_DEFS = ZONE_DEFS;
window.isZoneUnlocked = function(key) { return isZoneUnlocked(key, VS); };

window.getPolicyState = function() { return getPolicyState(VS); };
window.activatePolicy = function(key) {
  var r = activatePolicy(key, VS, showMsg);
  showMsg(r.msg);
  if (r.ok && window.openSidePanel) window.openSidePanel('policy');
};
window.deactivatePolicy = function(key) {
  var r = deactivatePolicy(key, VS, showMsg);
  showMsg(r.msg);
  if (window.openSidePanel) window.openSidePanel('policy');
};

window.setTaxRate = function(rate) { setTaxRate(rate, VS, showMsg); };
window.getTaxRate = function() { return getTaxRate(VS); };

window.triggerSave = function() {
  var _pf = serializePersonalFinance();
  showMsg(saveGame(VS, dayCount, null, _pf) ? 'Naligtas! Araw ' + dayCount : 'Save error.');
};

window.triggerLoad = function() {
  var s = loadGame();
  if (!s) { showMsg('Walang na-save.'); return; }
  closeDrawer();
  VS.res = s.res || VS.res;
  VS.resCap = s.resCap || VS.resCap;
  VS.pop = s.pop || VS.pop;
  VS.time = s.time !== undefined ? s.time : VS.time;
  dayCount = s.dayCount || 1;
  VS.unlockedZones = s.unlockedZones || [];
  if (s.corruption) VS.corruption = s.corruption;
  if (s.policies) VS.policies = s.policies;
  if (s.election) VS.election = s.election;
  if (s.food) VS.food = s.food;
  if (s.villagers && s.villagers.length) VS.villagers = rebuildVillagersFromSave(s.villagers);
  if (s.buildings && s.buildings.length) VS.buildings = rebuildFromSave(s.buildings);
  if (s.resourceNodes && s.resourceNodes.length) {
    VS.resourceNodes = s.resourceNodes.map(function(d) {
      var n = new ResourceNode(d.type, d.x, d.y);
      n.id = d.id;
      n.amount = d.amount !== undefined ? d.amount : n.capacity;
      return n;
    });
  }
  initWaypoints();
  assignHomes(VS.villagers, VS.buildings);
  assignWork(VS.villagers, VS.buildings);
  _recalcCaps();
  if (s.playerGold !== undefined) {
    initPersonalFinance({
      VS: VS,
      showMsg: showMsg,
      savedPlayerGold: s.playerGold || 0,
      savedPlayerRice: s.playerRice || 0,
      savedCorruptionHistory: s.corruptionHistory || [],
    });
  }
  showMsg('Na-load! Araw ' + dayCount);
};

function updateCanvasSizeForDevice() {
  if (!canvas) return;
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
}

function adjustContainerLayout() {
  const container = document.getElementById('canvas-container');
  if (!container || !canvas) return;

  canvas.width = WORLD_W;
  canvas.height = WORLD_H;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const fits = WORLD_W <= containerWidth && WORLD_H <= containerHeight;

  if (fits) {
    // Desktop: canvas fits, scale to fill container
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'cover';
  } else {
    // Mobile: canvas larger, center it, allow panning via camera
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    canvas.style.width = WORLD_W + 'px';
    canvas.style.height = WORLD_H + 'px';
    canvas.style.objectFit = 'fill';
  }
  // Ensure camera starts centered
  camRecentre();
}

function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  
  VW = canvas.width;
  VH = canvas.height;
  
  window._VW = VW;
  window._VH = VH;

  initCamera(VW, VH);
  camRecentre();

  const container = document.getElementById('canvas-container');
  if (container) {
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    adjustContainerLayout();
  }
  
  window.addEventListener('resize', () => {
    adjustContainerLayout();
  });
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => adjustContainerLayout(), 100);
  });
  
  setTimeout(adjustContainerLayout, 100);
  setTimeout(adjustContainerLayout, 300);
  setTimeout(adjustContainerLayout, 1000);

  VS.resourceNodes = createDefaultResourceNodes(WORLD_W, WORLD_H);
  VS.buildings = createDefaultBuildings(WORLD_W, WORLD_H);
  VS.getZoneMult = function(res, wx, wy) { return getZoneProductionMult(res, wx, wy, WORLD_W, WORLD_H, VS); };
  initWaypoints();
  _recalcCaps();
  preloadSprites();

  for (var i = 0; i < 10; i++) _spawnVillager(randInt(0, 9), true);
  assignHomes(VS.villagers, VS.buildings);
  assignWork(VS.villagers, VS.buildings);

  initToasts();
  initDashboard();

  initPersonalFinance({
    VS: VS,
    showMsg: showMsg,
    savedPlayerGold: window._savedPlayerGold || 0,
    savedPlayerRice: window._savedPlayerRice || 0,
    savedCorruptionHistory: window._savedCorruptionHistory || [],
  });
  window._savedPlayerGold = undefined;
  window._savedPlayerRice = undefined;
  window._savedCorruptionHistory = undefined;

  initDrawer({
    VS: VS,
    BUILDING_DEFS: BUILDING_DEFS,
    VILLAGER_TYPES: VILLAGER_TYPES,
    TRAINING_MAP: TRAINING_MAP,
    getMainHallRules: getMainHallRules,
    getMainHallLevel: getMainHallLevel,
    canPlaceBuilding: function(k, blds, wx, wy) {
      var r = canPlaceBuilding(k, blds, VS.unlockedZones);
      if (!r.ok) return r;
      if (wx !== undefined && wy !== undefined) {
        var zr = canBuildInZone(k, wx, wy, WORLD_W, WORLD_H, VS);
        if (!zr.ok) return zr;
      }
      return r;
    },
    getShopCatalogue: function(blds) { return getShopCatalogue(blds, VS.unlockedZones); },
    startTraining: startTraining,
    assignHomes: assignHomes,
    initWaypoints: initWaypoints,
    recalcCaps: _recalcCaps,
    triggerPlayerGreeting: triggerPlayerGreeting,
    activeBubbles: activeBubbles,
    showMsg: showMsg,
    zoomTo: function(wx, wy, follow) { zoomTo(wx, wy, follow, showMsg); },
    dayCount: function() { return dayCount; },
    zoomOut: zoomOut,
    softPan: softPan,
    setGameMode: function(m) { gameMode = m; },
    setPendingBuildType: function(t) { _pendingBuildType = t; },
  });

  initRequestPanel({ VS: VS, showMsg: showMsg });
  initTradePanel({ VS: VS, showMsg: showMsg });

  initExpansionPanel({
    VS: VS,
    showMsg: showMsg,
    onExpand: function(key, def) {
      if (def.canvasExpand) {
        if (def.canvasExpand.w) expandWorld(def.canvasExpand.w, 0);
        if (def.canvasExpand.h) expandWorld(0, def.canvasExpand.h);
        
        updateCanvasSizeForDevice();
        VW = canvas.width;
        VH = canvas.height;
        
        initCamera(VW, VH);
        camRecentre();
        initWaypoints();
        
        setTimeout(() => adjustContainerLayout(), 100);
        
        showMsg('Lumawak ang nayon!');
      }
    },
  });

  initInput(canvas, {
    VS: VS,
    getGameMode: () => gameMode,
    setGameMode: (m) => { gameMode = m; },
    getPendingBuildType: () => _pendingBuildType,
    setPendingBuildType: (t) => { _pendingBuildType = t; },
    getDrawer: () => _drawer,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    initWaypoints: initWaypoints,
    assignHomes: assignHomes,
    assignWork: assignWork,
    recalcCaps: _recalcCaps,
    VILLAGER_TYPES: VILLAGER_TYPES,
    BUILDING_DEFS: BUILDING_DEFS,
    Building: Building,
    canPlaceBuilding: function(k, blds, wx, wy) {
      var r = canPlaceBuilding(k, blds, VS.unlockedZones);
      if (!r.ok) return r;
      if (wx !== undefined && wy !== undefined) {
        var zr = canBuildInZone(k, wx, wy, WORLD_W, WORLD_H, VS);
        if (!zr.ok) return zr;
      }
      return r;
    },
    showMsg: showMsg,
    renderDrawer: renderDrawer,
  });

  renderFrame(canvas, ctx, {
    VS: VS, VW: VW, VH: VH, dayCount: dayCount,
    gameMode: gameMode, pendingBuildType: _pendingBuildType,
    activeBubbles: activeBubbles, drag: getDragState(),
    drawer: _drawer, BUILDING_DEFS: BUILDING_DEFS,
    drawZoneGrid: function(ctx, vw, vh, vs) { drawZoneGrid(ctx, WORLD_W, WORLD_H, vs); },
    canBuildInZone: function(bldType, wx, wy) { return canBuildInZone(bldType, wx, wy, WORLD_W, WORLD_H, VS); },
    s2w: function(sx, sy) {
      return { x: (sx - VW / 2) / cam.zoom + cam.x, y: (sy - VH / 2) / cam.zoom + cam.y };
    },
  });

  lastTime = performance.now();
  _initialized = true;
  requestAnimationFrame(gameLoop);

  /* ── Sound Manager ─────────────────────────────────────── */
  (function _initSoundManager() {
    var _activeSounds = {};   /* id → HTMLAudioElement */
    var _bgmState     = null; /* 'day' | 'night' */

    window.playSound = function(id, opts) {
      var el = document.getElementById(id);
      if (!el) return;
      opts = opts || {};
      try {
        el.currentTime = 0;
        el.loop        = !!opts.loop;
        el.volume      = opts.volume !== undefined ? opts.volume : 1.0;
        el.play().catch(function() {});
        _activeSounds[id] = el;
      } catch (e) {}
    };

    window.stopSound = function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      try { el.pause(); el.currentTime = 0; } catch (e) {}
      delete _activeSounds[id];
    };

    window.stopAllCalamitySounds = function() {
      ['sfx-calamity-bagyo','sfx-calamity-lindol','sfx-calamity-tagtuyot'].forEach(window.stopSound);
    };

    /* Day/Night BGM crossfade */
    var _BGM_FADE_STEP = 0.02;
    var _bgmFadeTimer  = 0;
    var _bgmCheckInterval = setInterval(function() {
      if (!_initialized) return;
      var hour    = VS.time;
      var isNight = (hour >= 20 || hour < 6);
      var target  = isNight ? 'bgm-night' : 'bgm-day';
      var fade    = isNight ? 'bgm-day'   : 'bgm-night';

      if (_bgmState !== target) {
        _bgmState = target;
        /* Fade out current BGM */
        var fadeEl = document.getElementById(fade);
        if (fadeEl && !fadeEl.paused) {
          var _fadeOut = setInterval(function() {
            if (!fadeEl || fadeEl.volume <= _BGM_FADE_STEP) {
              clearInterval(_fadeOut);
              try { fadeEl.pause(); fadeEl.currentTime = 0; fadeEl.volume = 1; } catch(e) {}
            } else {
              fadeEl.volume = Math.max(0, fadeEl.volume - _BGM_FADE_STEP);
            }
          }, 80);
        }
        /* Fade in new BGM */
        var targetEl = document.getElementById(target);
        if (targetEl) {
          try {
            targetEl.volume = 0;
            targetEl.loop   = true;
            targetEl.currentTime = 0;
            targetEl.play().catch(function() {});
            var _fadeIn = setInterval(function() {
              if (!targetEl || targetEl.volume >= 1 - _BGM_FADE_STEP) {
                clearInterval(_fadeIn);
                try { targetEl.volume = 1; } catch(e) {}
              } else {
                targetEl.volume = Math.min(1, targetEl.volume + _BGM_FADE_STEP);
              }
            }, 80);
          } catch(e) {}
        }
      }
    }, 5000);   /* check every 5 real seconds */
  })();
  /* ── End Sound Manager ─────────────────────────────────── */

  showMsg('Maligayang pagdating! I-click ang Tindahan para bumili ng gusali.');
}

document.addEventListener('DOMContentLoaded', function() {
  var gameWrap = document.getElementById('game-wrap');
  if (!gameWrap) { console.error('[main] Missing #game-wrap'); return; }

  function _start(loadSave) {
    gameWrap.classList.add('visible');
    requestAnimationFrame(function() {
      init();
      if (loadSave) setTimeout(function() { window.triggerLoad(); }, 120);
    });
  }

  window._minibayanInit = _start;
  if (window._minibayanAutoLoad !== undefined) {
    _start(window._minibayanAutoLoad);
    window._minibayanAutoLoad = undefined;
  }
  if (window.loadDefaultGameSettings) {
  window.loadDefaultGameSettings();
}
});