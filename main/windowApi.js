/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — main/windowApi.js

   The `window.X = ...` bridge between main.js's game state/update
   loop and everything that isn't a JS module: onclick="" handlers
   in index.html, and other independently-loaded <script type="module">
   files (attack_controller.js, sidePanelEngine.js, etc.) that reach
   into the running game through window.

   See WINDOW_API.md at the repo root for the full inventory of what
   ends up on window and who owns each property — keep that file in
   sync with this one.

   This module owns no state of its own. Everything it needs — the
   live VS object, and accessors for the handful of module-scoped
   primitives in main.js that get read or reassigned here (dayCount,
   gameMode, the canvas element) — is handed in once via
   installWindowApi(deps), called from main.js's init().
═══════════════════════════════════════════════════════════════ */

import { ZONE_DEFS, isZoneUnlocked, purchaseZone } from '../world/zones.js';
import { dist, randRange, randInt } from '../utils/perspective.js';
import { setTimeSpeed } from '../utils/time.js';
import { saveGame, loadGame } from '../utils/storage.js';

import { ResourceNode } from '../resources/resource.js';
import {
  setTaxRate, getTaxRate, takeLoan, makeDebtPayment, getDebtSummary,
  getMaxLoanAmount, getInterestRate, deductMissileCost, useMissileFromInventory,
  canAffordMissileLaunch, MISSILE_COSTS,
} from '../resources/economy.js';

import { rebuildFromSave } from '../buildings/building.js';
import { getRepairCost } from '../buildings/wreckBuildings.js';

import { rebuildVillagersFromSave, assignHomes, assignWork } from '../villagers/villager.js';
import { triggerProtestGathering } from '../villagers/aiInteraction.js';

import { softPan, WORLD_W, WORLD_H } from '../render/camera.js';
import { addMissileLaunch, clearMissileEffects } from '../render/renderer.js';

import { openDrawer, closeDrawer } from '../ui/drawer.js';
import { showMsg } from '../ui/notifToast.js';
import { openExpansionPanel } from '../ui/expansionPanel.js';

import { getPolicyState, activatePolicy, deactivatePolicy } from '../government/policy.js';
import { initPersonalFinance, serializePersonalFinance } from '../government/personalFinance.js';
import { openRankModal } from '../ui/rankModal.js';

import { getRankFromScore, getNextRank } from '../ranking/rankingSystem.js';
import { showDayCount, showDailyReport } from '../ui/dailyReport.js';

import {
  cancelMissile, processOfflineImpacts, getMissileTrackingData,
  canAttackTarget, recordAttackMade,
} from '../attack/missileWarfare.js';

var SOUNDS_ENABLED = true; // dev mute-all — mirrors the flag in main.js

function _playSound(id, opts) {
  if (!SOUNDS_ENABLED) return;
  if (typeof window.playSound === 'function') window.playSound(id, opts);
}

/* deps = {
     VS,
     getDayCount, setDayCount,
     getGameMode, setGameMode,
     getCanvas,
     spawnVillager,   // main.js's _spawnVillager(typeIdx, silent)
     recalcCaps,      // main.js's _recalcCaps()
     initWaypoints,   // main.js's initWaypoints()
   } */
export function installWindowApi(deps) {
  var VS = deps.VS;

  /* ── Missile warfare ─────────────────────────────────────── */
  window._launchMissile = function(missileType, targetX, targetY, targetZone, targetName, count) {
    count = count || 1;
    var dayCount = deps.getDayCount();

    var canAttack = canAttackTarget(VS.warState, targetName, Date.now(), dayCount);
    if (!canAttack.ok) {
      return { ok: false, msg: canAttack.reason };
    }

    if (!canAffordMissileLaunch(missileType, count, VS)) {
      return { ok: false, msg: 'Kulang ang resources para sa missile na ito.' };
    }

    var inv = VS.missileInventory || {};
    if ((inv[missileType] || 0) < count) {
      return { ok: false, msg: 'Kulang ang missile sa inventory!' };
    }

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

    var missileDef = MISSILE_COSTS[missileType];
    var travelTime = randRange(missileDef.travelMin, missileDef.travelMax);
    var launchTime = Date.now();
    var impactTime = launchTime + travelTime * 1000;

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

    recordAttackMade(VS.warState, targetName, launchTime, dayCount);

    if (silo) {
      addMissileLaunch(silo.x, silo.y, missileType);
    }

    _playSound('sfx-missile-launch');

    showMsg(`🚀 Inilunsad ang ${missileType.toUpperCase()} missile papunta sa ${targetName}! ETA: ${travelTime}s`, 'info');

    return { ok: true, missile: missile };
  };

  window._cancelMissile = function(missileId) {
    var result = cancelMissile(missileId, VS, Date.now(), showMsg);
    if (result.ok) {
      clearMissileEffects();
    }
    return result;
  };

  window._getMissileTracking = function() {
    return getMissileTrackingData(VS, Date.now());
  };

  window._processMissileImpacts = function() {
    var result = processOfflineImpacts(VS, Date.now(), showMsg, deps.getDayCount());
    if (result.processed > 0) {
      showMsg(`💥 ${result.processed} missile(s) impacted while you were away!`, 'info');
    }
    return result;
  };

  window.debugAddMissiles = function(type, count) {
    VS.missileInventory = VS.missileInventory || { basic: 0, precision: 0, ballistic: 0, mirv: 0, interceptor: 0 };
    VS.missileInventory[type] = (VS.missileInventory[type] || 0) + (count || 1);
    showMsg(`Added ${count || 1} ${type} missile(s) to inventory`, 'info');
  };

  /* ── Debt ─────────────────────────────────────────────────── */
  window._makeDebtPayment = function(amount) {
    if (makeDebtPayment) {
      return makeDebtPayment(amount, VS, showMsg, deps.getDayCount());
    } else {
      if (VS.res.gold < amount) {
        showMsg('Kulang ang ginto!', 'danger');
        return false;
      }
      if (!VS.debt) VS.debt = { principal: 0, creditScore: 60, defaulted: false, missedPayments: 0, paymentHistory: [] };
      var payment = Math.min(amount, VS.debt.principal);
      VS.res.gold -= payment;
      VS.debt.principal -= payment;
      VS.debt.paymentHistory.unshift({ amount: payment, day: deps.getDayCount() });
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

  /* ── Core game actions ────────────────────────────────────── */
  window.spawnVillager = function() { deps.spawnVillager(undefined, false); };
  window.showMsg = showMsg;
  window._VS = VS;
  window.setMode = function(m) { deps.setGameMode(m); deps.getCanvas().className = 'mode-' + m; };
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

  /* ── Save / Load ──────────────────────────────────────────── */
  window.triggerSave = function() {
    var _pf = serializePersonalFinance();
    showMsg(saveGame(VS, deps.getDayCount(), null, _pf) ? 'Naligtas! Araw ' + deps.getDayCount() : 'Save error.');
  };
  window.triggerLoad = function() {
    var savedState = loadGame();
    if (!savedState) { showMsg('Walang na-save.'); return; }
    closeDrawer();
    VS.res = savedState.res || VS.res;
    VS.resCap = savedState.resCap || VS.resCap;
    VS.pop = savedState.pop || VS.pop;
    VS.time = savedState.time !== undefined ? savedState.time : VS.time;
    deps.setDayCount(savedState.dayCount || 1);
    VS.unlockedZones = savedState.unlockedZones || [];
    if (savedState.corruption) VS.corruption = savedState.corruption;
    if (savedState.policies) VS.policies = savedState.policies;
    if (savedState.election) VS.election = savedState.election;
    if (savedState.food) VS.food = savedState.food;
    if (savedState.debt) VS.debt = savedState.debt;
    if (savedState.trade) VS.trade = savedState.trade;
    if (savedState.needs) VS.needs = savedState.needs;
    if (savedState.rank) VS.rank = savedState.rank;
    // Missile warfare state (v7)
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
    deps.initWaypoints();
    assignHomes(VS.villagers, VS.buildings);
    assignWork(VS.villagers, VS.buildings);
    deps.recalcCaps();
    if (savedState.playerGold !== undefined) {
      initPersonalFinance({
        VS: VS,
        showMsg: showMsg,
        savedPlayerGold: savedState.playerGold || 0,
        savedPlayerRice: savedState.playerRice || 0,
        savedCorruptionHistory: savedState.corruptionHistory || [],
      });
    }
    window._processMissileImpacts();
    showMsg('Na-load! Araw ' + deps.getDayCount());
  };
  window.openRankModal = openRankModal;

  /* ── Debug helpers ────────────────────────────────────────── */
  window.debugShowReport = function() {
    var dayCount = deps.getDayCount();
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
    return showDayCount(deps.getDayCount());
  };

  console.log('✅ Mini Bayan loaded. Debug: debugShowReport(), debugShowDayCount(), debugAddMissiles(type, count)');
  console.log('Tip: Set _VS.time = 23.9 to trigger day change');
}
