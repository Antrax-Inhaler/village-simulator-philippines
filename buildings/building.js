/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/building.js

   BUILDING CATALOGUE, RULES, CONSTRUCTOR & CORE LIFECYCLE
   ─────────────────────────────────────────────────────────────
   This file is intentionally lean. Functionality is split into:

     buildingStats.js    — getStats, getUpgradeCost, indicators,
                           langis/train helpers
     buildingMilitary.js — missile silo & interceptor methods
     buildingDraw.js     — Building.prototype.draw + all shape
                           renderers

   KEY FEATURES
   ─────────────────────────────────────────────────────────────
   1. Langis collectable like gold (uncollectedLangis)
   2. Collection indicators at >= 40% cap
   3. Langis consumption system — production drops to 20% without
   4. minalangis (Minahan ng Langis) — only langis producer
   5. Missile Warfare Buildings (Hall Lv 6-7)
      - missilesilo    : long-range attacks
      - radarstation   : incoming missile detection
      - interceptor    : auto-shoot-down
   6. Max building / Hall level raised to 10
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp }       from '../utils/perspective.js';
import { drawBuilding }            from './buildingSprites.js';
import { isBuildingOnRoad }        from '../world/world.js';
import { applyStatsPrototypes }    from './buildingStats.js';
import { applyMilitaryPrototypes } from './buildingMilitary.js';
import { applyDrawPrototypes }     from './buildingDraw.js';

/* ══════════════════════════════════════════════════════════════
   BUILDING CATALOGUE
   (langis consumption & missile properties included)
══════════════════════════════════════════════════════════════ */
export var BUILDING_DEFS = {

  mainHall: {
    label:'Bahay-Bayan', category:'special',
    wallColor:'#c49a4e', roofColor:'#8b5e2a',
    doorColor:'rgba(40,20,5,0.85)', winColor:'rgba(255,235,160,0.65)',
    w:72, h:52, shopCost:null,
    prodRes:null, prodRate:0,
    langisConsumption: 0.5,
    storageBonus:{ gold:200, rice:100, langis:50 },
    popBonus:0, isHome:false, defenceHP:200,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:0, workerSlots:0,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  house: {
    label:'Bahay', category:'basic',
    wallColor:'#d4a878', roofColor:'#a05030',
    doorColor:'rgba(60,30,10,0.8)', winColor:'rgba(255,230,140,0.6)',
    w:50, h:38, shopCost:{ gold:80, rice:20, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0,
    storageBonus:{ gold:0, rice:50, langis:0 },
    popBonus:4, isHome:true, defenceHP:30,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:30, workerSlots:0,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  palengke: {
    label:'Palengke', category:'production',
    wallColor:'#6090c8', roofColor:'#2858a0',
    doorColor:'rgba(20,40,80,0.7)', winColor:'rgba(180,220,255,0.55)',
    w:66, h:42, shopCost:{ gold:150, rice:30, langis:0 },
    prodRes:'gold', prodRate:4.0,
    langisConsumption: 0.2,
    storageBonus:{ gold:300, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:20,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:60, workerSlots:4,
    maxUncollectedGold: 400, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  farm: {
    label:'Bukid', category:'production',
    wallColor:'#4a8c3a', roofColor:'#2d6020',
    doorColor:'transparent', winColor:'transparent',
    w:84, h:30, shopCost:{ gold:60, rice:0, langis:0 },
    prodRes:'rice', prodRate:6.0,
    langisConsumption: 0.1,
    storageBonus:{ gold:0, rice:200, langis:0 },
    popBonus:0, isHome:false, defenceHP:10,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:45, workerSlots:6,
    maxUncollectedGold: 0, maxUncollectedFood: 500, maxUncollectedLangis: 0,
  },

  storage: {
    label:'Bodega', category:'storage',
    wallColor:'#a8a8c4', roofColor:'#585878',
    doorColor:'rgba(30,30,60,0.75)', winColor:'rgba(200,200,240,0.5)',
    w:54, h:40, shopCost:{ gold:120, rice:40, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0,
    storageBonus:{ gold:600, rice:400, langis:100 },
    popBonus:0, isHome:false, defenceHP:40,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:50, workerSlots:2,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  /* ── Hall Lv 2 ───────────────────────────────────────────── */
  mine: {
    label:'Minahan', category:'production',
    wallColor:'#888888', roofColor:'#505050',
    doorColor:'rgba(20,20,20,0.8)', winColor:'rgba(200,200,200,0.4)',
    w:46, h:32, shopCost:{ gold:200, rice:50, langis:0 },
    prodRes:'gold', prodRate:5.0,
    langisConsumption: 0.4,
    storageBonus:{ gold:400, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:30,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:90, workerSlots:4,
    maxUncollectedGold: 500, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  minalangis: {
    label:'Minahan ng Langis', category:'production',
    wallColor:'#2a1a08', roofColor:'#1a0e04',
    doorColor:'rgba(10,8,2,0.9)', winColor:'rgba(180,140,60,0.4)',
    w:58, h:44, shopCost:{ gold:450, rice:80, langis:0 },
    prodRes:'langis', prodRate:6.0,
    langisConsumption: 0.3,
    storageBonus:{ gold:0, rice:0, langis:400 },
    popBonus:0, isHome:false, defenceHP:40,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:120, workerSlots:5,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 400,
    serviceEffect:{
      exportNote:'Maaaring i-export ang langis sa ibang bansa.',
      importNote:'Maaari ring mag-import kung kulang ang langis.',
    },
  },

  paaralan: {
    label:'Paaralan', category:'training',
    wallColor:'#e8c84a', roofColor:'#b89020',
    doorColor:'rgba(80,60,0,0.8)', winColor:'rgba(255,250,200,0.7)',
    w:68, h:44, shopCost:{ gold:180, rice:60, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.5,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:20,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:80, workerSlots:3,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    trainsRoles:['magsasaka','guro','doktor','mangangalakal','mangingisda','albularyo'],
  },

  /* ── Hall Lv 3 ───────────────────────────────────────────── */
  cuartel: {
    label:'Cuartel', category:'training',
    wallColor:'#5a7a4a', roofColor:'#2a4a1a',
    doorColor:'rgba(10,30,5,0.9)', winColor:'rgba(150,200,120,0.4)',
    w:60, h:46, shopCost:{ gold:300, rice:80, langis:50 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.5,
    storageBonus:{ gold:0, rice:0, langis:200 },
    popBonus:0, isHome:false, defenceHP:100,
    attackRange:0, attackDPS:0, minHallLevel:3,
    requiredZone:null, buildTime:120, workerSlots:4,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    trainsRoles:['bantay','bayani','marine','airforce'],
  },

  templo: {
    label:'Templo', category:'special',
    wallColor:'#d4aa60', roofColor:'#a07828',
    doorColor:'rgba(60,40,0,0.85)', winColor:'rgba(255,240,180,0.8)',
    w:60, h:52, shopCost:{ gold:250, rice:50, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.1,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:50,
    attackRange:0, attackDPS:0, minHallLevel:3,
    requiredZone:null, buildTime:100, workerSlots:2,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  moog: {
    label:'Muog', category:'defence',
    wallColor:'#8a7a5a', roofColor:'#5a4a2a',
    doorColor:'rgba(30,20,5,0.9)', winColor:'rgba(200,180,120,0.5)',
    w:32, h:48, shopCost:{ gold:200, rice:30, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.2,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:120,
    attackRange:180, attackDPS:8, minHallLevel:2,
    requiredZone:null, buildTime:90, workerSlots:2,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  kuta: {
    label:'Kuta', category:'defence',
    wallColor:'#8c8870', roofColor:'#6a6650',
    doorColor:'rgba(20,20,10,0.9)', winColor:'rgba(180,170,130,0.3)',
    w:56, h:24, shopCost:{ gold:100, rice:20, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.2,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:200,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:60, workerSlots:0,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  /* ── Hall Lv 4 ───────────────────────────────────────────── */
  bantayan: {
    label:'Bantayan', category:'defence',
    wallColor:'#6a5a3a', roofColor:'#3a2a10',
    doorColor:'rgba(20,15,5,0.95)', winColor:'rgba(160,140,80,0.4)',
    w:36, h:60, shopCost:{ gold:400, rice:60, langis:30 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.2,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:180,
    attackRange:260, attackDPS:18, minHallLevel:4,
    requiredZone:null, buildTime:150, workerSlots:2,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  hukuman: {
    label:'Hukuman', category:'special',
    wallColor:'#b08040', roofColor:'#7a5820',
    doorColor:'rgba(50,30,5,0.9)', winColor:'rgba(255,230,150,0.6)',
    w:70, h:50, shopCost:{ gold:500, rice:100, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.3,
    storageBonus:{ gold:200, rice:100, langis:0 },
    popBonus:2, isHome:false, defenceHP:60,
    attackRange:0, attackDPS:0, minHallLevel:4,
    requiredZone:null, buildTime:180, workerSlots:3,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
  },

  /* ── Service buildings ───────────────────────────────────── */
  ospital: {
    label:'Ospital', category:'service',
    wallColor:'#e8f0f8', roofColor:'#5080c0',
    doorColor:'rgba(20,40,80,0.75)', winColor:'rgba(200,220,255,0.7)',
    w:64, h:46, shopCost:{ gold:400, rice:80, langis:50 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.3,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:30,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:120, workerSlots:4,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    serviceEffect:{ healthRegenBonus:0.03, deathRiskReduction:0.20, servedPerLevel:8 },
  },

  pulisya: {
    label:'Himpilan ng Pulisya', category:'service',
    wallColor:'#3050a0', roofColor:'#1a2a60',
    doorColor:'rgba(10,20,50,0.9)', winColor:'rgba(150,180,255,0.5)',
    w:58, h:42, shopCost:{ gold:350, rice:50, langis:30 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.3,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:80,
    attackRange:120, attackDPS:5, minHallLevel:2,
    requiredZone:null, buildTime:100, workerSlots:4,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    serviceEffect:{ angerDecayBonus:0.04, crimeReduction:0.30, trustBonus:0.002 },
  },

  daungan: {
    label:'Daungan', category:'trade',
    wallColor:'#5a7a8a', roofColor:'#2a4a5a',
    doorColor:'rgba(20,40,50,0.8)', winColor:'rgba(160,210,230,0.5)',
    w:74, h:38, shopCost:{ gold:600, rice:100, langis:0 },
    prodRes:'gold', prodRate:3.0,
    langisConsumption: 0.3,
    storageBonus:{ gold:200, rice:200, langis:0 },
    popBonus:0, isHome:false, defenceHP:40,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:'dagat', buildTime:150, workerSlots:3,
    maxUncollectedGold: 400, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    serviceEffect:{ exportRewardBonus:0.20, importPriceDiscount:0.10, tradeRepGainBonus:1 },
  },

  kalye: {
    label:'Kalye', category:'infrastructure',
    wallColor:'#8a7a60', roofColor:'#6a5a40',
    doorColor:'transparent', winColor:'transparent',
    w:80, h:16, shopCost:{ gold:40, rice:10, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0,
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:5,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:20, workerSlots:0,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    serviceEffect:{ nearbyProdBonus:0.10, villagerSpeedBonus:0.15 },
  },

  /* ── Missile Warfare Buildings (Hall Lv 6-7) ─────────────── */
  missilesilo: {
    label:'Missile Silo', category:'military',
    wallColor:'#3a3a4a', roofColor:'#1a1a2a',
    doorColor:'rgba(10,10,20,0.95)', winColor:'rgba(80,120,180,0.3)',
    w:64, h:72, shopCost:{ gold:2500, rice:400, langis:200 },
    prodRes:null, prodRate:0,
    langisConsumption: 1.0,
    storageBonus:{ gold:0, rice:0, langis:300 },
    popBonus:0, isHome:false, defenceHP:250,
    attackRange:0, attackDPS:0, minHallLevel:6,
    requiredZone:null, buildTime:300, workerSlots:6,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    missileCapacity: 10,
    missileReloadTime: 120,
    missileTypes: ['basic', 'precision', 'ballistic', 'mirv'],
    serviceEffect:{ note:'Nag-iimbak at naglulunsad ng mga missile para sa long-range attacks.' },
  },

  radarstation: {
    label:'Radar Station', category:'military',
    wallColor:'#4a5a6a', roofColor:'#2a3a4a',
    doorColor:'rgba(15,20,30,0.9)', winColor:'rgba(100,180,255,0.4)',
    w:48, h:56, shopCost:{ gold:1800, rice:300, langis:150 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.8,
    storageBonus:{ gold:0, rice:0, langis:100 },
    popBonus:0, isHome:false, defenceHP:150,
    attackRange:0, attackDPS:0, minHallLevel:6,
    requiredZone:null, buildTime:200, workerSlots:4,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    detectionRange: Infinity,
    earlyWarningTime: 15,
    interceptBonus: 10,
    serviceEffect:{ note:'Nagde-detect ng incoming missiles at nagbibigay ng early warning.' },
  },

  interceptor: {
    label:'Interceptor Battery', category:'military',
    wallColor:'#2a4a3a', roofColor:'#1a3a2a',
    doorColor:'rgba(10,25,15,0.95)', winColor:'rgba(80,180,120,0.35)',
    w:56, h:48, shopCost:{ gold:3000, rice:500, langis:300 },
    prodRes:null, prodRate:0,
    langisConsumption: 1.2,
    storageBonus:{ gold:0, rice:0, langis:200 },
    popBonus:0, isHome:false, defenceHP:300,
    attackRange:400, attackDPS:0, minHallLevel:7,
    requiredZone:null, buildTime:400, workerSlots:8,
    maxUncollectedGold: 0, maxUncollectedFood: 0, maxUncollectedLangis: 0,
    interceptBaseChance: 40,
    interceptBonusPerUnit: 10,
    interceptorMissileStock: 5,
    canInterceptBallistic: true,
    cooldown: 30,
    serviceEffect:{ note:'Awtomatikong nag-i-intercept ng incoming missiles. Mas maraming battery = mas mataas ang tsansa.' },
  },
};

// Production multiplier when langis is unavailable
export const TRAINING_NO_LANGIS_MULTIPLIER = 0.2;

/* ══════════════════════════════════════════════════════════════
   MAIN HALL GATING
   Each entry unlocks at the Hall level equal to its array index + 1.
   mainHall itself goes up to level 10.
══════════════════════════════════════════════════════════════ */
export var MAIN_HALL_RULES = [
  { maxBuildings:  6, maxBuildingLevel: 2 },  // Hall Lv 1
  { maxBuildings: 12, maxBuildingLevel: 3 },  // Hall Lv 2
  { maxBuildings: 18, maxBuildingLevel: 4 },  // Hall Lv 3
  { maxBuildings: 26, maxBuildingLevel: 5 },  // Hall Lv 4
  { maxBuildings: 34, maxBuildingLevel: 6 },  // Hall Lv 5 — missile buildings unlock
  { maxBuildings: 42, maxBuildingLevel: 7 },  // Hall Lv 6 — interceptor unlocks
  { maxBuildings: 52, maxBuildingLevel: 8 },  // Hall Lv 7
  { maxBuildings: 62, maxBuildingLevel: 9 },  // Hall Lv 8
  { maxBuildings:999, maxBuildingLevel:10 },  // Hall Lv 9-10 max
];

export function getMainHallLevel(buildings) {
  for (var i = 0; i < buildings.length; i++) {
    if (buildings[i].type === 'mainHall') return buildings[i].level;
  }
  return 1;
}

export function getMainHallRules(buildings) {
  var lv = getMainHallLevel(buildings);
  return MAIN_HALL_RULES[clamp(lv - 1, 0, MAIN_HALL_RULES.length - 1)];
}

/* ══════════════════════════════════════════════════════════════
   canPlaceBuilding
══════════════════════════════════════════════════════════════ */
export function canPlaceBuilding(type, buildings, wx, wy, unlockedZones, getZoneAt) {
  var def = BUILDING_DEFS[type];
  if (!def) return { ok: false, msg: 'Hindi kilala ang uri ng gusali.' };

  var mhLv  = getMainHallLevel(buildings);
  var rules = getMainHallRules(buildings);
  var count = buildings.filter(function(b) { return b.type !== 'mainHall'; }).length;
  var bw = def.w || 80, bh = def.h || 80;

  if (isBuildingOnRoad(wx - bw/2, wy - bh/2, bw, bh)) {
    return { ok: false, msg: 'Hindi pwede — nasa daan!' };
  }
  if (mhLv < def.minHallLevel) {
    return { ok: false, msg: def.label + ' ay nangangailangan ng Bahay-Bayan Level ' + def.minHallLevel + '.' };
  }
  if (count >= rules.maxBuildings) {
    return { ok: false, msg: 'Puno na ang lugar! I-upgrade ang Bahay-Bayan (Lv' + mhLv + ').' };
  }

  if (def.requiredZone) {
    var zones = unlockedZones || [];
    if (zones.indexOf(def.requiredZone) === -1) {
      return { ok: false, msg: def.label + ' ay nangangailangan ng ' + def.requiredZone + ' zone. I-unlock muna.' };
    }
    if (typeof getZoneAt === 'function' && wx !== undefined && wy !== undefined) {
      if (getZoneAt(wx, wy) !== def.requiredZone) {
        return { ok: false, msg: def.label + ' ay dapat ilagay sa loob ng ' + def.requiredZone + ' zone.' };
      }
    }
  }

  return { ok: true, msg: '' };
}

export function getShopCatalogue(buildings, unlockedZones) {
  var mhLv  = getMainHallLevel(buildings);
  var zones = unlockedZones || [];
  return Object.keys(BUILDING_DEFS).filter(function(k) {
    var def = BUILDING_DEFS[k];
    if (!def.shopCost)                                               return false;
    if (mhLv < def.minHallLevel)                                    return false;
    if (def.requiredZone && zones.indexOf(def.requiredZone) === -1) return false;
    return true;
  });
}

/* ══════════════════════════════════════════════════════════════
   Building Class — constructor only
   All prototype methods are attached below via apply*Prototypes.
══════════════════════════════════════════════════════════════ */
var _bldCounter = 0;

export function Building(type, x, y) {
  var def            = BUILDING_DEFS[type] || BUILDING_DEFS.house;
  this.id            = 'bld_' + (_bldCounter++);
  this.type          = type;
  this.x             = x;
  this.y             = y;
  this.level         = 1;
  this.unlocked      = true;
  this.w             = def.w;
  this.h             = def.h;
  this.prodAccum     = 0;
  this.pulse         = 0;
  this._occupants    = [];
  this.uncollectedGold       = 0;
  this.uncollectedFood       = 0;
  this.uncollectedLangis     = 0;
  this.upgradePath           = null;
  this.underConstruction     = false;
  this.constructionTime      = 0;
  this.constructionMax       = 0;
  this.workers               = [];
  this._assignedWorkers      = [];
  this._hasLangis            = true;
  this._langisShortageWarned = false;

  // Missile Silo state
  if (def.missileCapacity !== undefined) {
    this.missileStock   = { basic: 0, precision: 0, ballistic: 0, mirv: 0 };
    this.reloadTimer    = 0;
    this.lastLaunchTime = 0;
  }
  // Interceptor Battery state
  if (def.interceptBaseChance !== undefined) {
    this.interceptorStock  = def.interceptorMissileStock || 0;
    this.interceptCooldown = 0;
  }
}

/* ── Core prototype methods (kept here — tightly coupled to DEFS/RULES) ── */

Building.prototype.getDef = function() {
  return BUILDING_DEFS[this.type] || BUILDING_DEFS.house;
};

Building.prototype.getMaxDimensions = function() {
  var def   = this.getDef();
  var rules = getMainHallRules(VS.buildings || []);
  var maxLv = this.type === 'mainHall' ? 10 : rules.maxBuildingLevel;
  var growthMultiplier = 1 + (maxLv - this.level) * 0.12;
  return { w: def.w * growthMultiplier, h: def.h * growthMultiplier, maxLevel: maxLv };
};

Building.prototype.upgrade = function(VS) {
  var rules = getMainHallRules(VS.buildings || []);
  var maxLv = this.type === 'mainHall' ? 10 : rules.maxBuildingLevel;
  var mhLv  = getMainHallLevel(VS.buildings || []);

  if (this.underConstruction) {
    return { ok: false, msg: 'Nag-co-construct pa ang ' + this.getDef().label + '!' };
  }
  if (this.level >= maxLv) {
    if (this.type !== 'mainHall' && maxLv < 10) {
      return { ok: false, msg: 'I-upgrade muna ang Bahay-Bayan (Lv' + mhLv + ')!' };
    }
    return { ok: false, msg: 'Maximum na ang level ng ' + this.getDef().label + '!' };
  }

  var cost = this.getUpgradeCost();
  if (VS.res.gold < cost.gold || VS.res.rice < cost.rice) {
    return { ok: false, msg: 'Kulang! Kailangan: ' + cost.gold + ' ginto ' + cost.rice + ' bigas.' };
  }
  VS.res.gold -= cost.gold;
  VS.res.rice -= cost.rice;

  var def    = this.getDef();
  var base   = def.buildTime || 30;
  var upTime = Math.ceil(base * 0.6 * (this.level + 1));
  if (upTime > 0) {
    this.underConstruction = true;
    this.constructionTime  = upTime;
    this.constructionMax   = upTime;
    this._upgradeLevel     = this.level + 1;
    return {
      ok:  true,
      msg: def.label + ' — nag-uupgrade sa Level ' + (this.level + 1) + '! (' +
           (upTime >= 60 ? Math.ceil(upTime/60) + 'min' : upTime + 's') + ')',
    };
  }
  this.level++;
  this.pulse = 1.0;
  return { ok: true, msg: def.label + ' Level ' + this.level + '!' };
};

Building.prototype.update = function(dt, VS) {
  if (this.underConstruction) {
    var workerBonus = 1 + Math.min(this.workers.length, 4) * 0.15;
    this.constructionTime -= dt * workerBonus;
    if (this.constructionTime <= 0) {
      this.underConstruction = false;
      this.constructionTime  = 0;
      this.workers           = [];
      if (this._upgradeLevel) { this.level = this._upgradeLevel; this._upgradeLevel = undefined; }
      this.pulse = 1.0;
    }
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2);
    return;
  }

  var def   = this.getDef();
  var stats = this.getStats();

  // Military timer tick
  if (def.missileCapacity !== undefined || def.interceptBaseChance !== undefined) {
    this.updateMissileTimers(dt);
  }

  // Langis consumption
  var consumption = stats.langisConsumption;
  if (consumption > 0) {
    var langisNeeded    = consumption * dt;
    var availableLangis = VS.res.langis || 0;
    var langisTaken     = Math.min(langisNeeded, availableLangis);
    VS.res.langis       = Math.max(0, availableLangis - langisTaken);
    this._hasLangis     = langisTaken >= langisNeeded * 0.9;
  }

  // Production tick
  if (def.prodRes && stats.productionRate > 0) {
    var prodMult      = this.getProductionMultiplier(VS);
    var effectiveRate = stats.productionRate * stats.efficiency * prodMult;
    this.prodAccum   += dt * effectiveRate;

    if (this.prodAccum >= 1) {
      var produced   = Math.floor(this.prodAccum);
      this.prodAccum -= produced;
      var zoneMult   = (VS.getZoneMult && def.prodRes) ? VS.getZoneMult(def.prodRes, this.x, this.y) : 1.0;
      var producedZ  = Math.round(produced * zoneMult);

      if (def.prodRes === 'gold') {
        this.uncollectedGold = Math.min(stats.maxUncollectedGold || 999, this.uncollectedGold + producedZ);
      } else if (def.prodRes === 'rice') {
        this.uncollectedFood = Math.min(stats.maxUncollectedFood || 999, (this.uncollectedFood || 0) + producedZ);
      } else if (def.prodRes === 'langis') {
        this.uncollectedLangis = Math.min(stats.maxUncollectedLangis || 999, (this.uncollectedLangis || 0) + producedZ);
      } else {
        VS.res[def.prodRes] = Math.min(VS.resCap[def.prodRes] || 9999, (VS.res[def.prodRes] || 0) + producedZ);
      }
    }
  }

  if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2);
};

/* ── Attach all external prototype groups ────────────────── */
applyStatsPrototypes(Building);
applyMilitaryPrototypes(Building);
applyDrawPrototypes(Building);

/* ══════════════════════════════════════════════════════════════
   FACTORIES
══════════════════════════════════════════════════════════════ */
export function createDefaultBuildings(VW, VH) {
  return [
    new Building('mainHall', VW*0.50, VH*0.48),
    new Building('house',    VW*0.40, VH*0.40),
    new Building('house',    VW*0.60, VH*0.40),
    new Building('house',    VW*0.40, VH*0.58),
    new Building('house',    VW*0.60, VH*0.58),
    new Building('farm',     VW*0.43, VH*0.62),
    new Building('farm',     VW*0.57, VH*0.62),
    new Building('palengke', VW*0.50, VH*0.55),
    new Building('storage',  VW*0.50, VH*0.39),
  ];
}

export function rebuildFromSave(savedBuildings) {
  return savedBuildings.map(function(d) {
    var b      = new Building(d.type, d.x, d.y);
    b.id       = d.id;
    b.level    = d.level    !== undefined ? d.level    : 1;
    b.unlocked = d.unlocked !== undefined ? d.unlocked : true;
    if (d.isWreck) { b.isWreck = true; b.originalType = d.originalType || d.type; }
    b.uncollectedGold   = d.uncollectedGold   || 0;
    b.uncollectedFood   = d.uncollectedFood   || 0;
    b.uncollectedLangis = d.uncollectedLangis || 0;
    if (d.underConstruction) {
      b.underConstruction = true;
      b.constructionTime  = d.constructionTime || 0;
      b.constructionMax   = d.constructionMax  || 0;
      if (d.upgradeLevel) b._upgradeLevel = d.upgradeLevel;
    }
    var def = BUILDING_DEFS[d.type];
    if (def && def.missileCapacity !== undefined && d.missileStock) {
      b.missileStock   = d.missileStock;
      b.reloadTimer    = d.reloadTimer    || 0;
      b.lastLaunchTime = d.lastLaunchTime || 0;
    }
    if (def && def.interceptBaseChance !== undefined) {
      b.interceptorStock  = d.interceptorStock !== undefined ? d.interceptorStock : (def.interceptorMissileStock || 0);
      b.interceptCooldown = d.interceptCooldown || 0;
    }
    return b;
  });
}

export function recalcResourceCaps(buildings, baseResCap) {
  var caps = { gold: baseResCap.gold, rice: baseResCap.rice, langis: baseResCap.langis };
  buildings.forEach(function(b) {
    if (b.isWreck) return;
    var sb = b.getStats().storageBonus;
    caps.gold   += sb.gold;
    caps.rice   += sb.rice;
    caps.langis += sb.langis;
  });
  return caps;
}