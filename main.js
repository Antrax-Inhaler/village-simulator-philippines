/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — main.js  (with Missile Warfare System)
   Version 7 - Added Missile Warfare, Scout System, War State
═══════════════════════════════════════════════════════════════ */

import { ZONE_DEFS, getZoneAt, isZoneUnlocked, purchaseZone, drawZoneGrid, canBuildInZone, getZoneProductionMult } from './world/zones.js';
import { clamp, dist, randRange, randInt } from './utils/perspective.js';
import { advanceTime, getTimeStr, getTimeOfDay, setTimeSpeed } from './utils/time.js';
import { saveGame, loadGame, updateAutoSave } from './utils/storage.js';
import { preloadAll as preloadSprites } from './utils/sprites.js';
import { getAverageHappiness, getWasteTotal, getResourcePercent, canAfford, deductCost, formatResourceNumber } from './utils/economyHelpers.js';
import { formatTime, formatTimeLong, getColorByPercent, truncateText, capitalizeFirst, getStarRating, createElementWithClass, setElementText, showElement } from './utils/uiHelpers.js';

import { ResourceNode, createDefaultResourceNodes, tickFoodConsumption } from './resources/resource.js';
import { 
  tickEconomy, onNewDay as economyOnNewDay, setTaxRate, getTaxRate,
  initDebt, takeLoan, makeDebtPayment, getDebtSummary, getMaxLoanAmount, getInterestRate,
  deductMissileCost, useMissileFromInventory, calculateWarLoot, applyWarLoot, applySpamPenalty,
  getMissileInventorySummary, canAffordMissileLaunch, getMissileTypeInfo, MISSILE_COSTS
} from './resources/economy.js';
import { tickTrade } from './resources/trade.js';
import { Building, createDefaultBuildings, rebuildFromSave, BUILDING_DEFS, getMainHallLevel, getMainHallRules, canPlaceBuilding, getShopCatalogue, recalcResourceCaps } from './buildings/building.js';
import { applyQualityEffect } from './buildings/buildingUpgrade.js';
import { getRepairCost } from './buildings/wreckBuildings.js';

import { VILLAGER_TYPES, TRAINING_MAP, createVillager, updateVillager, rebuildVillagersFromSave, chooseNextWaypoint, assignHomes, assignWork, getBedtime, updateNightBehaviour, updateReproduction, updateGrowth, updateTraining, startTraining, tickQuips } from './villagers/villager.js';
import { checkVillagerInteractions, triggerPlayerGreeting, triggerBirthAnnouncement, triggerProtestGathering } from './villagers/aiInteraction.js';
import { tickNeeds, clearResolvedRequests, checkAndEmit } from './villagers/citizenNeeds.js';
import { tickPolitics, updateLeaders } from './villagers/politics.js';

import { cam, initCamera, camRecentre, updateCamera, zoomTo, zoomOut, softPan, WORLD_W, WORLD_H, expandWorld } from './render/camera.js';
import { renderFrame, addMissileLaunch, addMissileImpact, clearMissileEffects } from './render/renderer.js';

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
import { openRankModal } from './ui/rankModal.js';

import { RANKS, getRankFromScore, getNextRank, calculateDailyScore, showRankUpBanner } from './ranking/rankingSystem.js';
import { showDayCount, showDailyReport } from './ui/dailyReport.js';

/* ═══════════════════════════════════════════════════════════════
   MISSILE WARFARE IMPORTS
══════════════════════════════════════════════════════════════ */
import {
  cancelMissile,
  processOfflineImpacts,
  getMissileTrackingData,
  canAttackTarget,
  recordAttackMade,
} from './attack/missileWarfare.js';

import {
  initMissilePanel,
} from './ui/missilePanel.js';

import {
  initScoutPanel,
} from './ui/scoutPanel.js';

/* ── SOUND TOGGLE ─────────────────────────────────────────── */
var SOUNDS_ENABLED = true;

function _playSound(id, opts) {
  if (!SOUNDS_ENABLED) return;
  if (typeof window.playSound === 'function') window.playSound(id, opts);
}

var canvas, ctx;
var VW = 0, VH = 0;
var gameMode = 'view';
var dayCount = 1;
var activeBubbles = [];
var _bedtimes = {};
var _lastNightSetup = -1;
var _pendingBuildType = null;
var _reqRefreshTimer = 0;
var _initialized = false;

var BASE_RES_CAP = { gold: 2000, rice: 1500, langis: 800 };

/* ═══════════════════════════════════════════════════════════════
   GAME STATE with Missile Warfare additions (Version 7)
═══════════════════════════════════════════════════════════════ */
var VS = {
  villagers: [],
  buildings: [],
  resourceNodes: [],
  waypoints: { all: [], mines: [], buildings: [] },
  res: { gold: 800, rice: 500, langis: 1000 },
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
  debt: null,
  rank: {
    score: 0,
    history: [],
    lastRankId: 1,
    previousDayStats: null
  },
  // Missile Warfare System (NEW v7)
  missiles: {
    outgoing: [],    // Active outgoing missiles
    incoming: [],    // Active incoming missiles (simulated attacks)
    history: []      // Last 50 missile events
  },
  warState: {
    attacksMade: [],           // Track attacks for spam detection
    attacksReceived: [],       // Track received attacks
    lastAttackTime: 0,         // Timestamp of last attack made
    lastRetaliationTime: 0,    // Timestamp of last retaliation
    trustPenalties: 0,         // Accumulated trust penalties
    rankPenalties: 0,          // Accumulated rank penalties
    dailyAttackCount: 0,       // Attacks made today
    dailyAttackReset: 0,       // Day when daily count resets
    weeklyAttacks: [],         // Attacks this week for weekly limit
    lastLoginTime: Date.now()  // For offline protection
  },
  missileInventory: {          // Player's missile stock
    basic: 0,
    precision: 0,
    ballistic: 0,
    mirv: 0,
    interceptor: 0
  },
  scoutHistory: []             // Scanned enemy coordinates
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
  if (Math.floor(VS.time) < prevH) { 
    dayCount++; 
    _onNewDay();
    _calculateDailyRankScore();
  }

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

  tickFoodConsumption(dt, VS);
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

/* ═══════════════════════════════════════════════════════════════
   Daily Rank Score Calculation
═══════════════════════════════════════════════════════════════ */
function _calculateDailyRankScore() {
  if (!VS.rank.previousDayStats) {
    VS.rank.previousDayStats = {
      avgApproval: getAverageHappiness(VS.villagers),
      population: VS.villagers.length,
      employed: VS.villagers.filter(v => v.workBuilding).length,
      buildings: VS.buildings.filter(b => !b.underConstruction).length,
      totalLevels: VS.buildings.reduce((sum, b) => sum + (b.level || 1), 0),
      tradeProfit: VS.trade?.todayProfit || 0,
      corruption: VS.corruption?.exposureLevel || 0,
      waste: getWasteTotal(VS.res, VS.resCap),
      resolvedEvents: VS.events?.resolvedToday || 0,
      damagedBuildings: VS.events?.damagedBuildingsToday || 0
    };
    return;
  }
  
  const result = calculateDailyScore(VS, VS.rank.previousDayStats);
  const previousScore = VS.rank.score;
  const newScore = previousScore + result.dailyScore;
  const oldRank = getRankFromScore(previousScore);
  const newRank = getRankFromScore(Math.max(0, newScore));
  
  VS.rank.score = Math.max(0, newScore);
  
  VS.rank.history.unshift({
    day: dayCount,
    score: result.dailyScore,
    total: VS.rank.score,
    breakdown: result.breakdown
  });
  if (VS.rank.history.length > 30) VS.rank.history.pop();
  
  showDayCount(dayCount).then(() => {
    return showDailyReport(VS, dayCount, result, previousScore, VS.rank.score, oldRank, getNextRank(VS.rank.score));
  }).then(() => {
    if (newRank.id > oldRank.id) {
      VS.rank.lastRankId = newRank.id;
      showRankUpBanner(oldRank, newRank);
      _onRankUp(newRank, oldRank);
    }
  }).catch(err => {
    console.error('Error showing daily report:', err);
  });
  
  VS.rank.previousDayStats = result.newStats;
}

function _onRankUp(newRank, oldRank) {
  if (newRank.bonus > 0) {
    VS.villagers.forEach(v => {
      v.happiness = Math.min(100, (v.happiness || 50) + newRank.bonus);
    });
    showMsg(`🎉 Rank up! +${newRank.bonus}% approval bonus!`);
  }
  
  if (newRank.id >= 3 && !window._unlockedBuildingTypes?.includes('palengke')) {
    if (!window._unlockedBuildingTypes) window._unlockedBuildingTypes = [];
    window._unlockedBuildingTypes.push('palengke');
    showMsg('🏪 Bagong gusali: Palengke!');
  }
  if (newRank.id >= 4 && !window._unlockedBuildingTypes?.includes('school')) {
    window._unlockedBuildingTypes.push('school');
    showMsg('📚 Bagong gusali: Paaralan!');
  }
  if (newRank.id >= 5 && !window._unlockedBuildingTypes?.includes('hospital')) {
    window._unlockedBuildingTypes.push('hospital');
    showMsg('🏥 Bagong gusali: Ospital!');
  }
  
  _playSound('sfx-unlock');
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
  
  // Update war state for new day (spam protection resets)
  if (VS.warState) {
    if (VS.warState.dailyAttackReset !== dayCount) {
      VS.warState.dailyAttackReset = dayCount;
      VS.warState.dailyAttackCount = 0;
    }
    // Clean up old attack records (keep last 7 days)
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    VS.warState.attacksMade = (VS.warState.attacksMade || []).filter(function(a) {
      return a.timestamp > weekAgo;
    });
    VS.warState.attacksReceived = (VS.warState.attacksReceived || []).filter(function(a) {
      return a.timestamp > weekAgo;
    });
  }
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
  triggerBirthAnnouncement(v, pA, pB);
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
  }
}

/* ═══════════════════════════════════════════════════════════════
   Missile Warfare Window Functions
═══════════════════════════════════════════════════════════════ */

// Launch a missile at target coordinates
window._launchMissile = function(missileType, targetX, targetY, targetZone, targetName, count) {
  count = count || 1;
  
  // Check spam protection
  var canAttack = canAttackTarget(VS.warState, targetName, Date.now(), dayCount);
  if (!canAttack.ok) {
    return { ok: false, msg: canAttack.reason };
  }
  
  // Check resources and inventory
  if (!canAffordMissileLaunch(missileType, count, VS)) {
    return { ok: false, msg: 'Kulang ang resources para sa missile na ito.' };
  }
  
  // Check missile stock
  var inv = VS.missileInventory || {};
  if ((inv[missileType] || 0) < count) {
    return { ok: false, msg: 'Kulang ang missile sa inventory!' };
  }
  
  // Deduct cost and use from inventory
  if (!deductMissileCost(missileType, count, VS, showMsg)) {
    return { ok: false, msg: 'Failed to deduct missile cost.' };
  }
  for (var i = 0; i < count; i++) {
    useMissileFromInventory(missileType, VS, showMsg);
  }
  
  // Find launch position (Missile Silo)
  var silo = VS.buildings.find(function(b) { return b.type === 'missilesilo' && b.hp > 0; });
  var startX = silo ? silo.x : (WORLD_W / 2);
  var startY = silo ? silo.y : (WORLD_H / 2);
  
  // Calculate travel time based on distance
  var distance = dist(startX, startY, targetX, targetY);
  var missileDef = MISSILE_COSTS[missileType];
  var travelTime = randRange(missileDef.travelMin, missileDef.travelMax);
  var launchTime = Date.now();
  var impactTime = launchTime + travelTime * 1000;
  
  // Create missile record
  var missile = {
    id: 'm_' + Date.now() + '_' + randInt(1000, 9999),
    type: missileType,
    targetX: targetX,
    targetY: targetY,
    targetZone: targetZone,
    targetName: targetName,
    launchTime: launchTime,
    impactTime: impactTime,
    eta: travelTime,
    status: 'traveling',
    damage: 0,
    buildingHit: null,
    lootGained: 0,
    cancelled: false,
    startX: startX,
    startY: startY,
    progress: 0
  };
  
  VS.missiles.outgoing.push(missile);
  
  // Record attack for spam protection
  recordAttackMade(VS.warState, targetName, launchTime, dayCount);
  
  // Show launch effect on map
  if (silo) {
    addMissileLaunch(silo.x, silo.y, missileType);
  }
  
  // Play launch sound
  _playSound('sfx-missile-launch');
  
  // Show confirmation
  showMsg(`🚀 Inilunsad ang ${missileType.toUpperCase()} missile papunta sa ${targetName}! ETA: ${travelTime}s`, 'info');
  
  return { ok: true, missile: missile };
};

// Cancel outgoing missile (within first 10 seconds)
window._cancelMissile = function(missileId) {
  var result = cancelMissile(missileId, VS, Date.now(), showMsg);
  if (result.ok) {
    // Remove from visual tracking
    clearMissileEffects();
  }
  return result;
};

// Get missile tracking data for UI
window._getMissileTracking = function() {
  return getMissileTrackingData(VS, Date.now());
};

// Process offline missile impacts (called on game load)
window._processMissileImpacts = function() {
  var result = processOfflineImpacts(VS, Date.now(), showMsg);
  if (result.processed > 0) {
    showMsg(`💥 ${result.processed} missile(s) impacted while you were away!`, 'info');
  }
  return result;
};

// Debt system functions (existing)
window._makeDebtPayment = function(amount) {
  if (makeDebtPayment) {
    return makeDebtPayment(amount, VS, showMsg);
  } else {
    if (VS.res.gold < amount) {
      showMsg('Kulang ang ginto!', 'danger');
      return false;
    }
    if (!VS.debt) VS.debt = { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
    var payment = Math.min(amount, VS.debt.principal);
    VS.res.gold -= payment;
    VS.debt.principal -= payment;
    VS.debt.paymentHistory.unshift({ amount: payment, day: dayCount });
    if (VS.debt.paymentHistory.length > 30) VS.debt.paymentHistory.pop();
    VS.debt.missedPayments = 0;
    showMsg(`Nagbayad ng ${payment} 🪙. Natitirang utang: ${VS.debt.principal} 🪙`, 'success');
    return true;
  }
};

window._takeLoan = function(amount) {
  if (takeLoan) {
    return takeLoan(amount, VS, showMsg);
  } else {
    if (VS.debt && VS.debt.defaulted) {
      showMsg('Hindi ka na pwedeng umutang dahil sa nakaraang hindi pagbabayad.', 'danger');
      return false;
    }
    var maxLoan = getMaxLoanAmount(VS);
    if (amount > maxLoan) {
      showMsg(`Ang maximum na pwedeng utangin ay ${maxLoan} 🪙 batay sa credit score.`, 'warning');
      return false;
    }
    if (!VS.debt) VS.debt = { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
    VS.debt.principal += amount;
    VS.res.gold += amount;
    showMsg(`Nakautang ng ${amount} 🪙. Kabuuang utang: ${VS.debt.principal} 🪙`, 'info');
    return true;
  }
};

window._getMaxLoanAmount = function(vs) { return getMaxLoanAmount ? getMaxLoanAmount(vs || VS) : 1000; };
window._getInterestRate = function(vs) { return getInterestRate ? getInterestRate(vs || VS) : 0.05; };
window._getDebtSummary = function(vs) { return getDebtSummary ? getDebtSummary(vs || VS) : { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] }; };

// Expose other window functions
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
window.triggerProtest = function() { triggerProtestGathering(VS); };
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
  var savedState = loadGame();
  if (!savedState) { showMsg('Walang na-save.'); return; }
  closeDrawer();
  VS.res = savedState.res || VS.res;
  VS.resCap = savedState.resCap || VS.resCap;
  VS.pop = savedState.pop || VS.pop;
  VS.time = savedState.time !== undefined ? savedState.time : VS.time;
  dayCount = savedState.dayCount || 1;
  VS.unlockedZones = savedState.unlockedZones || [];
  if (savedState.corruption) VS.corruption = savedState.corruption;
  if (savedState.policies) VS.policies = savedState.policies;
  if (savedState.election) VS.election = savedState.election;
  if (savedState.food) VS.food = savedState.food;
  if (savedState.debt) VS.debt = savedState.debt;
  if (savedState.trade) VS.trade = savedState.trade;
  if (savedState.needs) VS.needs = savedState.needs;
  if (savedState.rank) VS.rank = savedState.rank;
  // Load missile warfare state (NEW v7)
  if (savedState.missiles) VS.missiles = savedState.missiles;
  if (savedState.warState) VS.warState = savedState.warState;
  if (savedState.missileInventory) VS.missileInventory = savedState.missileInventory;
  if (savedState.scoutHistory) VS.scoutHistory = savedState.scoutHistory;
  if (savedState.villagers && savedState.villagers.length) VS.villagers = rebuildVillagersFromSave(savedState.villagers);
  if (savedState.buildings && savedState.buildings.length) VS.buildings = rebuildFromSave(savedState.buildings);
  if (savedState.resourceNodes && savedState.resourceNodes.length) {
    VS.resourceNodes = savedState.resourceNodes.map(function(d) {
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
  if (savedState.playerGold !== undefined) {
    initPersonalFinance({
      VS: VS,
      showMsg: showMsg,
      savedPlayerGold: savedState.playerGold || 0,
      savedPlayerRice: savedState.playerRice || 0,
      savedCorruptionHistory: savedState.corruptionHistory || [],
    });
  }
  // Process any missile impacts that occurred while offline
  _processMissileImpacts();
  showMsg('Na-load! Araw ' + dayCount);
};
window.openRankModal = openRankModal;

// Debug helpers
window.debugShowReport = function() {
  const oldRank = getRankFromScore(VS.rank.score);
  const nextRank = getNextRank(VS.rank.score);
  const mockResult = {
    dailyScore: 18,
    breakdown: {
      positive: [
        { label: 'Kasiyahan', change: 3.5, detail: '65% → 72%' },
        { label: 'Populasyon', change: 16, detail: '+8 bagong mamamayan' },
        { label: 'Bagong Gusali', change: 8, detail: '2 farms, 1 palengke' },
        { label: 'Kalakalan', change: 5, detail: '+500🪙 profit' }
      ],
      negative: [
        { label: 'Korapsyon', change: -12, detail: 'exposure +24%' },
        { label: 'Nasayang', change: -3, detail: '1,500 resources' }
      ]
    }
  };
  showDayCount(dayCount).then(() => {
    return showDailyReport(VS, dayCount, mockResult, VS.rank.score, VS.rank.score + 18, oldRank, nextRank);
  });
};

window.debugShowDayCount = function() {
  return showDayCount(dayCount);
};

// Debug: Add missiles to inventory
window.debugAddMissiles = function(type, count) {
  VS.missileInventory = VS.missileInventory || { basic: 0, precision: 0, ballistic: 0, mirv: 0, interceptor: 0 };
  VS.missileInventory[type] = (VS.missileInventory[type] || 0) + (count || 1);
  showMsg(`Added ${count || 1} ${type} missile(s) to inventory`, 'info');
};

console.log('✅ Mini Bayan loaded. Debug: debugShowReport(), debugShowDayCount(), debugAddMissiles(type, count)');
console.log('Tip: Set _VS.time = 23.9 to trigger day change');

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
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'cover';
  } else {
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    canvas.style.width = WORLD_W + 'px';
    canvas.style.height = WORLD_H + 'px';
    canvas.style.objectFit = 'fill';
  }
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
  initDebt(VS);

  const container = document.getElementById('canvas-container');
  if (container) {
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    adjustContainerLayout();
  }
  
  window.addEventListener('resize', () => adjustContainerLayout());
  window.addEventListener('orientationchange', () => setTimeout(adjustContainerLayout, 100));
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

  // Initialize missile and scout panels
  initMissilePanel();
  initScoutPanel();

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