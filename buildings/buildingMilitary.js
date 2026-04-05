/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/buildingMilitary.js

   MISSILE & INTERCEPTOR METHODS
   ─────────────────────────────────────────────────────────────
   All military/missile prototype logic extracted from building.js.
   Applies only to missilesilo, radarstation, and interceptor
   building types.

   EXPORTS
   ─────────────────────────────────────────────────────────────
   applyMilitaryPrototypes(Building)
     Attaches the following prototype methods:
       canLaunchMissile(missileType)
       launchMissile(missileType)
       updateMissileTimers(dt)
       getInterceptChance(missileType, hasRadar)
       attemptIntercept(missileType, hasRadar)
═══════════════════════════════════════════════════════════════ */

import { clamp } from '../utils/perspective.js';

/* ══════════════════════════════════════════════════════════════
   applyMilitaryPrototypes
   Call once after Building is defined in building.js.
══════════════════════════════════════════════════════════════ */
export function applyMilitaryPrototypes(Building) {

  /* ── Missile Silo ─────────────────────────────────────────── */

  Building.prototype.canLaunchMissile = function(missileType) {
    var def = this.getDef();
    if (!def.missileCapacity)                                     return false;
    if (this.reloadTimer > 0)                                     return false;
    if (def.missileTypes && def.missileTypes.indexOf(missileType) === -1) return false;
    return (this.missileStock && this.missileStock[missileType] > 0);
  };

  Building.prototype.launchMissile = function(missileType) {
    if (!this.canLaunchMissile(missileType)) return false;
    if (this.missileStock) this.missileStock[missileType]--;
    var stats       = this.getStats();
    this.reloadTimer     = stats.missileReloadTime;
    this.lastLaunchTime  = Date.now();
    return true;
  };

  /* ── Shared timer update (silo + interceptor) ─────────────── */

  Building.prototype.updateMissileTimers = function(dt) {
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer < 0) this.reloadTimer = 0;
    }
    if (this.interceptCooldown > 0) {
      this.interceptCooldown -= dt;
      if (this.interceptCooldown < 0) this.interceptCooldown = 0;
    }
  };

  /* ── Interceptor Battery ──────────────────────────────────── */

  Building.prototype.getInterceptChance = function(missileType, hasRadar) {
    var def   = this.getDef();
    var stats = this.getStats();

    // Ballistic/MIRV require explicit support
    if ((missileType === 'ballistic' || missileType === 'mirv') && !def.canInterceptBallistic) {
      return 0;
    }

    var chance = stats.interceptBaseChance;

    if (hasRadar && def.interceptBonus) {
      chance += def.interceptBonus;
    }

    // Having interceptor missiles in stock raises the floor
    if (this.interceptorStock > 0) {
      chance = Math.max(chance, 60);
    }

    return clamp(chance, 0, 80); // Hard cap at 80%
  };

  Building.prototype.attemptIntercept = function(missileType, hasRadar) {
    if (this.interceptCooldown > 0) return false;

    var chance  = this.getInterceptChance(missileType, hasRadar);
    var success = Math.random() * 100 < chance;

    if (success && this.interceptorStock > 0) {
      this.interceptorStock--;
    }

    if (success) {
      this.interceptCooldown = this.getDef().cooldown || 30;
    }

    return success;
  };
}
