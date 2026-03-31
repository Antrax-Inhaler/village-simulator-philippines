/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/missileWarfare.js
   Core Missile Warfare Logic (Single-Player Simulated)
   
   Handles:
   - Missile launch validation & queue management
   - Travel tracking with localStorage persistence
   - Interception calculation (Radar + Interceptor Battery)
   - Impact resolution (damage, loot, penalties)
   - Spam attack protection
═══════════════════════════════════════════════════════════════ */

import { 
  calculateETA, 
  applyMissileDamage, 
  selectMissileTargets, 
  calculateWarLoot,
  getDistanceBetweenPoints
} from './attack.js';

import { 
  MISSILE_COSTS, 
  deductMissileCost, 
  useMissileFromInventory,
  useInterceptorFromInventory,
  applyWarLoot,
  applySpamPenalty,
  getMissileInventorySummary
} from '../resources/economy.js';

import { 
  loadGame, 
  saveGame 
} from '../utils/storage.js';

/* ══════════════════════════════════════════════════════════════
   Constants & Configuration
══════════════════════════════════════════════════════════════ */
export var MISSILE_CONFIG = {
  // Spam protection limits
  MAX_ATTACKS_PER_DAY: 5,
  MAX_ATTACKS_SAME_PLAYER_PER_WEEK: 3,
  COOLDOWN_SAME_PLAYER_HOURS: 12,
  OFFLINE_PROTECTION_HOURS: 8,
  
  // Penalty values
  PENALTY_SAME_PLAYER: { trust: 10, rank: 5 },
  PENALTY_DIFFERENT_PLAYERS: { trust: 5, rank: 2 },
  
  // Interception base chances
  INTERCEPT_RADAR_BONUS: 10,
  INTERCEPT_BATTERY_BASE: 40,
  INTERCEPT_BATTERY_BONUS_PER_UNIT: 10,
  INTERCEPT_BATTERY_MAX: 80,
  INTERCEPT_MISSILE_STOCK_MIN: 60,
  
  // Missile travel
  MIN_TRAVEL_TIME: 30,
  MAX_TRAVEL_TIME: 180,
  CANCEL_WINDOW_SECONDS: 10,
  
  // Persistence
  SAVE_INTERVAL_SECONDS: 30,
  HISTORY_MAX_ENTRIES: 50
};

/* ══════════════════════════════════════════════════════════════
   Internal State (managed by main.js via VS)
══════════════════════════════════════════════════════════════ */
// Note: State is stored in VS.missiles, VS.warState, VS.missileInventory
// This module provides pure functions that operate on that state

/* ══════════════════════════════════════════════════════════════
   Spam Protection Helpers
══════════════════════════════════════════════════════════════ */

/**
 * Check if player can attack a target (spam protection)
 * @param {Object} warState - VS.warState object
 * @param {string} targetName - Name of target village
 * @param {number} currentTime - Current timestamp (Date.now())
 * @param {number} currentDay - Current in-game day
 * @returns {Object} { ok: boolean, reason: string|null }
 */
export function canAttackTarget(warState, targetName, currentTime, currentDay) {
  var now = currentTime || Date.now();
  var day = currentDay || 1;
  
  // Check daily attack limit
  if (warState.dailyAttackCount >= MISSILE_CONFIG.MAX_ATTACKS_PER_DAY) {
    return { ok: false, reason: 'Naabot na ang limit ng ' + MISSILE_CONFIG.MAX_ATTACKS_PER_DAY + ' attacks ngayong araw.' };
  }
  
  // Check weekly limit for same player
  var weeklyAttacks = (warState.weeklyAttacks || []).filter(function(a) {
    return a.timestamp > now - 7 * 24 * 60 * 60 * 1000;
  });
  var samePlayerWeekly = weeklyAttacks.filter(function(a) {
    return a.targetName === targetName;
  });
  if (samePlayerWeekly.length >= MISSILE_CONFIG.MAX_ATTACKS_SAME_PLAYER_PER_WEEK) {
    return { ok: false, reason: 'Pwede lang umatake ng ' + MISSILE_CONFIG.MAX_ATTACKS_SAME_PLAYER_PER_WEEK + ' beses kada linggo sa parehong player.' };
  }
  
  // Check 12h cooldown for same player (unless retaliation)
  var recentSame = (warState.attacksMade || []).filter(function(a) {
    return a.targetName === targetName && a.timestamp > now - MISSILE_CONFIG.COOLDOWN_SAME_PLAYER_HOURS * 60 * 60 * 1000;
  });
  if (recentSame.length > 0) {
    // Check if defender retaliated after our last attack
    var lastAttack = recentSame[recentSame.length - 1];
    var retaliation = (warState.attacksReceived || []).find(function(a) {
      return a.attackerName === targetName && a.timestamp > lastAttack.timestamp;
    });
    if (!retaliation) {
      return { ok: false, reason: 'Pwede lang umatake ng isa kada ' + MISSILE_CONFIG.COOLDOWN_SAME_PLAYER_HOURS + ' oras sa parehong player (maliban kung may retaliation).' };
    }
  }
  
  // Check offline protection (simulated: skip for random opponents)
  // In real multiplayer: check defender's lastLoginTime
  
  return { ok: true, reason: null };
}

/**
 * Record an attack for spam tracking
 * @param {Object} warState - VS.warState object
 * @param {string} targetName - Name of target village
 * @param {number} currentTime - Current timestamp
 * @param {number} currentDay - Current in-game day
 */
export function recordAttackMade(warState, targetName, currentTime, currentDay) {
  var now = currentTime || Date.now();
  var day = currentDay || 1;
  
  // Add to attacksMade list
  warState.attacksMade = warState.attacksMade || [];
  warState.attacksMade.push({
    targetName: targetName,
    timestamp: now,
    day: day
  });
  
  // Update last attack time
  warState.lastAttackTime = now;
  
  // Increment daily count
  warState.dailyAttackCount = (warState.dailyAttackCount || 0) + 1;
  
  // Track for weekly limit
  warState.weeklyAttacks = warState.weeklyAttacks || [];
  warState.weeklyAttacks.push({ targetName: targetName, timestamp: now });
  
  // Clean up old records (keep last 7 days)
  var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  warState.attacksMade = warState.attacksMade.filter(function(a) {
    return a.timestamp > weekAgo;
  });
  warState.weeklyAttacks = warState.weeklyAttacks.filter(function(a) {
    return a.timestamp > weekAgo;
  });
}

/**
 * Record a received attack (for retaliation detection)
 * @param {Object} warState - VS.warState object
 * @param {string} attackerName - Name of attacker village
 * @param {number} currentTime - Current timestamp
 */
export function recordAttackReceived(warState, attackerName, currentTime) {
  var now = currentTime || Date.now();
  
  warState.attacksReceived = warState.attacksReceived || [];
  warState.attacksReceived.push({
    attackerName: attackerName,
    timestamp: now
  });
  
  // Check if this is a retaliation (attacker also attacked us recently)
  var recentAttackByUs = (warState.attacksMade || []).find(function(a) {
    return a.targetName === attackerName && a.timestamp > now - 24 * 60 * 60 * 1000;
  });
  
  if (recentAttackByUs) {
    // Mark as war active - no penalties for either side
    warState.lastRetaliationTime = now;
  }
  
  warState.lastAttackTime = now;
}

/**
 * Apply spam penalty if attack violates rules
 * @param {Object} warState - VS.warState object
 * @param {Object} VS - Full game state
 * @param {string} targetName - Target village name
 * @param {function} showMsgFn - Message display function
 * @returns {boolean} True if penalty was applied
 */
export function checkAndApplySpamPenalty(warState, VS, targetName, showMsgFn) {
  var now = Date.now();
  
  // Check if war is active (both attacking each other within 24h)
  var recentAttackByUs = (warState.attacksMade || []).find(function(a) {
    return a.targetName === targetName && a.timestamp > now - 24 * 60 * 60 * 1000;
  });
  var recentRetaliation = (warState.attacksReceived || []).find(function(a) {
    return a.attackerName === targetName && a.timestamp > (recentAttackByUs?.timestamp || 0);
  });
  
  // If war active, no penalty
  if (recentAttackByUs && recentRetaliation) {
    return false;
  }
  
  // Determine penalty type
  var penaltyType = 'differentPlayers';
  if (recentAttackByUs && !recentRetaliation) {
    penaltyType = 'samePlayer';
  }
  
  // Apply penalty via economy module
  if (applySpamPenalty) {
    return applySpamPenalty(penaltyType, VS, showMsgFn);
  }
  
  return false;
}

/* ══════════════════════════════════════════════════════════════
   Interception Logic
══════════════════════════════════════════════════════════════ */

/**
 * Calculate interception chance for a missile
 * @param {Object} defenderVS - Defender's game state
 * @param {string} missileType - Missile type being intercepted
 * @returns {Object} { chance: number, canIntercept: boolean, reason?: string }
 */
export function calculateInterceptChance(defenderVS, missileType) {
  var buildings = defenderVS?.buildings || [];
  
  // Check for Radar Station
  var hasRadar = buildings.some(function(b) {
    return b.type === 'radarstation' && b.hp > 0;
  });
  
  // Check for Interceptor Batteries
  var interceptorBatteries = buildings.filter(function(b) {
    return b.type === 'interceptor' && b.hp > 0;
  });
  var batteryCount = interceptorBatteries.length;
  
  // Check for interceptor missiles in stock
  var hasInterceptorStock = (defenderVS?.missileInventory?.interceptor || 0) > 0;
  
  // Ballistic/MIRV can only be intercepted by Interceptor Battery
  var isHeavyMissile = missileType === 'ballistic' || missileType === 'mirv';
  if (isHeavyMissile && batteryCount === 0) {
    return { chance: 0, canIntercept: false, reason: 'Ballistic/MIRV missiles can only be intercepted by Interceptor Battery.' };
  }
  
  // Calculate base chance
  var chance = 0;
  
  // Radar bonus
  if (hasRadar) {
    chance += MISSILE_CONFIG.INTERCEPT_RADAR_BONUS;
  }
  
  // Interceptor Battery bonus
  if (batteryCount > 0) {
    chance += MISSILE_CONFIG.INTERCEPT_BATTERY_BASE;
    chance += Math.min(
      (batteryCount - 1) * MISSILE_CONFIG.INTERCEPT_BATTERY_BONUS_PER_UNIT,
      MISSILE_CONFIG.INTERCEPT_BATTERY_MAX - MISSILE_CONFIG.INTERCEPT_BATTERY_BASE
    );
  }
  
  // Interceptor missile stock bonus (overrides if higher)
  if (hasInterceptorStock) {
    chance = Math.max(chance, MISSILE_CONFIG.INTERCEPT_MISSILE_STOCK_MIN);
  }
  
  // Cap at max
  chance = Math.min(chance, MISSILE_CONFIG.INTERCEPT_BATTERY_MAX);
  
  return {
    chance: chance,
    canIntercept: chance > 0,
    hasRadar: hasRadar,
    batteryCount: batteryCount,
    hasInterceptorStock: hasInterceptorStock
  };
}

/**
 * Attempt to intercept a missile
 * @param {Object} defenderVS - Defender's game state
 * @param {string} missileType - Missile type being intercepted
 * @param {function} showMsgFn - Optional message function
 * @returns {Object} { intercepted: boolean, chance: number, consumedInterceptor: boolean }
 */
export function attemptIntercept(defenderVS, missileType, showMsgFn) {
  var interceptInfo = calculateInterceptChance(defenderVS, missileType);
  
  if (!interceptInfo.canIntercept) {
    return { intercepted: false, chance: 0, consumedInterceptor: false };
  }
  
  // Roll for interception
  var intercepted = Math.random() * 100 < interceptInfo.chance;
  
  // Consume interceptor missile if used and successful
  var consumedInterceptor = false;
  if (intercepted && interceptInfo.hasInterceptorStock) {
    if (useInterceptorFromInventory) {
      useInterceptorFromInventory(defenderVS, showMsgFn);
      consumedInterceptor = true;
    }
  }
  
  return {
    intercepted: intercepted,
    chance: interceptInfo.chance,
    consumedInterceptor: consumedInterceptor,
    reason: intercepted ? 'Missile successfully intercepted!' : 'Interception failed.'
  };
}

/* ══════════════════════════════════════════════════════════════
   Missile Launch & Travel
══════════════════════════════════════════════════════════════ */

/**
 * Create a new missile object
 * @param {string} missileType - Type of missile
 * @param {Object} target - Target info { x, y, zone, name }
 * @param {Object} attackerVS - Attacker's game state
 * @param {number} currentTime - Launch timestamp
 * @returns {Object} Missile object
 */
export function createMissile(missileType, target, attackerVS, currentTime) {
  var def = MISSILE_COSTS[missileType];
  if (!def) return null;
  
  // Calculate distance and ETA
  var playerPos = { x: attackerVS.buildings[0]?.x || 0, y: attackerVS.buildings[0]?.y || 0 };
  var distance = getDistanceBetweenPoints(playerPos.x, playerPos.y, target.x, target.y);
  var travelTime = calculateETA(distance, missileType);
  
  return {
    id: 'm_' + currentTime + '_' + Math.floor(Math.random() * 10000),
    type: missileType,
    targetX: target.x,
    targetY: target.y,
    targetZone: target.zone,
    targetName: target.name,
    launchTime: currentTime,
    impactTime: currentTime + travelTime * 1000,
    eta: travelTime,
    status: 'traveling',
    damage: 0,
    buildingHit: null,
    lootGained: 0,
    cancelled: false,
    // For visual tracking
    currentX: playerPos.x,
    currentY: playerPos.y,
    progress: 0
  };
}

/**
 * Launch a missile (full validation + state update)
 * @param {Object} params - Launch parameters
 * @param {string} params.missileType - Type of missile
 * @param {Object} params.target - Target { x, y, zone, name }
 * @param {Object} params.attackerVS - Attacker's game state
 * @param {number} params.currentTime - Current timestamp
 * @param {number} params.currentDay - Current in-game day
 * @param {function} params.showMsgFn - Message function
 * @returns {Object} { ok: boolean, missile?: Object, msg: string }
 */
export function launchMissile(params) {
  var missileType = params.missileType;
  var target = params.target;
  var VS = params.attackerVS;
  var now = params.currentTime || Date.now();
  var day = params.currentDay || 1;
  var showMsg = params.showMsgFn || function() {};
  
  // Validate missile type
  if (!MISSILE_COSTS[missileType]) {
    return { ok: false, msg: 'Hindi kilala ang missile type.' };
  }
  
  // Check spam protection
  var canAttack = canAttackTarget(VS.warState, target.name, now, day);
  if (!canAttack.ok) {
    return { ok: false, msg: canAttack.reason };
  }
  
  // Check resources and inventory
  if (!deductMissileCost) {
    return { ok: false, msg: 'Missile economy system not initialized.' };
  }
  
  if (!deductMissileCost(missileType, 1, VS, showMsg)) {
    return { ok: false, msg: 'Kulang ang resources para sa missile na ito.' };
  }
  
  if (!useMissileFromInventory(missileType, VS, showMsg)) {
    return { ok: false, msg: 'Wala kang missile na ganito sa inventory!' };
  }
  
  // Create missile
  var missile = createMissile(missileType, target, VS, now);
  if (!missile) {
    return { ok: false, msg: 'Failed to create missile.' };
  }
  
  // Add to outgoing queue
  VS.missiles = VS.missiles || { outgoing: [], incoming: [], history: [] };
  VS.missiles.outgoing.push(missile);
  
  // Record attack for spam tracking
  recordAttackMade(VS.warState, target.name, now, day);
  
  // Show confirmation
  showMsg('🚀 Inilunsad ang ' + missileType.toUpperCase() + ' missile papunta sa ' + target.name + '! ETA: ' + missile.eta + 's', 'info');
  
  return { ok: true, missile: missile, msg: 'Missile launched successfully.' };
}

/**
 * Cancel an outgoing missile (within cancel window)
 * @param {string} missileId - ID of missile to cancel
 * @param {Object} VS - Game state
 * @param {number} currentTime - Current timestamp
 * @param {function} showMsgFn - Message function
 * @returns {Object} { ok: boolean, refunded?: Object }
 */
export function cancelMissile(missileId, VS, currentTime, showMsgFn) {
  var missile = (VS.missiles?.outgoing || []).find(function(m) {
    return m.id === missileId;
  });
  
  if (!missile) {
    return { ok: false, msg: 'Missile not found.' };
  }
  
  // Check cancel window
  var elapsed = (currentTime - missile.launchTime) / 1000;
  if (elapsed > MISSILE_CONFIG.CANCEL_WINDOW_SECONDS) {
    return { ok: false, msg: 'Hindi na ma-cancel ang missile—nasa hangin na!' };
  }
  
  // Mark as cancelled
  missile.cancelled = true;
  missile.status = 'cancelled';
  
  // Refund 50% of cost
  var cost = MISSILE_COSTS[missile.type];
  var refunded = {
    gold: Math.floor(cost.gold * 0.5),
    langis: Math.floor(cost.langis * 0.5)
  };
  
  VS.res.gold = Math.min(VS.resCap.gold, (VS.res.gold || 0) + refunded.gold);
  VS.res.langis = Math.min(VS.resCap.langis, (VS.res.langis || 0) + refunded.langis);
  
  // Return missile to inventory (optional design choice)
  // VS.missileInventory[missile.type] = (VS.missileInventory[missile.type] || 0) + 1;
  
  if (showMsgFn) {
    showMsgFn('✅ Na-cancel ang missile. 50% ng gastos na-refund: ' + refunded.gold + '🪙 ' + refunded.langis + '🛢️', 'info');
  }
  
  return { ok: true, refunded: refunded };
}

/**
 * Update missile positions and check for impacts
 * @param {Object} VS - Game state
 * @param {number} currentTime - Current timestamp
 * @param {function} showMsgFn - Message function
 * @returns {Object} { impacted: [], intercepted: [] }
 */
export function updateMissiles(VS, currentTime, showMsgFn) {
  var impacted = [];
  var intercepted = [];
  
  // Process outgoing missiles
  if (VS.missiles?.outgoing) {
    VS.missiles.outgoing = VS.missiles.outgoing.filter(function(missile) {
      if (missile.status !== 'traveling' || missile.cancelled) {
        return false; // Remove cancelled/finished missiles
      }
      
      // Update position for visual tracking
      var progress = Math.min(1, (currentTime - missile.launchTime) / (missile.impactTime - missile.launchTime));
      missile.progress = progress;
      missile.currentX = missile.targetX * progress + (missile.currentX || missile.targetX) * (1 - progress);
      missile.currentY = missile.targetY * progress + (missile.currentY || missile.targetY) * (1 - progress);
      
      // Check for impact
      if (currentTime >= missile.impactTime) {
        missile.status = 'impacted';
        impacted.push({ type: 'outgoing', missile: missile });
        return false; // Remove from active queue
      }
      
      return true; // Keep active
    });
  }
  
  // Process incoming missiles (simulated attacks on player)
  if (VS.missiles?.incoming) {
    VS.missiles.incoming = VS.missiles.incoming.filter(function(missile) {
      if (missile.status !== 'traveling') {
        return false;
      }
      
      if (currentTime >= missile.impactTime) {
        // Attempt interception
        var interceptResult = attemptIntercept(VS, missile.type, showMsgFn);
        
        if (interceptResult.intercepted) {
          missile.status = 'intercepted';
          missile.intercepted = true;
          intercepted.push({ missile: missile, chance: interceptResult.chance });
        } else {
          missile.status = 'impacted';
          impacted.push({ type: 'incoming', missile: missile });
        }
        return false; // Remove from active queue
      }
      
      return true; // Keep active
    });
  }
  
  return { impacted: impacted, intercepted: intercepted };
}

/* ══════════════════════════════════════════════════════════════
   Impact Resolution
══════════════════════════════════════════════════════════════ */

/**
 * Resolve an outgoing missile impact (attacker's perspective)
 * @param {Object} missile - The impacted missile
 * @param {Object} attackerVS - Attacker's game state
 * @param {Object} simulatedDefender - Simulated defender state for damage calc
 * @param {function} showMsgFn - Message function
 * @returns {Object} Impact result
 */
export function resolveOutgoingImpact(missile, attackerVS, simulatedDefender, showMsgFn) {
  var def = MISSILE_COSTS[missile.type];
  if (!def) return { error: 'Unknown missile type' };
  
  // Select targets (MIRV hits multiple)
  var targets = selectMissileTargets(simulatedDefender.buildings, missile.type);
  
  // Apply damage
  var totalDamage = 0;
  var buildingsHit = 0;
  
  targets.forEach(function(building) {
    var result = applyMissileDamage(building, missile.type);
    totalDamage += result.damageApplied;
    if (result.buildingDestroyed) buildingsHit++;
  });
  
  // Calculate and apply loot
  var loot = calculateWarLoot(attackerVS, simulatedDefender, missile.type, buildingsHit);
  if (applyWarLoot) {
    applyWarLoot(attackerVS, simulatedDefender, loot, showMsgFn);
  }
  
  // Record in history
  var historyEntry = {
    id: missile.id,
    type: 'outgoing',
    target: missile.targetName,
    missileType: missile.type,
    result: 'hit',
    damage: Math.floor(def.damage * 100) + '%',
    buildingsHit: buildingsHit,
    loot: loot,
    timestamp: Date.now(),
    day: window.dayCount || 1
  };
  
  attackerVS.missiles = attackerVS.missiles || { history: [] };
  attackerVS.missiles.history.unshift(historyEntry);
  if (attackerVS.missiles.history.length > MISSILE_CONFIG.HISTORY_MAX_ENTRIES) {
    attackerVS.missiles.history.pop();
  }
  
  // Show impact message
  if (showMsgFn && buildingsHit > 0) {
    showMsgFn('💥 Tumama ang ' + missile.type.toUpperCase() + ' sa ' + missile.targetName + '! ' + buildingsHit + ' gusali nasira.', 'success');
  }
  
  return {
    success: true,
    buildingsHit: buildingsHit,
    loot: loot,
    historyEntry: historyEntry
  };
}

/**
 * Resolve an incoming missile impact (defender's perspective)
 * @param {Object} missile - The impacted missile
 * @param {Object} defenderVS - Defender's game state
 * @param {function} showMsgFn - Message function
 * @returns {Object} Impact result
 */
export function resolveIncomingImpact(missile, defenderVS, showMsgFn) {
  var def = MISSILE_COSTS[missile.type];
  if (!def) return { error: 'Unknown missile type' };
  
  // Apply damage to player buildings (simulated)
  var damaged = [];
  var buildings = defenderVS.buildings || [];
  
  // Select random non-mainHall buildings to damage
  var available = buildings.filter(function(b) {
    return b.hp > 0 && b.type !== 'mainHall';
  });
  
  var hits = def.hits || 1;
  for (var i = 0; i < hits && available.length > 0; i++) {
    var target = available[Math.floor(Math.random() * available.length)];
    var dmg = Math.floor((target.maxHp || 100) * def.damage);
    target.hp = Math.max(1, target.hp - dmg); // Never destroy completely
    damaged.push({ type: target.type, damage: dmg });
    // Remove from pool to avoid double-hit
    available = available.filter(function(b) { return b !== target; });
  }
  
  // Deduct some resources as "loot" for simulated attacker
  var lootGold = Math.floor((defenderVS.res?.gold || 0) * 0.1);
  var lootRice = Math.floor((defenderVS.res?.rice || 0) * 0.1);
  defenderVS.res.gold = Math.max(0, (defenderVS.res.gold || 0) - lootGold);
  defenderVS.res.rice = Math.max(0, (defenderVS.res.rice || 0) - lootRice);
  
  // Record in history
  var historyEntry = {
    id: missile.id,
    type: 'incoming',
    attacker: missile.attackerName,
    missileType: missile.type,
    result: 'hit',
    damage: damaged,
    lootLost: { gold: lootGold, rice: lootRice },
    timestamp: Date.now(),
    day: window.dayCount || 1
  };
  
  defenderVS.missiles = defenderVS.missiles || { history: [] };
  defenderVS.missiles.history.unshift(historyEntry);
  if (defenderVS.missiles.history.length > MISSILE_CONFIG.HISTORY_MAX_ENTRIES) {
    defenderVS.missiles.history.pop();
  }
  
  // Show warning
  if (showMsgFn && damaged.length > 0) {
    showMsgFn('⚠️ Tinamaan ng ' + missile.type.toUpperCase() + ' missile! ' + damaged.length + ' gusali nasira.', 'danger');
  }
  
  return {
    success: true,
    damaged: damaged,
    lootLost: { gold: lootGold, rice: lootRice },
    historyEntry: historyEntry
  };
}

/**
 * Handle intercepted missile (defender's perspective)
 * @param {Object} missile - The intercepted missile
 * @param {Object} defenderVS - Defender's game state
 * @param {number} interceptChance - Chance that was rolled
 * @param {function} showMsgFn - Message function
 * @returns {Object} Intercept result
 */
export function resolveInterception(missile, defenderVS, interceptChance, showMsgFn) {
  // Record in history
  var historyEntry = {
    id: missile.id,
    type: 'incoming',
    attacker: missile.attackerName,
    missileType: missile.type,
    result: 'intercepted',
    interceptChance: interceptChance,
    timestamp: Date.now(),
    day: window.dayCount || 1
  };
  
  defenderVS.missiles = defenderVS.missiles || { history: [] };
  defenderVS.missiles.history.unshift(historyEntry);
  if (defenderVS.missiles.history.length > MISSILE_CONFIG.HISTORY_MAX_ENTRIES) {
    defenderVS.missiles.history.pop();
  }
  
  if (showMsgFn) {
    showMsgFn('🛡️ Na-intercept ang incoming ' + missile.type.toUpperCase() + ' missile! (' + interceptChance + '% chance)', 'success');
  }
  
  return {
    success: true,
    historyEntry: historyEntry
  };
}

/* ══════════════════════════════════════════════════════════════
   Persistence Helpers (localStorage)
══════════════════════════════════════════════════════════════ */

/**
 * Save missile state to localStorage
 * @param {Object} VS - Game state
 * @param {number} dayCount - Current day
 */
export function saveMissileState(VS, dayCount) {
  if (!saveGame) return;
  
  // Trigger autosave with missile state included
  // Note: main.js should call this periodically or on state changes
  saveGame(VS, dayCount, null, {
    playerGold: VS.playerGold || 0,
    playerRice: VS.playerRice || 0,
    corruptionHistory: VS.corruptionHistory || []
  });
}

/**
 * Load and process missiles that impacted while game was closed
 * @param {Object} VS - Game state
 * @param {number} currentTime - Current timestamp
 * @param {function} showMsgFn - Message function
 * @returns {Object} { processed: number, results: [] }
 */
export function processOfflineImpacts(VS, currentTime, showMsgFn) {
  var processed = 0;
  var results = [];
  
  // Process outgoing missiles
  if (VS.missiles?.outgoing) {
    VS.missiles.outgoing = VS.missiles.outgoing.filter(function(missile) {
      if (missile.status === 'traveling' && currentTime >= missile.impactTime && !missile.cancelled) {
        // Simulate defender for damage calc
        var simulatedDefender = {
          buildings: (VS.buildings || []).map(function(b) {
            return { type: b.type, hp: b.hp, maxHp: b.maxHp || 100 };
          }),
          res: {
            gold: (VS.res?.gold || 0) * 0.3,
            rice: (VS.res?.rice || 0) * 0.3,
            langis: (VS.res?.langis || 0) * 0.3
          }
        };
        
        var result = resolveOutgoingImpact(missile, VS, simulatedDefender, showMsgFn);
        results.push({ type: 'outgoing', missile: missile, result: result });
        processed++;
        return false; // Remove from active queue
      }
      return missile.status === 'traveling' && !missile.cancelled;
    });
  }
  
  // Process incoming missiles
  if (VS.missiles?.incoming) {
    VS.missiles.incoming = VS.missiles.incoming.filter(function(missile) {
      if (missile.status === 'traveling' && currentTime >= missile.impactTime) {
        var interceptInfo = calculateInterceptChance(VS, missile.type);
        var intercepted = Math.random() * 100 < interceptInfo.chance;
        
        if (intercepted) {
          resolveInterception(missile, VS, interceptInfo.chance, showMsgFn);
          results.push({ type: 'incoming', missile: missile, intercepted: true });
        } else {
          resolveIncomingImpact(missile, VS, showMsgFn);
          results.push({ type: 'incoming', missile: missile, intercepted: false });
        }
        processed++;
        return false; // Remove from active queue
      }
      return missile.status === 'traveling';
    });
  }
  
  return { processed: processed, results: results };
}

/* ══════════════════════════════════════════════════════════════
   Utility Functions
══════════════════════════════════════════════════════════════ */

/**
 * Get missile tracking data for UI
 * @param {Object} VS - Game state
 * @param {number} currentTime - Current timestamp
 * @returns {Object} UI-ready missile data
 */
export function getMissileTrackingData(VS, currentTime) {
  var now = currentTime || Date.now();
  
  return {
    outgoing: (VS.missiles?.outgoing || []).map(function(m) {
      var remaining = Math.max(0, Math.floor((m.impactTime - now) / 1000));
      var progress = m.progress || (1 - remaining / m.eta);
      return {
        id: m.id,
        type: m.type,
        target: m.targetName,
        zone: m.targetZone,
        eta: remaining,
        progress: clamp(progress, 0, 1),
        status: m.status,
        canCancel: !m.cancelled && (now - m.launchTime) < MISSILE_CONFIG.CANCEL_WINDOW_SECONDS * 1000,
        currentX: m.currentX,
        currentY: m.currentY
      };
    }),
    incoming: (VS.missiles?.incoming || []).map(function(m) {
      var remaining = Math.max(0, Math.floor((m.impactTime - now) / 1000));
      return {
        id: m.id,
        type: m.type,
        attacker: m.attackerName,
        eta: remaining,
        status: m.status,
        intercepted: m.intercepted
      };
    }),
    history: (VS.missiles?.history || []).slice(0, 10),
    inventory: getMissileInventorySummary ? getMissileInventorySummary(VS) : {}
  };
}

/**
 * Generate a simulated enemy village for targeting
 * @param {number} level - Difficulty level (1-6)
 * @param {Object} playerVS - Player's state for loot calculation
 * @returns {Object} Simulated defender village
 */
export function generateSimulatedDefender(level, playerVS) {
  // Reuse attack.js generateDefenderVillage if available
  if (typeof window.generateDefenderVillage === 'function') {
    return window.generateDefenderVillage(level);
  }
  
  // Fallback minimal simulation
  return {
    name: 'Nayon ni ' + ['Juan', 'Maria', 'Pedro', 'Ana'][Math.floor(Math.random() * 4)],
    level: level || Math.floor(Math.random() * 4) + 1,
    buildings: [
      { type: 'mainHall', hp: 200, maxHp: 200 },
      { type: 'farm', hp: 50, maxHp: 50 },
      { type: 'storage', hp: 80, maxHp: 80 }
    ],
    res: {
      gold: Math.floor((playerVS?.res?.gold || 1000) * 0.3),
      rice: Math.floor((playerVS?.res?.rice || 500) * 0.3),
      langis: Math.floor((playerVS?.res?.langis || 200) * 0.3)
    }
  };
}

// /* ══════════════════════════════════════════════════════════════
//    Export Public API
// ══════════════════════════════════════════════════════════════ */
// export {
//   // Spam protection
//   canAttackTarget,
//   recordAttackMade,
//   recordAttackReceived,
//   checkAndApplySpamPenalty,
  
//   // Interception
//   calculateInterceptChance,
//   attemptIntercept,
  
//   // Launch & travel
//   createMissile,
//   launchMissile,
//   cancelMissile,
//   updateMissiles,
  
//   // Impact resolution
//   resolveOutgoingImpact,
//   resolveIncomingImpact,
//   resolveInterception,
  
//   // Persistence
//   saveMissileState,
//   processOfflineImpacts,
  
//   // Utilities
//   getMissileTrackingData,
//   generateSimulatedDefender,
  
//   // Config
//   MISSILE_CONFIG
// };