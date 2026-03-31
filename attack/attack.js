/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attack.js  (UPDATED with Missile Warfare Support)
   
   Now includes:
   - Villager projectile attacks (spears, bullets, rockets)
   - Attack animations with weapon trails
   - Muzzle flash effects
   - Area of effect damage for rockets
   - Proper range calculations
   - MISSILE WARFARE: ETA calculation, missile damage, distance helpers
═══════════════════════════════════════════════════════════════ */

import { BUILDING_DEFS }  from '../buildings/building.js';
import { drawBuilding }   from '../buildings/buildingSprites.js';
import { drawGround, drawTimeOverlay } from '../render/renderer.js';
import { drawVillager }   from '../villagers/villager.js';
import { perspScale, dist, randRange, randInt, clamp } from '../utils/perspective.js';
import { WORLD_W, WORLD_H } from '../render/camera.js';

/* Import attack-specific modules */
import {
  DefenderBuilding,
  Projectile,
  Particle,
  createExplosion,
  createHitSpark,
  createBloodPuff
} from './attackBuildings.js';

import {
  getRandomName,
  getRandomVillageName,
  getRandomLeaderName,
  generateWaypoints,
  getBuildingRosterForLevel,
  getBuildingLevelForDifficulty,
  isValidBuildingPosition
} from './attackUtils.js';

/* Import villager combat module */
import {
  VillagerProjectile,
  MuzzleFlash,
  AttackAnimation,
  getWeaponConfig,
  getAttackRange,
  getAttackDamage,
  createVillagerProjectile,
  canRangedAttack,
  createMuzzleFlash,
  createAttackAnimation,
  applyAreaDamage
} from './attackVillagerCombat.js';

/* Fixed world size — always identical to the player village world */
export var DEF_WORLD_W = WORLD_W;
export var DEF_WORLD_H = WORLD_H;

/* ── Re-export helpers needed by attack_controller.js & missileWarfare.js ─────── */
export { BUILDING_DEFS, drawBuilding, drawGround, drawTimeOverlay, drawVillager, perspScale, dist, randRange, randInt, clamp };

/* ═══════════════════════════════════════════════════════════════
   MISSILE WARFARE HELPER FUNCTIONS (NEW)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Calculate missile travel time based on distance and missile type
 * @param {number} distance - Distance in pixels between villages
 * @param {string} missileType - 'basic' | 'precision' | 'ballistic' | 'mirv'
 * @param {Object} missileDefs - Optional custom missile config (defaults to MISSILE_COSTS)
 * @returns {number} Travel time in seconds (with ±20% variance)
 */
export function calculateETA(distance, missileType, missileDefs) {
  var defs = missileDefs || {
    basic:     { speed: 150, travelMin: 30,  travelMax: 60  },
    precision: { speed: 120, travelMin: 60,  travelMax: 90  },
    ballistic: { speed: 100, travelMin: 90,  travelMax: 120 },
    mirv:      { speed: 80,  travelMin: 120, travelMax: 180 }
  };
  
  var def = defs[missileType];
  if (!def) def = defs.basic;
  
  // Base travel time from distance / speed
  var baseTime = distance / def.speed;
  
  // Clamp to min/max range
  var clampedTime = clamp(baseTime, def.travelMin, def.travelMax);
  
  // Add ±20% variance for realism
  var variance = 0.8 + Math.random() * 0.4;
  
  return Math.floor(clampedTime * variance);
}

/**
 * Apply missile damage to a building based on missile type
 * @param {DefenderBuilding|Building} building - Target building
 * @param {string} missileType - Missile type for damage calculation
 * @param {number} damagePercent - Override damage percent (0.0-1.0), or use missile defaults
 * @param {Object} missileDefs - Optional custom missile config
 * @returns {Object} Result: { damageApplied, buildingDestroyed, remainingHP }
 */
export function applyMissileDamage(building, missileType, damagePercent, missileDefs) {
  if (!building || !building.maxHp) return { damageApplied: 0, buildingDestroyed: false, remainingHP: building?.hp || 0 };
  
  var defs = missileDefs || {
    basic:     { damage: 0.10 },
    precision: { damage: 0.25 },
    ballistic: { damage: 0.50 },
    mirv:      { damage: 0.50, hits: 3 }
  };
  
  var def = defs[missileType];
  var dmgPercent = damagePercent !== undefined ? damagePercent : (def?.damage || 0.10);
  
  // Calculate damage based on building's max HP
  var damage = Math.floor(building.maxHp * dmgPercent);
  
  // Apply damage
  var oldHP = building.hp;
  building.hp = Math.max(0, building.hp - damage);
  
  // Create explosion effect if building destroyed
  if (building.hp <= 0 && building.hp !== oldHP) {
    // Note: particles array should be passed from caller for effect creation
    // createExplosion(particles, building.x, building.y);
  }
  
  return {
    damageApplied: damage,
    buildingDestroyed: building.hp <= 0,
    remainingHP: building.hp,
    damagePercent: dmgPercent
  };
}

/**
 * Calculate distance between two world coordinates (reuses dist helper)
 * @param {number} x1 - Source X
 * @param {number} y1 - Source Y
 * @param {number} x2 - Target X
 * @param {number} y2 - Target Y
 * @returns {number} Distance in pixels
 */
export function getDistanceBetweenPoints(x1, y1, x2, y2) {
  return dist(x1, y1, x2, y2);
}

/**
 * Get building type that would be hit by missile (random weighted by HP/visibility)
 * @param {Array} buildings - Array of defender buildings
 * @param {string} missileType - For MIRV multi-hit logic
 * @returns {Array} Array of targeted buildings (1 for most, 3 for MIRV)
 */
export function selectMissileTargets(buildings, missileType, missileDefs) {
  if (!buildings || buildings.length === 0) return [];
  
  var defs = missileDefs || {
    mirv: { hits: 3 }
  };
  
  var hits = (missileType === 'mirv' && defs.mirv) ? defs.mirv.hits : 1;
  var targets = [];
  var available = buildings.filter(function(b) { return b.hp > 0 && b.type !== 'mainHall'; });
  
  // Weight selection: prefer high-value targets (defence, production)
  var weights = available.map(function(b) {
    var w = 1;
    if (b.attackRange > 0) w += 3;  // Defence buildings priority
    if (b.prodRate > 0) w += 2;      // Production buildings
    if (b.type === 'storage') w += 1;
    return w;
  });
  
  for (var i = 0; i < hits && available.length > 0; i++) {
    // Weighted random selection
    var totalWeight = weights.reduce(function(a, b) { return a + b; }, 0);
    var rand = Math.random() * totalWeight;
    var cumulative = 0;
    
    for (var j = 0; j < available.length; j++) {
      cumulative += weights[j];
      if (rand <= cumulative) {
        targets.push(available[j]);
        // Remove selected building from pool (no double-hit unless MIRV)
        available.splice(j, 1);
        weights.splice(j, 1);
        break;
      }
    }
  }
  
  return targets;
}

/**
 * Calculate war loot based on damage dealt and defender resources
 * @param {Object} attackerVS - Attacker's game state
 * @param {Object} defenderVS - Defender's game state (simulated)
 * @param {string} missileType - Determines loot multiplier
 * @param {number} buildingsHit - Number of buildings damaged
 * @returns {Object} Loot amounts: { gold, rice, langis, totalValue }
 */
export function calculateWarLoot(attackerVS, defenderVS, missileType, buildingsHit) {
  var baseMultipliers = {
    basic: 0.15,
    precision: 0.25,
    ballistic: 0.40,
    mirv: 0.60
  };
  
  var multiplier = baseMultipliers[missileType] || 0.15;
  var buildingsBonus = Math.min(0.3, (buildingsHit || 1) * 0.1);
  var finalMultiplier = multiplier + buildingsBonus;
  
  // Cap loot at 30% of defender's resources
  var maxLootableGold = Math.floor((defenderVS?.res?.gold || 0) * 0.30);
  var maxLootableRice = Math.floor((defenderVS?.res?.rice || 0) * 0.30);
  var maxLootableLangis = Math.floor((defenderVS?.res?.langis || 0) * 0.30);
  
  return {
    gold: Math.floor(maxLootableGold * finalMultiplier),
    rice: Math.floor(maxLootableRice * finalMultiplier),
    langis: Math.floor(maxLootableLangis * finalMultiplier),
    totalValue: Math.floor(
      maxLootableGold * finalMultiplier + 
      maxLootableRice * finalMultiplier * 2 + 
      maxLootableLangis * finalMultiplier * 3
    )
  };
}

/* ═══════════════════════════════════════════════════════════════
   INTERNAL DRAW HELPERS (same as before, keep all _inlineRenderers)
   ═══════════════════════════════════════════════════════════════ */
// ... (keep all existing _drawFarm, _drawMoog, etc functions)
// ... (keep _inlineRenderers object)

/* ═══════════════════════════════════════════════════════════════
   drawDefenderBuilding — USES THE SAME SPRITE SYSTEM!
   ═══════════════════════════════════════════════════════════════ */
export function drawDefenderBuilding(ctx, bld, WORLD_H, now) {
  var def = BUILDING_DEFS[bld.type];
  if (!def) return;
  var sc = perspScale(bld.y);
  var w  = (def.w || bld.w || 60) * sc;
  var h  = (def.h || bld.h || 40) * sc;
  
  ctx.save();
  ctx.translate(bld.x, bld.y);
  
  if (bld.hp <= 0) {
    _drawRubble(ctx, sc, w, h, def);
    ctx.restore();
    return;
  }
  
  var hpRatio = clamp(bld.hp / bld.maxHp, 0, 1);
  if (hpRatio < 1) {
    ctx.globalAlpha = 0.45 + hpRatio * 0.55;
  }
  
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.12, w * 0.62, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  drawBuilding(ctx, sc, w, h, def, bld.type, bld.level || 1, now, _inlineRenderers);
  
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,225,155,0.82)';
  ctx.font = (11 * sc) + 'px Crimson Pro,serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(def.label, 0, h * 0.28);
  
  // HP bar
  var barW = w * 1.1, barH = 7 * sc;
  var barX = -barW / 2, barY = -h * 1.55;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  _rrect(ctx, barX, barY, barW, barH, 3 * sc);
  ctx.fill();
  ctx.fillStyle = hpRatio > 0.5 ? '#27ae60' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
  _rrect(ctx, barX, barY, barW * hpRatio, barH, 3 * sc);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = (8 * sc) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.ceil(bld.hp) + '/' + bld.maxHp, 0, barY + barH / 2);
  
  ctx.restore();
}

function _drawRubble(ctx, sc, w, h, def) {
  ctx.fillStyle = 'rgba(80,60,40,0.75)';
  ctx.fillRect(-w * 0.45, -h * 0.28, w * 0.9, h * 0.32);
  ctx.fillStyle = 'rgba(100,80,55,0.65)';
  [[-w*0.3,-h*0.35,w*0.18,h*0.1],[w*0.15,-h*0.3,w*0.22,h*0.12],[-w*0.45,-h*0.1,w*0.15,h*0.1]]
    .forEach(function(r){ ctx.fillRect(r[0],r[1],r[2],r[3]); });
  
  if (def.wallColor) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = def.wallColor;
    ctx.fillRect(-w * 0.42, -h * 0.3, w * 0.84, h * 0.34);
    ctx.globalAlpha = 1;
  }
  
  // Smoke/debris
  for (var s = 0; s < 3; s++) {
    ctx.fillStyle = 'rgba(80,80,80,' + (0.25 - s * 0.06) + ')';
    ctx.beginPath();
    ctx.arc((s-1) * w * 0.25, -h * 0.5 - s * h * 0.25, (10 + s*8) * sc, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _rrect(ctx,x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

/* ═══════════════════════════════════════════════════════════════
   drawDefenderVillager — with attack animation support
   ═══════════════════════════════════════════════════════════════ */
export function drawDefenderVillager(ctx, v) {
  drawVillager(ctx, v);
  // Draw attack animation if active
  if (v.attackAnimation && v.attackAnimation.progress < 1) {
    v.attackAnimation.draw(ctx, perspScale(v.y));
  }
}

/* ═══════════════════════════════════════════════════════════════
   drawAttackingTroop
   ═══════════════════════════════════════════════════════════════ */
export function drawAttackingTroop(ctx, troop) {
  if (troop.hp <= 0) return;
  drawVillager(ctx, troop);
  // Draw attack animation for attacking troops too
  if (troop.attackAnimation && troop.attackAnimation.progress < 1) {
    troop.attackAnimation.draw(ctx, perspScale(troop.y));
  }
  
  // HP bar
  var sc  = perspScale(troop.y);
  var bw  = 22 * sc;
  var bh  = 4  * sc;
  var bx  = troop.x - bw / 2;
  var by  = troop.y - 32 * sc;
  var rat = clamp(troop.hp / troop.maxHp, 0, 1);
  
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = rat > 0.5 ? '#2ecc71' : rat > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, bw * rat, bh);
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════
   drawDefenderGround
   ═══════════════════════════════════════════════════════════════ */
export function drawDefenderGround(ctx, W, H) {
  drawGround(ctx, W, H);
}

/* ═══════════════════════════════════════════════════════════════
   GENERATE DEFENDER VILLAGE
   ═══════════════════════════════════════════════════════════════ */
export function generateDefenderVillage(level) {
  level = level || Math.floor(Math.random() * 4) + 1;
  var W = DEF_WORLD_W;
  var H = DEF_WORLD_H;
  var roster = getBuildingRosterForLevel(level);
  
  var coreX1 = W * 0.18, coreX2 = W * 0.82;
  var coreY1 = H * 0.20, coreY2 = H * 0.78;
  
  var placed = [];
  var mainHallLevel = level;
  var mainHall = new DefenderBuilding('mainHall', W * 0.5, H * 0.48, mainHallLevel);
  placed.push(mainHall);
  
  var defTypes = ['moog', 'bantayan', 'kuta', 'pulisya', 'cuartel'];
  var econTypes = ['farm', 'mine', 'storage', 'palengke', 'minalangis'];
  
  var rings = [
    { r: 130, types: [] },
    { r: 230, types: [] },
    { r: 320, types: [] },
  ];
  
  roster.slice(1).forEach(function(t) {
    if (defTypes.indexOf(t) >= 0) rings[0].types.push(t);
    else if (econTypes.indexOf(t) >= 0) rings[2].types.push(t);
    else rings[1].types.push(t);
  });
  
  rings.forEach(function(ring) {
    var count = ring.types.length;
    if (!count) return;
    
    ring.types.forEach(function(type, i) {
      var def = BUILDING_DEFS[type];
      if (!def) return;
      
      var baseAngle = (Math.PI * 2 * i / count) + Math.random() * 0.35 - 0.175;
      
      for (var attempt = 0; attempt < 60; attempt++) {
        var angle = baseAngle + (attempt > 0 ? (Math.random() - 0.5) * 0.5 : 0);
        var r = ring.r * (0.88 + Math.random() * 0.25) + (attempt > 0 ? (Math.random() - 0.5) * 30 : 0);
        var cx = W * 0.5 + Math.cos(angle) * r;
        var cy = H * 0.48 + Math.sin(angle) * r * 0.68;
        
        cx = Math.max(coreX1 + def.w * 0.5, Math.min(coreX2 - def.w * 0.5, cx));
        cy = Math.max(coreY1 + def.h * 0.5, Math.min(coreY2 - def.h * 0.5, cy));
        
        var buildingLevel = getBuildingLevelForDifficulty(level, type);
        
        if (isValidBuildingPosition(placed, type, cx, cy, placed)) {
          var building = new DefenderBuilding(type, cx, cy, buildingLevel);
          placed.push(building);
          break;
        }
      }
    });
  });
  
  var waypoints = generateWaypoints(placed);
  var villagers = [];
  var villagerCount = 4 + level * 2;
  
  var VILLAGER_TYPES_DEF = {
    bantay: { typeIdx: 2, armedType: 'bantay', scale: 1.0, spd: 20, carryIcon: '🗡️' },
    bayani: { typeIdx: 11, armedType: 'bayani', scale: 1.15, spd: 22, carryIcon: '⚔️' },
    marine: { typeIdx: 13, armedType: 'marine', scale: 1.1, spd: 28, carryIcon: '🔱' },
    magsasaka: { typeIdx: 0, armedType: null, scale: 1.0, spd: 25, carryIcon: '🌾' },
    mangangalakal: { typeIdx: 1, armedType: null, scale: 1.0, spd: 30, carryIcon: '📦' },
  };
  
  var PATROL_TYPES = ['bantay', 'bantay', 'magsasaka', 'magsasaka', 'mangangalakal', 'bayani'];
  if (level >= 3) PATROL_TYPES.push('marine');
  
  var coreW = coreX2 - coreX1, coreH = coreY2 - coreY1;
  var defVilHp = 40 + level * 15;
  
  for (var vi = 0; vi < villagerCount; vi++) {
    var vType = PATROL_TYPES[vi % PATROL_TYPES.length];
    var vd = VILLAGER_TYPES_DEF[vType];
    if (!vd) continue;
    
    var armedType = vd.armedType;
    var attackRange = armedType ? getAttackRange(armedType) : 0;
    var attackDamage = armedType ? getAttackDamage(armedType, level) : 0;
    
    var v = {
      id: 'dv_' + vi,
      typeIdx: vd.typeIdx,
      label: getRandomName(),
      gender: Math.random() < 0.5 ? 'male' : 'female',
      personality: ['Masipag', 'Malikhain', 'Masaya', 'Matiyaga'][Math.floor(Math.random() * 4)],
      mood: 'happy',
      x: coreX1 + Math.random() * coreW,
      y: coreY1 + Math.random() * coreH,
      dx: 0, dy: 0,
      spd: vd.spd,
      waitT: Math.random() * 2,
      destX: 0, destY: 0,
      carrying: Math.random() < 0.5,
      carryIcon: vd.carryIcon,
      homeBuilding: null,
      isHome: false,
      isInsideWork: false,
      workBuilding: null,
      workTimer: Math.random() * 60,
      _typeDef: { isArmed: !!armedType, armedType: armedType, scale: vd.scale },
      _typeScale: vd.scale,
      isTraining: false,
      isChild: false,
      age: Math.random() * 60,
      hp: defVilHp,
      maxHp: defVilHp,
      hunger: 20 + Math.random() * 40,
      health: 70 + Math.random() * 30,
      govTrust: 40 + Math.random() * 40,
      happiness: 45 + Math.random() * 40,
      anger: Math.random() * 30,
      attackTimer: 0,
      attackRange: attackRange,
      attackDPS: attackDamage,
      isDefender: true,
      armedType: armedType,
      // Combat animation state
      attackAnimation: null,
      muzzleFlash: null,
      lastAttackTime: 0
    };
    
    if (waypoints.all.length) {
      var wp = waypoints.all[Math.floor(Math.random() * waypoints.all.length)];
      v.destX = wp.wx + (Math.random() - 0.5) * 40;
      v.destY = wp.wy + (Math.random() - 0.5) * 20;
    }
    
    villagers.push(v);
  }
  
  var defPower = level * 80 + Math.floor(Math.random() * 40);
  placed.forEach(function(b) {
    if (b.attackDPS > 0) {
      defPower += Math.floor(b.maxHp * 0.4);
    }
  });
  
  return {
    name: getRandomVillageName(),
    leader: getRandomLeaderName(),
    level: level,
    defPower: Math.floor(defPower),
    goldLoot: level * 130 + Math.floor(Math.random() * 90),
    riceLoot: level * 65 + Math.floor(Math.random() * 45),
    buildings: placed,
    villagers: villagers,
    waypoints: waypoints,
    projectiles: [],
    particles: [],
    muzzleFlashes: [],
    W: W, H: H,
  };
}

/* ═══════════════════════════════════════════════════════════════
   TICK FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */
export function tickDefenderVillagers(villagers, dt, W, H, waypoints) {
  var bx1 = DEF_WORLD_W * 0.18, bx2 = DEF_WORLD_W * 0.82;
  var by1 = DEF_WORLD_H * 0.20, by2 = DEF_WORLD_H * 0.78;
  
  villagers.forEach(function(v) {
    if (v.hp <= 0) return;
    
    // Update attack animation
    if (v.attackAnimation) {
      var animAlive = v.attackAnimation.update(dt);
      if (!animAlive) v.attackAnimation = null;
    }
    
    if (v.waitT > 0) {
      v.waitT -= dt;
      if (v.waitT <= 0 && waypoints && waypoints.all) {
        var wp = waypoints.all[Math.floor(Math.random() * waypoints.all.length)];
        if (wp) {
          v.destX = wp.wx + randRange(-20, 20);
          v.destY = wp.wy + randRange(-10, 10);
          v.destX = clamp(v.destX, bx1, bx2);
          v.destY = clamp(v.destY, by1, by2);
        }
      }
      return;
    }
    
    var dx = v.destX - v.x;
    var dy = v.destY - v.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var spd = v.spd * perspScale(v.y);
    
    if (d < spd * dt + 1) {
      v.x = v.destX;
      v.y = v.destY;
      v.waitT = randRange(1, 4);
    } else {
      v.x += (dx / d) * spd * dt;
      v.y += (dy / d) * spd * dt;
    }
    
    v.x = clamp(v.x, bx1, bx2);
    v.y = clamp(v.y, by1, by2);
  });
}

/* ═══════════════════════════════════════════════════════════════
   LIVE BATTLE TICK with Villager Projectiles & Animations
   ═══════════════════════════════════════════════════════════════ */
export function tickBattle(troops, village, dt) {
  if (!village) return;
  
  var buildings = village.buildings;
  var defVillagers = village.villagers;
  
  // Initialize muzzle flash array if not exists
  if (!village.muzzleFlashes) village.muzzleFlashes = [];
  
  /* Update muzzle flashes */
  village.muzzleFlashes = village.muzzleFlashes.filter(function(flash) {
    return flash.update(dt);
  });
  
  /* Update building projectiles */
  village.projectiles = village.projectiles.filter(function(p) {
    var result = p.update(dt);
    if (result.hit) {
      if (result.target && result.target.hp > 0) {
        // Check for area damage
        if (result.explosionRadius > 0) {
          applyAreaDamage(result.target, result.explosionRadius, result.damage, troops, village.particles);
        } else {
          result.target.hp = Math.max(0, result.target.hp - result.damage);
        }
        createHitSpark(village.particles, result.target.x, result.target.y);
        if (result.target.hp <= 0) {
          createExplosion(village.particles, result.target.x, result.target.y);
        }
      }
      return false;
    }
    return result.lifeRemaining !== false;
  });
  
  /* Attacker movement & attack */
  troops.forEach(function(t) {
    if (t.hp <= 0) return;
    
    if (t.waitT > 0) { t.waitT -= dt; return; }
    
    // Update attack animation
    if (t.attackAnimation) {
      var animAlive = t.attackAnimation.update(dt);
      if (!animAlive) t.attackAnimation = null;
    }
    
    var target = t.target;
    if (!target || target.hp <= 0) {
      target = _nearestAliveBuilding(t.x, t.y, buildings);
      t.target = target;
    }
    
    if (!target) return;
    
    var d = dist(t.x, t.y, target.x, target.y);
    
    if (d > t.attackRange) {
      var ang = Math.atan2(target.y - t.y, target.x - t.x);
      t.x += Math.cos(ang) * t.spd * dt;
      t.y += Math.sin(ang) * t.spd * dt;
    } else {
      t.attackTimer -= dt;
      if (t.attackTimer <= 0) {
        var attackSpeed = 1.0 / (t.dps / 10);
        t.attackTimer = attackSpeed;
        var dmg = t.dps * (0.8 + Math.random() * 0.4);
        
        // Create attack animation
        if (t.armedType) {
          t.attackAnimation = createAttackAnimation(t, t.armedType, target);
          // Play sound
          var config = getWeaponConfig(t.armedType);
          if (window.playSound) window.playSound(config.sound);
        }
        
        target.hp = Math.max(0, target.hp - dmg);
        createHitSpark(village.particles, target.x, target.y);
        if (target.hp <= 0) {
          createExplosion(village.particles, target.x, target.y);
        }
      }
    }
  });
  
  /* Defence buildings shoot */
  buildings.forEach(function(b) {
    if (!b.canAttack()) return;
    b.defTimer = (b.defTimer || 0) - dt;
    if (b.defTimer > 0) return;
    
    var sc = perspScale(b.y);
    var range = b.attackRange * sc;
    var nearestTroop = null, nearestDist = Infinity;
    
    troops.forEach(function(t) {
      if (t.hp <= 0) return;
      var d = dist(b.x, b.y, t.x, t.y);
      if (d < range && d < nearestDist) {
        nearestDist = d;
        nearestTroop = t;
      }
    });
    
    if (nearestTroop) {
      b.defTimer = b.shotCooldown || 2.0;
      var damage = b.attackDPS * (0.8 + Math.random() * 0.4);
      var projectileColor = b.type === 'bantayan' ? '#ffcc00'
                          : b.type === 'pulisya' ? '#5b8cff'
                          : '#ff8800';
      var projectile = new Projectile(b, nearestTroop, damage, projectileColor);
      village.projectiles.push(projectile);
    }
  });
  
  /* Defender villagers attack with ranged weapons */
  defVillagers.forEach(function(dv) {
    if (dv.hp <= 0) return;
    if (!dv.armedType) return;  // Only armed villagers attack
    
    dv.attackTimer = (dv.attackTimer || 0) - dt;
    if (dv.attackTimer > 0) return;
    
    var nearestTroop = null, nearestDist = Infinity;
    troops.forEach(function(t) {
      if (t.hp <= 0) return;
      var d = dist(dv.x, dv.y, t.x, t.y);
      if (d < dv.attackRange && d < nearestDist) {
        nearestDist = d;
        nearestTroop = t;
      }
    });
    
    if (nearestTroop) {
      var config = getWeaponConfig(dv.armedType);
      var attackCooldown = config.attackSpeed;
      dv.attackTimer = attackCooldown;
      
      var damage = getAttackDamage(dv.armedType, Math.floor(dv.hp / 20) || 1);
      damage = damage * (0.7 + Math.random() * 0.6);
      
      // Create attack animation
      dv.attackAnimation = createAttackAnimation(dv, dv.armedType, nearestTroop);
      
      // Create projectile or handle melee
      if (canRangedAttack(dv.armedType)) {
        var projectile = createVillagerProjectile(dv, nearestTroop, dv.armedType, damage);
        if (projectile) {
          village.projectiles.push(projectile);
        }
        // Add muzzle flash for guns
        var muzzleFlash = createMuzzleFlash(dv, dv.armedType);
        if (muzzleFlash) {
          village.muzzleFlashes.push(muzzleFlash);
        }
      } else {
        // Melee attack
        nearestTroop.hp = Math.max(0, nearestTroop.hp - damage);
        createHitSpark(village.particles, nearestTroop.x, nearestTroop.y);
        if (nearestTroop.hp <= 0) {
          createBloodPuff(village.particles, nearestTroop.x, nearestTroop.y);
        }
      }
      
      // Play attack sound
      if (window.playSound && config.sound) {
        window.playSound(config.sound);
      }
    }
  });
  
  /* Update particles */
  village.particles = village.particles.filter(function(p) {
    return p.update(dt);
  });
}

function _nearestAliveBuilding(tx, ty, buildings) {
  var best = null, bestD = Infinity;
  buildings.forEach(function(b) {
    if (!b.isAlive()) return;
    var bonus = b.isDefence ? -80 : b.isMainHall ? -40 : 0;
    var dd = dist(tx, ty, b.x, b.y) + bonus;
    if (dd < bestD) {
      bestD = dd;
      best = b;
    }
  });
  return best;
}

/* ═══════════════════════════════════════════════════════════════
   DRAW BATTLE SCENE with Muzzle Flashes
   ═══════════════════════════════════════════════════════════════ */
export function drawBattleScene(ctx, village, troops, gameTime, inBattle, now) {
  if (!village || !ctx) return;
  
  var W = village.W, H = village.H;
  
  drawDefenderGround(ctx, W, H);
  
  var ents = [];
  
  village.buildings.forEach(function(b) {
    (function(bld) {
      ents.push({ y: bld.y, fn: function() { drawDefenderBuilding(ctx, bld, H, now); } });
    })(b);
  });
  
  village.villagers.forEach(function(v) {
    if (v.hp <= 0) return;
    (function(vil) {
      ents.push({ y: vil.y, fn: function() { drawDefenderVillager(ctx, vil); } });
    })(v);
  });
  
  troops.forEach(function(t) {
    if (t.hp <= 0) return;
    (function(trp) {
      ents.push({ y: trp.y, fn: function() { drawAttackingTroop(ctx, trp); } });
    })(t);
  });
  
  ents.sort(function(a, b) { return a.y - b.y; });
  ents.forEach(function(e) { e.fn(); });
  
  /* Draw projectiles */
  village.projectiles.forEach(function(p) {
    p.draw(ctx);
  });
  
  /* Draw muzzle flashes */
  if (village.muzzleFlashes) {
    village.muzzleFlashes.forEach(function(flash) {
      flash.draw(ctx);
    });
  }
  
  /* Draw particles */
  village.particles.forEach(function(p) {
    p.draw(ctx);
  });
  
  if (inBattle) {
    var fl = 0.07 + 0.05 * Math.sin(now / 70);
    ctx.fillStyle = 'rgba(220,25,25,' + fl + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

/* ═══════════════════════════════════════════════════════════════
   TROOP FACTORY
   ═══════════════════════════════════════════════════════════════ */
var TROOP_DEFS = {
  bantay:   { clothColor:'#2C3E50', skinColor:'#F0DDB0', hat:'helm',  hatColor:'#566573', isArmed:true, armedType:'bantay',   scale:1.0,  hp:80,  dps:8,  spd:40, range:45,  role:'Bantay'   },
  bayani:   { clothColor:'#922B21', skinColor:'#F0DDB0', hat:'helm',  hatColor:'#7B241C', isArmed:true, armedType:'bayani',   scale:1.15, hp:150, dps:18, spd:38, range:50,  role:'Bayani'   },
  marine:   { clothColor:'#1B4F72', skinColor:'#F0DDB0', hat:'helm',  hatColor:'#1A5276', isArmed:true, armedType:'marine',   scale:1.1,  hp:200, dps:28, spd:44, range:80,  role:'Marine'   },
  airforce: { clothColor:'#1C2833', skinColor:'#F0DDB0', hat:'cap',   hatColor:'#17202A', isArmed:true, armedType:'airforce', scale:1.1,  hp:180, dps:38, spd:55, range:120, role:'Air Force' },
};

var troopIdCounter = 0;

/* ═══════════════════════════════════════════════════════════════
   INLINE RENDERERS for buildings without sprite files
   ═══════════════════════════════════════════════════════════════ */
var _inlineRenderers = {
  farm: function(ctx,sc,w,h,def,level,now) {
    var t=now?now/1000:0;
    var rows=Math.min(2+level,5);
    var fw=w*1.1,fh=h*0.9,top=-fh*0.5,rowH=fh/rows;
    for(var r=0;r<rows;r++) {
      var ry=top+r*rowH;
      ctx.fillStyle=(r%2===0)?'rgba(80,140,160,0.72)':'rgba(60,120,140,0.65)';
      ctx.fillRect(-fw*0.5,ry,fw,rowH-1.5*sc);
      var shimmer=Math.sin(t*0.9+r*1.1)*0.12+0.10;
      ctx.fillStyle='rgba(200,240,255,'+shimmer+')';
      ctx.fillRect(-fw*0.3,ry+rowH*0.35,fw*0.6,1.5*sc);
      ctx.fillStyle='#6b4c2a';
      ctx.fillRect(-fw*0.52,ry+rowH-1.5*sc,fw*1.04,3.5*sc);
      var stalksPerRow=Math.floor(fw/(8*sc)),stalkSpacing=fw/(stalksPerRow+1);
      for(var s=0;s<stalksPerRow;s++) {
        var sx=-fw*0.5+stalkSpacing*(s+1);
        var sway=Math.sin(t*1.2+s*0.7+r*2.1)*0.8*sc;
        var stalkH=(rowH*0.62)*(0.85+0.3*((s*7+r*3)%5)/5);
        var stalkBase=ry+rowH-2*sc;
        ctx.strokeStyle='#4a7a28';
        ctx.lineWidth=1.2*sc;
        ctx.beginPath();
        ctx.moveTo(sx,stalkBase);
        ctx.quadraticCurveTo(sx+sway,stalkBase-stalkH*0.5,sx+sway*1.5,stalkBase-stalkH);
        ctx.stroke();
      }
      ctx.strokeStyle='#5a3c18';
      ctx.lineWidth=2*sc;
      ctx.strokeRect(-fw*0.52,top,fw*1.04,fh+2*sc);
    }
  },
  moog: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.beginPath();
    ctx.rect(-w*0.4,-h*0.9,w*0.8,h*1.05);
    ctx.fill();
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.5,-h*0.92,w*1.0,h*0.12);
    for(var mi=-2;mi<=2;mi++) ctx.fillRect(mi*w*0.22-4*sc,-h*1.05,8*sc,14*sc);
    ctx.fillStyle='rgba(10,8,5,0.7)';
    ctx.fillRect(-3*sc,-h*0.6,6*sc,14*sc);
    ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';
    ctx.beginPath();
    ctx.rect(-5*sc,0,10*sc,h*0.2);
    ctx.arc(0,0,5*sc,Math.PI,0,true);
    ctx.fill();
  },
  kuta: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w*0.55,-h*0.4,w*1.1,h*0.55);
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.55,-h*0.45,w*1.1,h*0.1);
    var nParts=Math.floor(w*0.9/12);
    for(var ki=0;ki<nParts;ki++) {
      var kx=-w*0.5+ki*(w/nParts);
      ctx.fillRect(kx,-h*0.56,w*0.04,h*0.15);
    }
  },
  bantayan: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.beginPath();
    ctx.rect(-w*0.35,-h*1.1,w*0.7,h*1.25);
    ctx.fill();
    ctx.fillStyle=def.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w*0.42,-h*1.1);
    ctx.lineTo(0,-h*1.55);
    ctx.lineTo(w*0.42,-h*1.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.42,-h*0.55,w*0.84,h*0.08);
    for(var ai=-1;ai<=1;ai++) ctx.fillRect(ai*w*0.25-4*sc,-h*0.64,8*sc,10*sc);
    ctx.fillStyle=def.doorColor||'rgba(20,15,5,0.95)';
    ctx.beginPath();
    ctx.rect(-5*sc,0,10*sc,h*0.2);
    ctx.arc(0,0,5*sc,Math.PI,0,true);
    ctx.fill();
    ctx.fillStyle='#DAA520';
    ctx.beginPath();
    ctx.moveTo(-3*sc,-h*1.53);
    ctx.lineTo(0,-h*1.7);
    ctx.lineTo(3*sc,-h*1.53);
    ctx.closePath();
    ctx.fill();
  },
  templo: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w*0.58,-h*0.55);
    ctx.lineTo(0,-h*1.0);
    ctx.lineTo(w*0.58,-h*0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle='rgba(50,30,0,0.9)';
    ctx.fillRect(-8*sc,-h*0.35,16*sc,h*0.35);
    ctx.fillStyle='#DAA520';
    ctx.beginPath();
    ctx.arc(0,-h*0.7,6*sc,0,Math.PI*2);
    ctx.fill();
  },
  paaralan: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.6,-h*0.6,w*1.2,h*0.1);
    ctx.fillStyle=def.winColor;
    for(var wi=-1;wi<=1;wi++) ctx.fillRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);
    ctx.fillStyle=def.doorColor||'rgba(80,60,0,0.8)';
    ctx.fillRect(-6*sc,-h*0.28,12*sc,h*0.28);
  },
  ospital: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.55,-h*0.6,w*1.1,h*0.1);
    ctx.fillStyle='#cc2222';
    ctx.fillRect(-3*sc,-h*0.48,6*sc,18*sc);
    ctx.fillRect(-9*sc,-h*0.38,18*sc,6*sc);
    ctx.fillStyle=def.doorColor;
    ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);
  },
  cuartel: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.fillRect(-w*0.55,-h*0.62,w*1.1,h*0.1);
    for(var bi=-2;bi<=2;bi++) ctx.fillRect(bi*w*0.22-5*sc,-h*0.76,10*sc,15*sc);
    ctx.fillStyle='rgba(10,20,5,0.7)';
    for(var si=-1;si<=1;si++) ctx.fillRect(si*w*0.28-2.5*sc,-h*0.53,5*sc,13*sc);
    ctx.fillStyle=def.doorColor||'rgba(10,30,5,0.9)';
    ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);
  },
  pulisya: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w*0.58,-h*0.55);
    ctx.lineTo(0,-h*1.0);
    ctx.lineTo(w*0.58,-h*0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#f5c842';
    ctx.beginPath();
    ctx.arc(0,-h*0.35,8*sc,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle=def.doorColor;
    ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);
  },
  storage: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w*0.58,-h*0.55);
    ctx.lineTo(0,-h*1.12);
    ctx.lineTo(w*0.58,-h*0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle='rgba(100,80,40,0.7)';
    ctx.beginPath();
    ctx.ellipse(0,-h*0.28,8*sc,10*sc,0,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle='#6b4c2a';
    ctx.lineWidth=1.5*sc;
    for(var bi=0;bi<2;bi++) {
      ctx.beginPath();
      ctx.ellipse(0,-h*0.28+(bi-0.5)*8*sc,8*sc,2.5*sc,0,0,Math.PI*2);
      ctx.stroke();
    }
  },
  hukuman: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle=def.wallColor;
    ctx.fillRect(-w/2,-h*0.55,w,h*0.67);
    ctx.fillStyle=def.roofColor;
    ctx.beginPath();
    ctx.moveTo(-w*0.58,-h*0.55);
    ctx.lineTo(0,-h*0.9);
    ctx.lineTo(w*0.58,-h*0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';
    ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);
  },
  minalangis: function(ctx,sc,w,h,def,level) {
    ctx.fillStyle='#3a2808';
    ctx.fillRect(-w*0.5,-h*0.2,w,h*0.32);
    ctx.strokeStyle='#5a3a10';
    ctx.lineWidth=3.5*sc;
    ctx.beginPath();
    ctx.moveTo(-w*0.35,0);
    ctx.lineTo(0,-h*1.05);
    ctx.lineTo(w*0.35,0);
    ctx.stroke();
    ctx.lineWidth=2*sc;
    ctx.strokeStyle='#4a2a08';
    ctx.beginPath();
    ctx.moveTo(-w*0.25,-h*0.35);
    ctx.lineTo(w*0.25,-h*0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w*0.18,-h*0.65);
    ctx.lineTo(w*0.18,-h*0.65);
    ctx.stroke();
  }
};

export function createTroop(role, spawnX, spawnY) {
  var td = TROOP_DEFS[role];
  if (!td) return null;
  return {
    id:        'trp_' + (troopIdCounter++),
    role:      role,
    x:         spawnX,
    y:         spawnY,
    hp:        td.hp,
    maxHp:     td.hp,
    dps:       td.dps,
    spd:       td.spd,
    attackRange: td.range,
    attackTimer: 0.5 + Math.random(),
    target:    null,
    waitT:     0,
    armedType: td.armedType,
    /* drawVillager fields */
    typeIdx:    2,
    _typeDef:   Object.assign({}, td, { type: role }),
    _typeScale: td.scale,
    carrying:   null,
    mood:       'matapang',
    gender:     'male',
    label:      td.role,
    isChild:    false,
    isHome:     false,
    isTraining: false,
    hunger:     0,
    health:     100,
    attackAnimation: null,
  };
}

export { TROOP_DEFS };

/* ── Backward compatibility exports ─────────────────────────── */
export function spawnExplosionPublic(particles, x, y) {
  createExplosion(particles, x, y);
}