/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — resources/economy.js

   ECONOMY SYSTEM
   ─────────────────────────────────────────────────────────────
   Handles the full economic loop: income tax, business tax,
   property tax, and resource waste tracking.

   WASTE TRACKING
   ─────────────────────────────────────────────────────────────
   wasteStats accumulates resources lost to storage overflow.
   Excessive waste erodes govTrust and happiness (applied via
   citizenNeeds.js penalty hooks).

   EXPORTS
   ─────────────────────────────────────────────────────────────
   tickEconomy(dt, VS)              — call from main.js update()
   setTaxRate(rate, VS, notifyFn)   — player changes tax rate
   getTaxRate(VS)                   — current rate (0–1)
   getEconomyState(VS)              — snapshot for dashboard
   collectBuildingIncome(b, VS)     — manual tap to collect
   onNewDay(VS, notifyFn)           — call from main.js _onNewDay
   getWasteStats(VS)                — { gold, rice, langis, total }
   resetWasteStats(VS)              — call after storage upgrades
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';
import { isPolicyActive } from '../government/policy.js';

/* ── Constants ────────────────────────────────────────────── */
var DEFAULT_TAX_RATE       = 0.25;
var TAX_ANGER_THRESHOLD    = 0.40;
var TAX_ANGER_RATE         = 0.08;
var INCOME_BY_TYPE = {
  0:  8,  1: 14,  2: 10,  3:  4,  4:  2,  5: 12,
  6:  9,  7:  7,  8: 16,  9: 11, 10:  5, 11: 18,
};
var BUSINESS_TAX_PER_BUILDING = {
  palengke: 12, mine: 10, farm: 4, templo: 6, hukuman: 8, paaralan: 3,
};
var PROPERTY_TAX_BASE = 2;
var INCOME_ACCUM_RATE = 1/1440;

/* Resource icons for waste log messages */
var RES_ICON = { gold: '🪙', rice: '🌾', langis: '🛢️' };

/* ── Ensure VS.economy sub-state ──────────────────────────── */
function _ensureState(VS) {
  if (!VS.economy) {
    VS.economy = {
      taxRate:           DEFAULT_TAX_RATE,
      totalTaxCollected: 0,
      lastDayRevenue:    0,
      lastDayExpenses:   0,
      _dayAccum:         0,
      _incomeTick:       0,
      /* Waste tracking — resources lost to overflow */
      wasteStats: { gold: 0, rice: 0, langis: 0 },
    };
  }
  /* Back-compat: add wasteStats if loading an older save */
  if (!VS.economy.wasteStats) {
    VS.economy.wasteStats = { gold: 0, rice: 0, langis: 0 };
  }
}

/* ══════════════════════════════════════════════════════════════
   _trackOverflow
   Called wherever a resource is about to be set.
   Calculates excess, logs to activity log (1% chance), and
   records to wasteStats.  Returns the clamped value.
══════════════════════════════════════════════════════════════ */
function _trackOverflow(VS, resKey, newValue, cap) {
  if (newValue <= cap) return newValue;

  var excess = newValue - cap;
  VS.economy.wasteStats[resKey] = (VS.economy.wasteStats[resKey] || 0) + excess;

  /* 1% chance per overflow event → activity log */
  if (Math.random() < 0.01) {
    var icon = RES_ICON[resKey] || resKey;
    var msg  = Math.floor(excess) + ' ' + icon + ' ang nasayang dahil sa sirang imbakan';
    _pushActivityLog(VS, msg);
  }

  return cap;
}

/* ── Push a message to VS.activityLog (create if absent) ──── */
function _pushActivityLog(VS, msg) {
  if (!VS.activityLog) VS.activityLog = [];
  VS.activityLog.unshift({ msg: msg, ts: Date.now() });
  if (VS.activityLog.length > 30) VS.activityLog.pop();
}

/* ══════════════════════════════════════════════════════════════
   tickEconomy
══════════════════════════════════════════════════════════════ */
export function tickEconomy(dt, VS) {
  _ensureState(VS);

  VS.buildings.forEach(function(b) {
    if (b.underConstruction) return;
    var bRate = BUSINESS_TAX_PER_BUILDING[b.type] || 0;
    if (bRate > 0) {
      if (!b.uncollectedGold) b.uncollectedGold = 0;
      var stats = b.getStats ? b.getStats() : { efficiency: 1 };
      b.uncollectedGold = Math.min(999,
        b.uncollectedGold + bRate * b.level * stats.efficiency * dt * INCOME_ACCUM_RATE
      );
    }
  });

  /* ── Check for resource overflow every tick ──────────── */
  var res = VS.res, cap = VS.resCap;
  if (res.gold   > cap.gold)   res.gold   = _trackOverflow(VS, 'gold',   res.gold,   cap.gold);
  if (res.rice   > cap.rice)   res.rice   = _trackOverflow(VS, 'rice',   res.rice,   cap.rice);
  if (res.langis > cap.langis) res.langis = _trackOverflow(VS, 'langis', res.langis, cap.langis);
}

/* ══════════════════════════════════════════════════════════════
   onNewDay
══════════════════════════════════════════════════════════════ */
export function onNewDay(VS, notifyFn) {
  _ensureState(VS);
  var E    = VS.economy;
  var rate = E.taxRate;

  var incomeTaxTotal = 0;
  VS.villagers.forEach(function(v) {
    var baseIncome  = INCOME_BY_TYPE[v.typeIdx] || 5;
    var policyBonus = v._policyIncomeBonus || 0;
    var income      = baseIncome + policyBonus;
    v.income        = income;

    var tax = Math.floor(income * rate);
    incomeTaxTotal += tax;

    if (rate > TAX_ANGER_THRESHOLD) {
      var anger = (rate - TAX_ANGER_THRESHOLD) / (1 - TAX_ANGER_THRESHOLD);
      if (v.anger === undefined) v.anger = 0;
      v.anger = clamp(v.anger + TAX_ANGER_RATE * anger * 100, 0, 100);
      if (v.govTrust !== undefined) {
        v.govTrust = clamp(v.govTrust - anger * 2, 0, 100);
      }
    }
  });

  var propertyTax = 0;
  VS.buildings.forEach(function(b) {
    if (b.type !== 'mainHall') propertyTax += PROPERTY_TAX_BASE * b.level;
  });

  var taxMult      = isPolicyActive('pagbabaTax', VS) ? 0.75 : 1.0;
  var totalRevenue = Math.floor((incomeTaxTotal + propertyTax) * taxMult);

  /* Apply with overflow tracking */
  var newGold = VS.res.gold + totalRevenue;
  VS.res.gold = _trackOverflow(VS, 'gold', newGold, VS.resCap.gold);

  E.totalTaxCollected += totalRevenue;
  E.lastDayRevenue     = totalRevenue;

  if (notifyFn && totalRevenue > 0) {
    notifyFn('Buwis: +' + totalRevenue + ' ginto nakolekta.', 'info');
  }
}

/* ══════════════════════════════════════════════════════════════
   collectBuildingIncome
══════════════════════════════════════════════════════════════ */
export function collectBuildingIncome(building, VS) {
  if (!building.uncollectedGold || building.uncollectedGold < 1) return 0;
  var amount  = Math.floor(building.uncollectedGold);
  var newGold = VS.res.gold + amount;
  VS.res.gold = _trackOverflow(VS, 'gold', newGold, VS.resCap.gold);
  building.uncollectedGold = 0;
  return amount;
}

/* ══════════════════════════════════════════════════════════════
   setTaxRate
══════════════════════════════════════════════════════════════ */
export function setTaxRate(rate, VS, notifyFn) {
  _ensureState(VS);
  var newRate = clamp(rate, 0.05, 0.80);
  VS.economy.taxRate = newRate;
  var pct = Math.round(newRate * 100);
  var msg = 'Buwis itinakda sa ' + pct + '%.';
  if (newRate > 0.50) msg += ' Babala: mataas na buwis!';
  if (notifyFn) notifyFn(msg, newRate > 0.50 ? 'warning' : 'info');
  return newRate;
}

/* ══════════════════════════════════════════════════════════════
   getTaxRate
══════════════════════════════════════════════════════════════ */
export function getTaxRate(VS) {
  _ensureState(VS);
  return VS.economy.taxRate;
}

/* ══════════════════════════════════════════════════════════════
   getWasteStats
   Returns a snapshot: { gold, rice, langis, total }
══════════════════════════════════════════════════════════════ */
export function getWasteStats(VS) {
  _ensureState(VS);
  var w = VS.economy.wasteStats;
  return {
    gold:   Math.floor(w.gold   || 0),
    rice:   Math.floor(w.rice   || 0),
    langis: Math.floor(w.langis || 0),
    total:  Math.floor((w.gold || 0) + (w.rice || 0) + (w.langis || 0)),
  };
}

/* ══════════════════════════════════════════════════════════════
   resetWasteStats
   Call after the player upgrades storage so the penalty resets.
══════════════════════════════════════════════════════════════ */
export function resetWasteStats(VS) {
  _ensureState(VS);
  VS.economy.wasteStats = { gold: 0, rice: 0, langis: 0 };
}

/* ══════════════════════════════════════════════════════════════
   getEconomyState
══════════════════════════════════════════════════════════════ */
export function getEconomyState(VS) {
  _ensureState(VS);
  var E = VS.economy;

  var employed = VS.villagers.filter(function(v) { return !!v.workBuilding; }).length;
  var empRate  = VS.villagers.length > 0
    ? clamp(employed / VS.villagers.length, 0, 1) : 0;

  var totalIncome = 0;
  VS.villagers.forEach(function(v) { totalIncome += (v.income || 0); });
  var avgIncome = VS.villagers.length > 0 ? totalIncome / VS.villagers.length : 0;

  var uncollected = 0;
  VS.buildings.forEach(function(b) { uncollected += (b.uncollectedGold || 0); });

  var waste = getWasteStats(VS);

  return {
    taxRate:           E.taxRate,
    taxRatePct:        Math.round(E.taxRate * 100),
    lastDayRevenue:    E.lastDayRevenue,
    totalTaxCollected: E.totalTaxCollected,
    employmentRate:    empRate,
    employmentPct:     Math.round(empRate * 100),
    avgIncome:         Math.round(avgIncome),
    uncollectedGold:   Math.floor(uncollected),
    budget:            Math.floor(VS.res.gold),
    budgetCap:         VS.resCap.gold,
    wasteStats:        waste,
  };
}