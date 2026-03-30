/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackLogic.js
   Core battle logic for troop movement and building attacks.
═══════════════════════════════════════════════════════════════ */

import { dist, clamp, perspScale } from '../utils/perspective.js';
import { BUILDING_DEFS } from '../buildings/building.js';
import { BATTLE_CONFIG, getBuildingAttackStats } from './attackStats.js';
import { createProjectile, spawnHitSpark, spawnBloodPuff, spawnExplosion } from './projectileSystem.js';

/* ══════════════════════════════════════════════════════════════
   FIND NEAREST BUILDING TARGET
   Prioritizes defence buildings and main hall
══════════════════════════════════════════════════════════════ */
export function findNearestBuildingTarget(troopX, troopY, buildings) {
  var best = null;
  var bestDistance = Infinity;
  
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    if (b.hp <= 0) continue;
    
    var distance = dist(troopX, troopY, b.x, b.y);
    var def = BUILDING_DEFS[b.type];
    
    // Apply priority bonus
    var priorityBonus = 0;
    if (def && def.category === 'defence') {
      priorityBonus = BATTLE_CONFIG.targetPriority.defence;
    } else if (b.isMainHall) {
      priorityBonus = BATTLE_CONFIG.targetPriority.mainHall;
    } else if (def && def.category === 'production') {
      priorityBonus = BATTLE_CONFIG.targetPriority.production;
    } else if (b.type === 'storage') {
      priorityBonus = BATTLE_CONFIG.targetPriority.storage;
    } else if (def && def.isHome) {
      priorityBonus = BATTLE_CONFIG.targetPriority.house;
    }
    
    var adjustedDistance = distance + priorityBonus;
    
    if (adjustedDistance < bestDistance) {
      bestDistance = adjustedDistance;
      best = b;
    }
  }
  
  return best;
}

/* ══════════════════════════════════════════════════════════════
   UPDATE TROOP MOVEMENT AND ATTACKS
══════════════════════════════════════════════════════════════ */
export function updateTroops(troops, buildings, dt, particles) {
  for (var i = 0; i < troops.length; i++) {
    var t = troops[i];
    if (t.hp <= 0) continue;
    if (t.waitT > 0) {
      t.waitT -= dt;
      continue;
    }
    
    // Find or update target
    if (!t.target || t.target.hp <= 0) {
      t.target = findNearestBuildingTarget(t.x, t.y, buildings);
      if (!t.target) continue;
    }
    
    var distance = dist(t.x, t.y, t.target.x, t.target.y);
    
    // Move toward target
    if (distance > t.attackRange) {
      var angle = Math.atan2(t.target.y - t.y, t.target.x - t.x);
      t.x += Math.cos(angle) * t.spd * dt;
      t.y += Math.sin(angle) * t.spd * dt;
    } 
    // Attack target
    else {
      t.attackTimer = (t.attackTimer || 0) - dt;
      if (t.attackTimer <= 0) {
        t.attackTimer = BATTLE_CONFIG.attackTimerBase / (t.dps / 10);
        var damage = t.dps * (BATTLE_CONFIG.damageMin + Math.random() * (BATTLE_CONFIG.damageMax - BATTLE_CONFIG.damageMin));
        t.target.hp = Math.max(0, t.target.hp - damage);
        
        // Visual feedback
        spawnHitSpark(particles, t.target.x, t.target.y);
        
        if (t.target.hp <= 0) {
          spawnExplosion(particles, t.target.x, t.target.y);
        }
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   UPDATE DEFENCE BUILDING ATTACKS
══════════════════════════════════════════════════════════════ */
export function updateDefenceBuildings(buildings, troops, dt, projectiles, particles) {
  for (var i = 0; i < buildings.length; i++) {
    var b = buildings[i];
    if (b.hp <= 0) continue;
    
    var stats = getBuildingAttackStats(b.type, b.level);
    if (!stats || stats.attackRange <= 0) continue;
    
    b.defTimer = (b.defTimer || 0) - dt;
    if (b.defTimer > 0) continue;
    
    // Find nearest troop in range
    var sc = perspScale(b.y);
    var range = stats.attackRange * sc;
    var nearestTroop = null;
    var nearestDistance = Infinity;
    
    for (var j = 0; j < troops.length; j++) {
      var t = troops[j];
      if (t.hp <= 0) continue;
      
      var distance = dist(b.x, b.y, t.x, t.y);
      if (distance < range && distance < nearestDistance) {
        nearestDistance = distance;
        nearestTroop = t;
      }
    }
    
    if (nearestTroop) {
      b.defTimer = stats.cooldown;
      var damage = stats.attackDPS * (BATTLE_CONFIG.damageMin + Math.random() * (BATTLE_CONFIG.damageMax - BATTLE_CONFIG.damageMin));
      
      var projectile = createProjectile(
        b, nearestTroop, damage,
        stats.projectileType, stats.projectileSpeed,
        stats.projectileColor, stats.projectileSize
      );
      projectiles.push(projectile);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   UPDATE DEFENDER VILLAGER ATTACKS
══════════════════════════════════════════════════════════════ */
export function updateDefenderVillagers(defenders, troops, dt, particles) {
  for (var i = 0; i < defenders.length; i++) {
    var d = defenders[i];
    if (d.hp <= 0) continue;
    
    d.attackTimer = (d.attackTimer || 0) - dt;
    if (d.attackTimer > 0) continue;
    
    var nearestTroop = null;
    var nearestDistance = Infinity;
    
    for (var j = 0; j < troops.length; j++) {
      var t = troops[j];
      if (t.hp <= 0) continue;
      
      var distance = dist(d.x, d.y, t.x, t.y);
      if (distance < d.attackRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearestTroop = t;
      }
    }
    
    if (nearestTroop) {
      d.attackTimer = 1.5 + Math.random();
      var damage = d.attackDPS * (0.7 + Math.random() * 0.6);
      nearestTroop.hp = Math.max(0, nearestTroop.hp - damage);
      spawnHitSpark(particles, nearestTroop.x, nearestTroop.y);
      
      if (nearestTroop.hp <= 0) {
        spawnBloodPuff(particles, nearestTroop.x, nearestTroop.y);
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   APPLY PROJECTILE DAMAGE
══════════════════════════════════════════════════════════════ */
export function applyProjectileDamage(projectile, particles) {
  if (projectile.dmgTarget && projectile.dmgTarget.hp > 0) {
    projectile.dmgTarget.hp = Math.max(0, projectile.dmgTarget.hp - projectile.dmg);
    spawnHitSpark(particles, projectile.tx, projectile.ty);
    
    if (projectile.dmgTarget.hp <= 0) {
      spawnBloodPuff(particles, projectile.tx, projectile.ty);
      spawnExplosion(particles, projectile.tx, projectile.ty);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   CHECK BATTLE END CONDITIONS
══════════════════════════════════════════════════════════════ */
export function checkBattleEnd(buildings, troops, deployedQueue) {
  var aliveBuildings = buildings.filter(function(b) { return b.hp > 0; });
  var aliveTroops = troops.filter(function(t) { return t.hp > 0; });
  var remainingToDeploy = Object.keys(deployedQueue).reduce(function(sum, role) {
    return sum + (deployedQueue[role] || 0);
  }, 0);
  
  if (aliveBuildings.length === 0) {
    return { ended: true, victory: true, reason: 'all_buildings_destroyed' };
  }
  
  if (aliveTroops.length === 0 && remainingToDeploy === 0) {
    return { ended: true, victory: false, reason: 'no_troops_left' };
  }
  
  return { ended: false };
}

/* ══════════════════════════════════════════════════════════════
   CALCULATE BATTLE RESULTS
══════════════════════════════════════════════════════════════ */
export function calculateBattleResults(village, troops, victory) {
  var totalBuildings = village.buildings.length;
  var destroyedBuildings = village.buildings.filter(function(b) { return b.hp <= 0; }).length;
  var destructionPercentage = totalBuildings > 0 ? destroyedBuildings / totalBuildings : 0;
  
  var stars = 0;
  if (destructionPercentage >= 1) stars = 3;
  else if (destructionPercentage >= 0.5) stars = 2;
  else if (destructionPercentage > 0) stars = 1;
  
  var lootMultiplier = victory ? (0.7 + Math.random() * 0.3) : (destructionPercentage * 0.5 + Math.random() * 0.1);
  var goldLoot = Math.floor(village.goldLoot * lootMultiplier);
  var riceLoot = Math.floor(village.riceLoot * lootMultiplier);
  
  var deadTroops = troops.filter(function(t) { return t.hp <= 0; });
  var casualties = deadTroops.length;
  
  return {
    victory: victory,
    stars: stars,
    destructionPercentage: destructionPercentage,
    goldLoot: goldLoot,
    riceLoot: riceLoot,
    casualties: casualties,
    deadTroops: deadTroops
  };
}