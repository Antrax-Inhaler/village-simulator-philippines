/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — government/corruption.js

   CORRUPTION SYSTEM
   ─────────────────────────────────────────────────────────────
   Corruption is NEVER a button. It happens through hidden choices:

   1. OVERPRICING  — Player sets a project budget higher than the
      real cost. The surplus silently routes to personalFund.
      Building still completes; risk rises by the overpriced %.

   2. LEAKAGE      — Uncollected building revenue that the player
      lets sit too long "leaks" a portion to personalFund each tick.

   3. PERSONAL FUND — Stolen money. Can be spent on vote-buying
      or bribing officials (see election.js / politics.js).
      Citizens DON'T see it — until a scandal fires.

   RISK METER (0–100)
   ─────────────────────────────────────────────────────────────
   Each corrupt action raises riskLevel. Risk decays slowly when
   nothing corrupt happens. Once riskLevel >= SCANDAL_THRESHOLD,
   events.js may fire a corruption scandal.

   SCANDAL
   ─────────────────────────────────────────────────────────────
   On scandal: corruption exposure is permanently raised until the
   next election. govTrust drops for all citizens. personal fund
   is partially confiscated.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   tickCorruption(dt, VS)           — call from main.js update()
   overpriceBuild(realCost, VS)     — returns { actualCost, diverted, riskAdded }
   collectLeakage(building, VS)     — call when player taps a building
   spendPersonalFund(amount, VS)    — returns { ok, msg }
   getCorruptionState(VS)           — returns snapshot for UI / election.js
   triggerScandal(VS, notifyFn)     — called by events.js when risk overflows
═══════════════════════════════════════════════════════════════ */

import { clamp, randRange } from '../utils/perspective.js';

/* ── Constants ────────────────────────────────────────────── */
var SCANDAL_THRESHOLD   = 80;   // riskLevel that can trigger a scandal
var RISK_DECAY_RATE     = 0.4;  // risk points lost per real second (idle)
var LEAKAGE_RATE        = 0.02; // fraction of uncollected revenue lost per second
var CONFISCATION_RATIO  = 0.55; // portion of personalFund seized on scandal
var MAX_OVERPRICE_PCT   = 0.60; // player can't overprice by more than 60%

/* ── Ensure VS carries corruption sub-state ───────────────── */
function _ensureState(VS) {
  if (!VS.corruption) {
    VS.corruption = {
      personalFund:      0,      // hidden gold pool
      riskLevel:         0,      // 0–100
      exposureLevel:     0,      // 0–100, sticky; visible after scandal
      scandalsThisTerm:  0,
      totalDiverted:     0,      // running total for records
      lastLeakCheck:     0,      // internal timer
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   tickCorruption
   Call once per update tick from main.js.
   Handles risk decay and periodic leakage check.
══════════════════════════════════════════════════════════════ */
export function tickCorruption(dt, VS) {
  _ensureState(VS);
  var C = VS.corruption;

  /* Risk decays when player isn't doing corrupt things */
  C.riskLevel = clamp(C.riskLevel - RISK_DECAY_RATE * dt, 0, 100);

  /* Leakage: uncollected building income slowly drains to fund */
  C.lastLeakCheck += dt;
  if (C.lastLeakCheck >= 5.0) {
    C.lastLeakCheck = 0;
    _processLeakage(VS);
  }
}

/* ── Internal: check all buildings for uncollected income ─── */
function _processLeakage(VS) {
  var C = VS.corruption;
  var leaked = 0;

  VS.buildings.forEach(function(b) {
    if (b.uncollectedGold && b.uncollectedGold > 20) {
      var leak = Math.floor(b.uncollectedGold * LEAKAGE_RATE);
      if (leak > 0) {
        b.uncollectedGold -= leak;
        C.personalFund    += leak;
        C.totalDiverted   += leak;
        leaked            += leak;
        /* Small risk bump — passive corruption is still corruption */
        C.riskLevel = clamp(C.riskLevel + leak * 0.01, 0, 100);
      }
    }
  });

  return leaked;
}

/* ══════════════════════════════════════════════════════════════
   overpriceBuild
   Called when player sets a budget for a construction project.
   Returns how much was diverted and how much risk was added.

   @param {number} realCost   — actual gold cost of the project
   @param {number} setBudget  — budget the player declared (may be higher)
   @param {object} VS
   @returns {{ actualCost, diverted, riskAdded, clamped }}
══════════════════════════════════════════════════════════════ */
export function overpriceBuild(realCost, setBudget, VS) {
  _ensureState(VS);
  var C = VS.corruption;

  var maxAllowed = Math.floor(realCost * (1 + MAX_OVERPRICE_PCT));
  var clamped    = Math.min(setBudget, maxAllowed);
  var diverted   = Math.max(0, clamped - realCost);

  if (diverted > 0) {
    C.personalFund  += diverted;
    C.totalDiverted += diverted;

    /* Risk grows proportionally to the overpricing ratio */
    var overpricePct = diverted / realCost;
    var riskAdded    = clamp(overpricePct * 30, 1, 25);
    C.riskLevel      = clamp(C.riskLevel + riskAdded, 0, 100);

    return { actualCost: realCost, diverted: diverted, riskAdded: riskAdded, clamped: clamped };
  }

  return { actualCost: realCost, diverted: 0, riskAdded: 0, clamped: clamped };
}

/* ══════════════════════════════════════════════════════════════
   collectLeakage
   Called when the player manually taps a building to collect.
   Collecting promptly = no leakage, no risk.

   @param {object} building   — Building instance
   @param {object} VS
   @returns {number} gold collected cleanly
══════════════════════════════════════════════════════════════ */
export function collectLeakage(building, VS) {
  _ensureState(VS);
  if (!building.uncollectedGold) return 0;

  var amount = building.uncollectedGold;
  VS.res.gold             = Math.min(VS.resCap.gold, VS.res.gold + amount);
  building.uncollectedGold = 0;
  return amount;
}

/* ══════════════════════════════════════════════════════════════
   spendPersonalFund
   Secretly spend from the personal fund (vote-buying, bribes).
   Each spend adds moderate risk.

   @param {number} amount
   @param {object} VS
   @returns {{ ok, msg, riskAdded }}
══════════════════════════════════════════════════════════════ */
export function spendPersonalFund(amount, VS) {
  _ensureState(VS);
  var C = VS.corruption;

  if (C.personalFund < amount) {
    return { ok: false, msg: 'Hindi sapat ang personal na pondo.', riskAdded: 0 };
  }

  C.personalFund -= amount;
  var riskAdded   = clamp(amount * 0.04, 2, 20);
  C.riskLevel     = clamp(C.riskLevel + riskAdded, 0, 100);

  return { ok: true, msg: 'Nagastos: ' + amount + ' mula sa personal na pondo.', riskAdded: riskAdded };
}

/* ══════════════════════════════════════════════════════════════
   triggerScandal
   Called by events.js when riskLevel >= SCANDAL_THRESHOLD.
   Exposes corruption, tanks trust, confiscates part of fund.

   @param {object} VS
   @param {Function} notifyFn   — showMsg or notifToast callback
══════════════════════════════════════════════════════════════ */
export function triggerScandal(VS, notifyFn) {
  _ensureState(VS);
  var C = VS.corruption;

  /* Confiscate a portion of the personal fund */
  var confiscated    = Math.floor(C.personalFund * CONFISCATION_RATIO);
  C.personalFund    -= confiscated;

  /* Exposure becomes permanent until next election */
  var exposureDelta  = clamp(C.riskLevel * 0.5 + 15, 10, 40);
  C.exposureLevel    = clamp(C.exposureLevel + exposureDelta, 0, 100);

  /* Reset risk — the damage is now baked into exposure */
  C.riskLevel        = clamp(C.riskLevel * 0.3, 0, 100);
  C.scandalsThisTerm += 1;

  /* Hit every citizen's govTrust */
  VS.villagers.forEach(function(v) {
    if (v.govTrust !== undefined) {
      v.govTrust = clamp(v.govTrust - randRange(8, 18), 0, 100);
    }
  });

  if (notifyFn) {
    notifyFn(
      'ISKANDALO! Nalantad ang korapsyon. ' +
      confiscated + ' ginto ang nakumpiska. Tiwala ng mamamayan ay bumagsak!',
      'danger'
    );
  }

  return { confiscated: confiscated, exposureAdded: exposureDelta };
}

/* ══════════════════════════════════════════════════════════════
   resetTermCorruption
   Called by election.js at the start of a new term.
   Exposure decays but doesn't fully reset — history matters.
══════════════════════════════════════════════════════════════ */
export function resetTermCorruption(VS) {
  _ensureState(VS);
  var C = VS.corruption;
  C.exposureLevel    = clamp(C.exposureLevel * 0.4, 0, 100);
  C.scandalsThisTerm = 0;
  C.riskLevel        = clamp(C.riskLevel * 0.5, 0, 100);
}

/* ══════════════════════════════════════════════════════════════
   getCorruptionState
   Safe snapshot for UI, election.js, and dashboard.js.
══════════════════════════════════════════════════════════════ */
export function getCorruptionState(VS) {
  _ensureState(VS);
  var C = VS.corruption;
  return {
    personalFund:     C.personalFund,
    riskLevel:        C.riskLevel,
    exposureLevel:    C.exposureLevel,
    scandalsThisTerm: C.scandalsThisTerm,
    totalDiverted:    C.totalDiverted,
    scandalImminent:  C.riskLevel >= SCANDAL_THRESHOLD,
  };
}

/* ══════════════════════════════════════════════════════════════
   canScandalFire
   Called by events.js to check if conditions are met.
══════════════════════════════════════════════════════════════ */
export function canScandalFire(VS) {
  _ensureState(VS);
  return VS.corruption.riskLevel >= SCANDAL_THRESHOLD;
}
