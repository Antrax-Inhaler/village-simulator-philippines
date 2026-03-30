/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — attack/attackStats.js
   Contains all building attack stats, projectile types, and battle constants.
   Separated for cleaner code organization.
═══════════════════════════════════════════════════════════════ */

import { BUILDING_DEFS } from '../buildings/building.js';

/* ══════════════════════════════════════════════════════════════
   DEFENCE BUILDING STATS
   Each defence building gets HP scaling and attack properties.
   These are calculated based on building level.
══════════════════════════════════════════════════════════════ */
export function getBuildingAttackStats(type, level) {
  var def = BUILDING_DEFS[type];
  if (!def) return null;
  
  var baseStats = {
    moog: {
      baseHp: 120,
      hpPerLevel: 48,
      attackRange: 180,
      attackDPS: 8,
      dpsPerLevel: 3,
      projectileType: 'cannonball',
      projectileSpeed: 220,
      cooldown: 1.8,
      projectileColor: '#ff8800',
      projectileSize: 5
    },
    bantayan: {
      baseHp: 180,
      hpPerLevel: 72,
      attackRange: 260,
      attackDPS: 18,
      dpsPerLevel: 7,
      projectileType: 'arrow',
      projectileSpeed: 280,
      cooldown: 2.2,
      projectileColor: '#ffcc00',
      projectileSize: 4
    },
    pulisya: {
      baseHp: 80,
      hpPerLevel: 32,
      attackRange: 120,
      attackDPS: 5,
      dpsPerLevel: 2,
      projectileType: 'bullet',
      projectileSpeed: 350,
      cooldown: 2.8,
      projectileColor: '#5b8cff',
      projectileSize: 3
    },
    kuta: {
      baseHp: 200,
      hpPerLevel: 80,
      attackRange: 0,
      attackDPS: 0,
      dpsPerLevel: 0,
      projectileType: null,
      projectileSpeed: 0,
      cooldown: 0,
      projectileColor: null,
      projectileSize: 0
    },
    mainHall: {
      baseHp: 300,
      hpPerLevel: 150,
      attackRange: 0,
      attackDPS: 0,
      dpsPerLevel: 0,
      projectileType: null,
      projectileSpeed: 0,
      cooldown: 0,
      projectileColor: null,
      projectileSize: 0
    },
    cuartel: {
      baseHp: 100,
      hpPerLevel: 40,
      attackRange: 0,
      attackDPS: 0,
      dpsPerLevel: 0,
      projectileType: null,
      projectileSpeed: 0,
      cooldown: 0,
      projectileColor: null,
      projectileSize: 0
    }
  };
  
  var stats = baseStats[type];
  if (!stats) return null;
  
  return {
    maxHp: stats.baseHp + (stats.hpPerLevel * (level - 1)),
    attackRange: stats.attackRange,
    attackDPS: stats.attackDPS + (stats.dpsPerLevel * (level - 1)),
    projectileType: stats.projectileType,
    projectileSpeed: stats.projectileSpeed,
    cooldown: stats.cooldown,
    projectileColor: stats.projectileColor,
    projectileSize: stats.projectileSize
  };
}

/* ══════════════════════════════════════════════════════════════
   TROOP STATS (already defined but consolidated here)
══════════════════════════════════════════════════════════════ */
export var TROOP_STATS = {
  bantay: {
    label: 'Bantay',
    icon: '🛡️',
    hp: 80,
    dps: 8,
    spd: 40,
    range: 45,
    color: '#4a7a9b',
    scale: 1.0
  },
  bayani: {
    label: 'Bayani',
    icon: '⚔️',
    hp: 150,
    dps: 18,
    spd: 38,
    range: 50,
    color: '#922B21',
    scale: 1.15
  },
  marine: {
    label: 'Marine',
    icon: '🔱',
    hp: 200,
    dps: 28,
    spd: 44,
    range: 80,
    color: '#1B4F72',
    scale: 1.1
  },
  airforce: {
    label: 'Air Force',
    icon: '✈️',
    hp: 180,
    dps: 38,
    spd: 55,
    range: 120,
    color: '#6c3483',
    scale: 1.1
  }
};

/* ══════════════════════════════════════════════════════════════
   PROJECTILE EFFECTS
══════════════════════════════════════════════════════════════ */
export function getProjectileTrail(type) {
  switch(type) {
    case 'cannonball':
      return { smoke: true, spark: true, trailLength: 8 };
    case 'arrow':
      return { smoke: false, spark: true, trailLength: 4 };
    case 'bullet':
      return { smoke: true, spark: false, trailLength: 2 };
    default:
      return { smoke: false, spark: true, trailLength: 4 };
  }
}

/* ══════════════════════════════════════════════════════════════
   BATTLE CONSTANTS
══════════════════════════════════════════════════════════════ */
export var BATTLE_CONFIG = {
  // Damage variance
  damageMin: 0.8,
  damageMax: 1.2,
  
  // Attack timing
  attackTimerBase: 1.0,
  
  // Projectile settings
  projectileGravity: 0,
  
  // Building targeting priority
  targetPriority: {
    defence: -80,    // Attack defence buildings first
    mainHall: -40,   // Then main hall
    production: 0,   // Then production buildings
    storage: 10,     // Then storage
    house: 20        // Houses last
  },
  
  // Visual effects
  explosionParticles: 20,
  smokeParticles: 8,
  hitSparkParticles: 5,
  
  // Battle pulse effect
  battlePulseIntensity: 0.07,
  battlePulseFrequency: 70,
  
  // Range ring settings
  rangeRingAlpha: 0.10,
  rangeRingColor: '#ff4444',
  rangeRingWidth: 2
};

/* ══════════════════════════════════════════════════════════════
   VILLAGE GENERATION HELPERS
══════════════════════════════════════════════════════════════ */
export var VILLAGE_NAMES = [
  'Nayon ng Bagumbayan', 'Barangay Masagana', 'Nayon ng Dalisay',
  'Barangay Magiting', 'Nayon ng Tagumpay', 'Barangay Malakas',
  'Nayon ng Bayani', 'Barangay Maliwanag', 'Nayon ng Kalayaan', 'Barangay Mabuti'
];

export var VILLAGE_LEADERS = [
  'Datu Maginoo', 'Pinuno Matapang', 'Lakan Bayani',
  'Datu Malusog', 'Rajah Mabait', 'Pinuno Matalino'
];

export function calculateDefensePower(buildings) {
  var power = 0;
  buildings.forEach(function(b) {
    var stats = getBuildingAttackStats(b.type, b.level);
    if (stats) {
      power += stats.maxHp * 0.3 + (stats.attackDPS * 20);
    } else {
      power += (b.maxHp || 100) * 0.2;
    }
  });
  return Math.floor(power);
}

export function calculateLoot(villageLevel, destroyedPercentage) {
  var baseGold = villageLevel * 130;
  var baseRice = villageLevel * 65;
  var lootMultiplier = 0.7 + (destroyedPercentage * 0.3);
  return {
    gold: Math.floor(baseGold + Math.random() * 90) * lootMultiplier,
    rice: Math.floor(baseRice + Math.random() * 45) * lootMultiplier
  };
}