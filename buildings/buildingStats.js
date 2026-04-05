/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/buildingStats.js

   STATS & RESOURCE HELPERS
   ─────────────────────────────────────────────────────────────
   All stat calculation and resource indicator logic extracted
   from building.js so that file stays lean.

   EXPORTS (attached to Building.prototype by building.js)
   ─────────────────────────────────────────────────────────────
   applyStatsPrototypes(Building)
     Attaches the following prototype methods:
       getStats()
       getUpgradeCost()
       getCapacity()
       getWorkerSlots()
       getWorkerCount()
       getOccupancy()
       getServiceEffect()
       shouldShowGoldIndicator()
       shouldShowFoodIndicator()
       shouldShowLangisIndicator()
       getProductionMultiplier(VS)
       canTrain(VS)
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';

var UPGRADE_BASE = { gold: 150, rice: 40 };

/* ══════════════════════════════════════════════════════════════
   applyStatsPrototypes
   Call once after Building is defined in building.js.
══════════════════════════════════════════════════════════════ */
export function applyStatsPrototypes(Building) {

  /* ── getStats ─────────────────────────────────────────────── */
  Building.prototype.getStats = function() {
    var def  = this.getDef();
    var lv   = this.level;
    var pathMult = { prod: 1, storage: 1, pop: 1, efficiency: 1, defense: 1 };
    if (this.upgradePath === 'capacity')   { pathMult.storage = 1.5; pathMult.pop = 1.5; }
    if (this.upgradePath === 'efficiency') { pathMult.prod = 1.4; pathMult.efficiency = 1.2; }
    if (this.upgradePath === 'quality')    { pathMult.prod = 1.1; pathMult.defense = 1.3; }

    var stats = {
      productionRate: def.prodRate * lv * pathMult.prod,
      storageBonus: {
        gold:  (def.storageBonus.gold   || 0) * lv * pathMult.storage,
        rice:  (def.storageBonus.rice   || 0) * lv * pathMult.storage,
        langis:(def.storageBonus.langis || 0) * lv * pathMult.storage,
      },
      populationMax:  (def.popBonus || 0) * lv * pathMult.pop,
      efficiency:     clamp(0.6 + 0.1 * lv * pathMult.efficiency, 0.6, 1.0),
      defenceHP:      (def.defenceHP   || 0) * lv * pathMult.defense,
      attackDPS:      (def.attackDPS   || 0) * lv,
      attackRange:    (def.attackRange || 0) * (1 + (lv - 1) * 0.2),
      maxUncollectedGold:   (def.maxUncollectedGold   || 0) * lv,
      maxUncollectedFood:   (def.maxUncollectedFood   || 0) * lv,
      maxUncollectedLangis: (def.maxUncollectedLangis || 0) * lv,
      // Langis consumption scales with level
      langisConsumption: (def.langisConsumption || 0) * (1 + (lv - 1) * 0.3),
    };

    // Missile-specific stats
    if (def.missileCapacity !== undefined) {
      stats.missileCapacity    = (def.missileCapacity || 0) * lv;
      stats.missileReloadTime  = Math.max(30, (def.missileReloadTime || 120) / (1 + (lv - 1) * 0.15));
    }
    if (def.interceptBaseChance !== undefined) {
      stats.interceptBaseChance = def.interceptBaseChance + (lv - 1) * 5; // +5% per level
      stats.interceptorStock    = (def.interceptorMissileStock || 0) + (lv - 1) * 2;
    }
    if (def.detectionRange !== undefined) {
      stats.detectionRange    = def.detectionRange;
      stats.earlyWarningTime  = def.earlyWarningTime + (lv - 1) * 3;
    }

    return stats;
  };

  /* ── getUpgradeCost ───────────────────────────────────────── */
  Building.prototype.getUpgradeCost = function() {
    var lv  = this.level;
    var def = this.getDef();
    var militaryMult = (def.category === 'military') ? 1.5 : 1.0;
    return {
      gold: Math.floor(UPGRADE_BASE.gold * lv * lv * militaryMult),
      rice: Math.floor(UPGRADE_BASE.rice * lv * militaryMult),
    };
  };

  /* ── Occupancy / capacity ─────────────────────────────────── */
  Building.prototype.getCapacity    = function() { return this.getStats().populationMax; };
  Building.prototype.getWorkerSlots = function() { return (this.getDef().workerSlots || 0) * this.level; };
  Building.prototype.getWorkerCount = function() {
    this._assignedWorkers = this._assignedWorkers.filter(function(v) { return v && v.workBuilding; });
    return this._assignedWorkers.length;
  };
  Building.prototype.getOccupancy   = function() {
    this._occupants = this._occupants.filter(function(v) { return v && v.isHome; });
    return this._occupants.length;
  };
  Building.prototype.getServiceEffect = function() {
    return this.getDef().serviceEffect || null;
  };

  /* ── Collection indicators ────────────────────────────────── */
  Building.prototype.shouldShowGoldIndicator = function() {
    var maxGold = this.getStats().maxUncollectedGold || 0;
    if (maxGold === 0) return false;
    return this.uncollectedGold >= (maxGold * 0.4);
  };

  Building.prototype.shouldShowFoodIndicator = function() {
    var maxFood = this.getStats().maxUncollectedFood || 0;
    if (maxFood === 0) return false;
    return this.uncollectedFood >= (maxFood * 0.4);
  };

  Building.prototype.shouldShowLangisIndicator = function() {
    var maxLangis = this.getStats().maxUncollectedLangis || 0;
    if (maxLangis === 0) return false;
    return this.uncollectedLangis >= (maxLangis * 0.4);
  };

  /* ── Langis / production helpers ─────────────────────────── */
  Building.prototype.getProductionMultiplier = function(VS) {
    var def         = this.getDef();
    var consumption = this.getStats().langisConsumption;
    if (consumption <= 0) return 1.0;

    var hasLangis = (VS.res.langis || 0) >= consumption * 0.1;
    this._hasLangis = hasLangis;

    if (!hasLangis && !this._langisShortageWarned && Math.random() < 0.01) {
      this._langisShortageWarned = true;
      if (window.showMsg) window.showMsg('⚠️ ' + def.label + ' walang langis! Bumagal ang operasyon.', 'warning');
    }
    if (hasLangis) this._langisShortageWarned = false;

    return hasLangis ? 1.0 : 0.2;
  };

  Building.prototype.canTrain = function(VS) {
    var consumption = this.getStats().langisConsumption;
    if (consumption <= 0) return true;
    return (VS.res.langis || 0) >= consumption * 0.1;
  };
}
