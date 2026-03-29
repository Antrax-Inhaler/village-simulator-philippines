/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — buildings/building.js  (modified)

   KEY CHANGES
   ─────────────────────────────────────────────────────────────
   1. Langis now collectable like gold (uncollectedLangis)
   2. Collection indicators only appear when uncollected >= 40% of capacity
   3. NEW: Langis consumption system
      - Buildings consume langis when operating
      - Without langis, production drops to 20% of normal rate
      - Training/education buildings cannot train without langis
   4. NEW: minalangis (Minahan ng Langis) — ONLY langis producer
   5. Removed langis production from: paaralan, templo, hukuman
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp } from '../utils/perspective.js';
import { drawBuilding }      from './buildingSprites.js';

/* ══════════════════════════════════════════════════════════════
   BUILDING CATALOGUE with LANGIS CONSUMPTION RATES
══════════════════════════════════════════════════════════════ */
export var BUILDING_DEFS = {

  mainHall: {
    label:'Bahay-Bayan', category:'special',
    wallColor:'#c49a4e', roofColor:'#8b5e2a',
    doorColor:'rgba(40,20,5,0.85)', winColor:'rgba(255,235,160,0.65)',
    w:72, h:52, shopCost:null,
    prodRes:null, prodRate:0,
    langisConsumption: 0.5,  // Level 1 base consumption per second
    storageBonus:{ gold:200, rice:100, langis:50 },
    popBonus:0, isHome:false, defenceHP:200,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:0, workerSlots:0,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  palengke: {
    label:'Palengke', category:'production',
    wallColor:'#6090c8', roofColor:'#2858a0',
    doorColor:'rgba(20,40,80,0.7)', winColor:'rgba(180,220,255,0.55)',
    w:66, h:42, shopCost:{ gold:150, rice:30, langis:0 },
    prodRes:'gold', prodRate:4.0,
    langisConsumption: 0.2,  // Level 1 base consumption
    storageBonus:{ gold:300, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:20,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:60, workerSlots:4,
    maxUncollectedGold: 400,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  farm: {
    label:'Bukid', category:'production',
    wallColor:'#4a8c3a', roofColor:'#2d6020',
    doorColor:'transparent', winColor:'transparent',
    w:84, h:30, shopCost:{ gold:60, rice:0, langis:0 },
    prodRes:'rice', prodRate:6.0,
    langisConsumption: 0.1,  // Low consumption
    storageBonus:{ gold:0, rice:200, langis:0 },
    popBonus:0, isHome:false, defenceHP:10,
    attackRange:0, attackDPS:0, minHallLevel:1,
    requiredZone:null, buildTime:45, workerSlots:6,
    maxUncollectedGold: 0,
    maxUncollectedFood: 500,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  /* ── Hall Lv 2 ───────────────────────────────────────────── */
  mine: {
    label:'Minahan', category:'production',
    wallColor:'#888888', roofColor:'#505050',
    doorColor:'rgba(20,20,20,0.8)', winColor:'rgba(200,200,200,0.4)',
    w:46, h:32, shopCost:{ gold:200, rice:50, langis:0 },
    prodRes:'gold', prodRate:5.0,
    langisConsumption: 0.4,  // Gold mine consumes more
    storageBonus:{ gold:400, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:30,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:90, workerSlots:4,
    maxUncollectedGold: 500,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  /* ── Oil mine: the ONLY langis producer ────────────── */
  minalangis: {
    label:'Minahan ng Langis', category:'production',
    wallColor:'#2a1a08', roofColor:'#1a0e04',
    doorColor:'rgba(10,8,2,0.9)', winColor:'rgba(180,140,60,0.4)',
    w:58, h:44, shopCost:{ gold:450, rice:80, langis:0 },
    prodRes:'langis', prodRate:6.0,
    langisConsumption: 0.3,  // Produces langis, consumes a little
    storageBonus:{ gold:0, rice:0, langis:400 },
    popBonus:0, isHome:false, defenceHP:40,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:120, workerSlots:5,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 400,
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
    langisConsumption: 0.5,  // School needs langis for training
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:20,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:80, workerSlots:3,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
    trainsRoles:['magsasaka','guro','doktor','mangangalakal','mangingisda','albularyo'],
  },

  /* ── Hall Lv 3 ───────────────────────────────────────────── */
  cuartel: {
    label:'Cuartel', category:'training',
    wallColor:'#5a7a4a', roofColor:'#2a4a1a',
    doorColor:'rgba(10,30,5,0.9)', winColor:'rgba(150,200,120,0.4)',
    w:60, h:46, shopCost:{ gold:300, rice:80, langis:50 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.5,  // Military training needs langis
    storageBonus:{ gold:0, rice:0, langis:200 },
    popBonus:0, isHome:false, defenceHP:100,
    attackRange:0, attackDPS:0, minHallLevel:3,
    requiredZone:null, buildTime:120, workerSlots:4,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
    trainsRoles:['bantay','bayani'],
  },

  templo: {
    label:'Templo', category:'special',
    wallColor:'#d4aa60', roofColor:'#a07828',
    doorColor:'rgba(60,40,0,0.85)', winColor:'rgba(255,240,180,0.8)',
    w:60, h:52, shopCost:{ gold:250, rice:50, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.1,  // Low consumption
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:50,
    attackRange:0, attackDPS:0, minHallLevel:3,
    requiredZone:null, buildTime:100, workerSlots:2,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  moog: {
    label:'Muog', category:'defence',
    wallColor:'#8a7a5a', roofColor:'#5a4a2a',
    doorColor:'rgba(30,20,5,0.9)', winColor:'rgba(200,180,120,0.5)',
    w:32, h:48, shopCost:{ gold:200, rice:30, langis:0 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.2,  // Defense building needs fuel for operations
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:120,
    attackRange:180, attackDPS:8, minHallLevel:2,
    requiredZone:null, buildTime:90, workerSlots:2,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
  },

  /* ── Service buildings ───────────────────────────────────── */
  ospital: {
    label:'Ospital', category:'service',
    wallColor:'#e8f0f8', roofColor:'#5080c0',
    doorColor:'rgba(20,40,80,0.75)', winColor:'rgba(200,220,255,0.7)',
    w:64, h:46, shopCost:{ gold:400, rice:80, langis:50 },
    prodRes:null, prodRate:0,
    langisConsumption: 0.3,  // Hospital needs langis for equipment
    storageBonus:{ gold:0, rice:0, langis:0 },
    popBonus:0, isHome:false, defenceHP:30,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:null, buildTime:120, workerSlots:4,
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
    serviceEffect:{ angerDecayBonus:0.04, crimeReduction:0.30, trustBonus:0.002 },
  },

  daungan: {
    label:'Daungan', category:'trade',
    wallColor:'#5a7a8a', roofColor:'#2a4a5a',
    doorColor:'rgba(20,40,50,0.8)', winColor:'rgba(160,210,230,0.5)',
    w:74, h:38, shopCost:{ gold:600, rice:100, langis:0 },
    prodRes:'gold', prodRate:3.0,
    langisConsumption: 0.3,  // Port needs fuel for ships
    storageBonus:{ gold:200, rice:200, langis:0 },
    popBonus:0, isHome:false, defenceHP:40,
    attackRange:0, attackDPS:0, minHallLevel:2,
    requiredZone:'dagat', buildTime:150, workerSlots:3,
    maxUncollectedGold: 400,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
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
    maxUncollectedGold: 0,
    maxUncollectedFood: 0,
    maxUncollectedLangis: 0,
    serviceEffect:{ nearbyProdBonus:0.10, villagerSpeedBonus:0.15 },
  },
};

// Training rates multiplier when no langis (20% speed)
export const TRAINING_NO_LANGIS_MULTIPLIER = 0.2;

/* ══════════════════════════════════════════════════════════════
   MAIN HALL GATING
══════════════════════════════════════════════════════════════ */
export var MAIN_HALL_RULES = [
  { maxBuildings:  6, maxBuildingLevel: 2 },
  { maxBuildings: 12, maxBuildingLevel: 3 },
  { maxBuildings: 18, maxBuildingLevel: 4 },
  { maxBuildings: 26, maxBuildingLevel: 5 },
  { maxBuildings:999, maxBuildingLevel: 5 },
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

export function canPlaceBuilding(type, buildings, unlockedZones) {
  var def = BUILDING_DEFS[type];
  if (!def) return { ok: false, msg: 'Hindi kilala ang uri ng gusali.' };
  var mhLv  = getMainHallLevel(buildings);
  var rules = getMainHallRules(buildings);
  var count = buildings.filter(function(b) { return b.type !== 'mainHall'; }).length;
  if (mhLv < def.minHallLevel) {
    return { ok: false, msg: def.label + ' ay nangangailangan ng Bahay-Bayan Level ' + def.minHallLevel + '.' };
  }
  if (count >= rules.maxBuildings) {
    return { ok: false, msg: 'Puno na ang lugar! I-upgrade ang Bahay-Bayan (Lv' + mhLv + ').' };
  }
  if (def.requiredZone) {
    var zones = unlockedZones || [];
    if (zones.indexOf(def.requiredZone) === -1) {
      return { ok: false, msg: def.label + ' ay nangangailangan ng ' + def.requiredZone + ' zone.' };
    }
  }
  return { ok: true, msg: '' };
}

export function getShopCatalogue(buildings, unlockedZones) {
  var mhLv  = getMainHallLevel(buildings);
  var zones = unlockedZones || [];
  return Object.keys(BUILDING_DEFS).filter(function(k) {
    var def = BUILDING_DEFS[k];
    if (!def.shopCost) return false;
    if (mhLv < def.minHallLevel) return false;
    if (def.requiredZone && zones.indexOf(def.requiredZone) === -1) return false;
    return true;
  });
}

var UPGRADE_BASE = { gold: 150, rice: 40 };
var _bldCounter  = 0;

/* ══════════════════════════════════════════════════════════════
   Building Class
══════════════════════════════════════════════════════════════ */
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
  this.uncollectedGold = 0;
  this.uncollectedFood = 0;
  this.uncollectedLangis = 0;
  this.upgradePath     = null;
  this.underConstruction = false;
  this.constructionTime  = 0;
  this.constructionMax   = 0;
  this.workers           = [];
  this._assignedWorkers  = [];
  // Track if building has langis this frame
  this._hasLangis = true;
  this._langisShortageWarned = false;
}

Building.prototype.getDef = function() {
  return BUILDING_DEFS[this.type] || BUILDING_DEFS.house;
};

Building.prototype.getStats = function() {
  var def  = this.getDef();
  var lv   = this.level;
  var pathMult = { prod: 1, storage: 1, pop: 1, efficiency: 1 };
  if (this.upgradePath === 'capacity')   { pathMult.storage = 1.5; pathMult.pop = 1.5; }
  if (this.upgradePath === 'efficiency') { pathMult.prod = 1.4; pathMult.efficiency = 1.2; }
  if (this.upgradePath === 'quality')    { pathMult.prod = 1.1; }
  return {
    productionRate: def.prodRate * lv * pathMult.prod,
    storageBonus: {
      gold:  (def.storageBonus.gold  || 0) * lv * pathMult.storage,
      rice:  (def.storageBonus.rice  || 0) * lv * pathMult.storage,
      langis:(def.storageBonus.langis || 0) * lv * pathMult.storage,
    },
    populationMax:  (def.popBonus || 0) * lv * pathMult.pop,
    efficiency:     clamp(0.6 + 0.1 * lv * pathMult.efficiency, 0.6, 1.0),
    defenceHP:      (def.defenceHP  || 0) * lv,
    attackDPS:      (def.attackDPS  || 0) * lv,
    attackRange:    (def.attackRange || 0) * (1 + (lv - 1) * 0.2),
    maxUncollectedGold: (def.maxUncollectedGold || 0) * lv,
    maxUncollectedFood: (def.maxUncollectedFood || 0) * lv,
    maxUncollectedLangis: (def.maxUncollectedLangis || 0) * lv,
    // Langis consumption scales with level (higher levels consume more)
    langisConsumption: (def.langisConsumption || 0) * (1 + (lv - 1) * 0.3),
  };
};

// Get effective production multiplier based on langis availability
Building.prototype.getProductionMultiplier = function(VS) {
  var def = this.getDef();
  var consumption = this.getStats().langisConsumption;
  if (consumption <= 0) return 1.0;  // No langis needed
  
  // Check if we have enough langis
  var hasLangis = (VS.res.langis || 0) >= consumption * 0.1; // Need at least 10% of consumption rate
  
  this._hasLangis = hasLangis;
  
  if (!hasLangis && !this._langisShortageWarned && Math.random() < 0.01) {
    this._langisShortageWarned = true;
    if (window.showMsg) window.showMsg('⚠️ ' + def.label + ' walang langis! Bumagal ang produksyon.', 'warning');
  }
  if (hasLangis) this._langisShortageWarned = false;
  
  // Without langis, production drops to 20%
  return hasLangis ? 1.0 : 0.2;
};

// Check if training is possible (needs langis for paaralan/cuartel)
Building.prototype.canTrain = function(VS) {
  var def = this.getDef();
  var consumption = this.getStats().langisConsumption;
  if (consumption <= 0) return true;  // No langis needed for training
  
  var hasLangis = (VS.res.langis || 0) >= consumption * 0.1;
  return hasLangis;
};

Building.prototype.getUpgradeCost = function() {
  var lv = this.level;
  return { gold: UPGRADE_BASE.gold * lv * lv, rice: UPGRADE_BASE.rice * lv };
};

Building.prototype.getCapacity   = function() { return this.getStats().populationMax; };
Building.prototype.getWorkerSlots = function() { return (this.getDef().workerSlots || 0) * this.level; };
Building.prototype.getWorkerCount = function() {
  this._assignedWorkers = this._assignedWorkers.filter(function(v) { return v && v.workBuilding; });
  return this._assignedWorkers.length;
};
Building.prototype.getOccupancy = function() {
  this._occupants = this._occupants.filter(function(v) { return v && v.isHome; });
  return this._occupants.length;
};
Building.prototype.getServiceEffect = function() {
  var def = this.getDef();
  return def.serviceEffect || null;
};

Building.prototype.upgrade = function(VS) {
  var rules = getMainHallRules(VS.buildings || []);
  var maxLv = this.type === 'mainHall' ? 5 : rules.maxBuildingLevel;
  var mhLv  = getMainHallLevel(VS.buildings || []);
  if (this.underConstruction) return { ok:false, msg:'Nag-co-construct pa ang '+this.getDef().label+'!' };
  if (this.level >= maxLv) {
    if (this.type !== 'mainHall' && maxLv < 5) return { ok:false, msg:'I-upgrade muna ang Bahay-Bayan (Lv'+mhLv+')!' };
    return { ok:false, msg:'Maximum na ang level ng '+this.getDef().label+'!' };
  }
  var cost = this.getUpgradeCost();
  if (VS.res.gold < cost.gold || VS.res.rice < cost.rice) {
    return { ok:false, msg:'Kulang! Kailangan: '+cost.gold+' ginto '+cost.rice+' bigas.' };
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
    return { ok:true, msg:this.getDef().label+' — nag-uupgrade sa Level '+(this.level+1)+'! ('+(upTime>=60?Math.ceil(upTime/60)+'min':upTime+'s')+')' };
  } else {
    this.level++;
    this.pulse = 1.0;
    return { ok:true, msg:this.getDef().label+' Level '+this.level+'!' };
  }
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
  
  // Handle langis consumption for non-production buildings first
  var consumption = stats.langisConsumption;
  if (consumption > 0) {
    // Consume langis if available
    var langisNeeded = consumption * dt;
    var availableLangis = VS.res.langis || 0;
    var langisTaken = Math.min(langisNeeded, availableLangis);
    VS.res.langis = Math.max(0, availableLangis - langisTaken);
    
    // Track if we have enough for production multiplier
    this._hasLangis = langisTaken >= langisNeeded * 0.9;
  }
  
  // Handle production
  if (def.prodRes && stats.productionRate > 0) {
    var prodMult = this.getProductionMultiplier(VS);
    var effectiveRate = stats.productionRate * stats.efficiency * prodMult;
    
    this.prodAccum += dt * effectiveRate;
    if (this.prodAccum >= 1) {
      var produced   = Math.floor(this.prodAccum);
      this.prodAccum -= produced;
      var zoneMult   = (VS.getZoneMult && def.prodRes) ? VS.getZoneMult(def.prodRes, this.x, this.y) : 1.0;
      var producedZ  = Math.round(produced * zoneMult);
      
      if (def.prodRes === 'gold') {
        var maxGold = stats.maxUncollectedGold || 999;
        this.uncollectedGold = Math.min(maxGold, this.uncollectedGold + producedZ);
      } else if (def.prodRes === 'rice') {
        var maxFood = stats.maxUncollectedFood || 999;
        this.uncollectedFood = Math.min(maxFood, (this.uncollectedFood || 0) + producedZ);
      } else if (def.prodRes === 'langis') {
        var maxLangis = stats.maxUncollectedLangis || 999;
        this.uncollectedLangis = Math.min(maxLangis, (this.uncollectedLangis || 0) + producedZ);
      } else {
        VS.res[def.prodRes] = Math.min(VS.resCap[def.prodRes] || 9999, (VS.res[def.prodRes] || 0) + producedZ);
      }
    }
  }
  
  if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2);
};

Building.prototype.shouldShowGoldIndicator = function() {
  var stats = this.getStats();
  var maxGold = stats.maxUncollectedGold || 0;
  if (maxGold === 0) return false;
  return this.uncollectedGold >= (maxGold * 0.4);
};

Building.prototype.shouldShowFoodIndicator = function() {
  var stats = this.getStats();
  var maxFood = stats.maxUncollectedFood || 0;
  if (maxFood === 0) return false;
  return this.uncollectedFood >= (maxFood * 0.4);
};

Building.prototype.shouldShowLangisIndicator = function() {
  var stats = this.getStats();
  var maxLangis = stats.maxUncollectedLangis || 0;
  if (maxLangis === 0) return false;
  return this.uncollectedLangis >= (maxLangis * 0.4);
};

/* ══════════════════════════════════════════════════════════════
   RENDERING
══════════════════════════════════════════════════════════════ */
Building.prototype.draw = function(ctx, now) {
  var def = this.getDef();
  var sc  = perspScale(this.y);
  var w   = this.w * sc, h = this.h * sc;
  ctx.save();
  ctx.translate(this.x, this.y);

  if (this.isWreck) { _drawWreck(ctx, sc, w, h, this); ctx.restore(); return; }

  if (this.pulse > 0) {
    ctx.globalAlpha = this.pulse * 0.6;
    ctx.strokeStyle = '#f5c842'; ctx.lineWidth = 3 * sc;
    ctx.beginPath(); ctx.ellipse(0, 0, w*0.75+(1-this.pulse)*20*sc, h*0.5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Draw langis shortage indicator (red overlay or warning)
  if (!this._hasLangis && this.getStats().langisConsumption > 0 && !this.underConstruction) {
    ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 500) * 0.15;
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.globalAlpha = 1;
  }

  if (this.underConstruction) {
    var pct = this.constructionMax > 0 ? 1 - this.constructionTime / this.constructionMax : 0;
    var renderer0 = {
      farm:_drawFarm, paaralan:_drawPaaralan, cuartel:_drawCuartel,
      moog:_drawMoog, kuta:_drawKuta, bantayan:_drawBantayan,
      templo:_drawTemplo, hukuman:_drawHukuman, ospital:_drawOspital,
      pulisya:_drawPulisya, daungan:_drawDaungan, kalye:_drawKalye,
      minalangis:_drawMinalangis,
    }[this.type];
    ctx.globalAlpha = 0.25;
    if (renderer0) renderer0(ctx, sc, w, h, def, this.level, 0);
    else _drawStandard(ctx, sc, w, h, def, this.type, this.level);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 2 * sc;
    ctx.beginPath(); ctx.moveTo(-w*0.5, 0); ctx.lineTo(-w*0.5, -h*1.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*0.5, 0); ctx.lineTo( w*0.5, -h*1.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w*0.5, -h*0.7); ctx.lineTo(w*0.5, -h*0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w*0.5, -h*1.25); ctx.lineTo(w*0.5, -h*1.25); ctx.stroke();
    ctx.strokeStyle = 'rgba(139,96,48,0.5)';
    ctx.beginPath(); ctx.moveTo(-w*0.5,-h*1.25); ctx.lineTo(w*0.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( w*0.5,-h*1.25); ctx.lineTo(-w*0.5, 0); ctx.stroke();
    var pbW = w * 1.1, pbH = 8 * sc, pbX = -pbW/2, pbY = -h*1.42;
    ctx.fillStyle = '#1a0e06'; ctx.fillRect(pbX, pbY, pbW, pbH);
    ctx.fillStyle = pct > 0.66 ? '#44aa44' : pct > 0.33 ? '#f5c842' : '#e67e22';
    ctx.fillRect(pbX, pbY, pbW * pct, pbH);
    ctx.strokeStyle = '#8b6030'; ctx.lineWidth = 1; ctx.strokeRect(pbX, pbY, pbW, pbH);
    var secsLeft = Math.ceil(this.constructionTime);
    var timeStr  = secsLeft > 60 ? Math.ceil(secsLeft/60)+'min '+secsLeft%60+'s' : secsLeft+'s';
    ctx.fillStyle = '#f5c842'; ctx.font = 'bold '+(10*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(timeStr, 0, pbY - 3*sc);
    if (this.workers && this.workers.length > 0) {
      ctx.fillStyle = '#44aa44'; ctx.font = 'bold '+(9*sc)+'px monospace';
      ctx.fillText('👷 '+this.workers.length+' manggagawa', 0, pbY - 14*sc);
    }
    ctx.restore();
    return;
  }

  if (this.type !== 'farm') {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, h*0.12, w*0.62, h*0.2, 0, 0, Math.PI*2); ctx.fill();
  }

  var _inlineRenderers = {
    farm:_drawFarm, paaralan:_drawPaaralan, cuartel:_drawCuartel,
    moog:_drawMoog, kuta:_drawKuta, bantayan:_drawBantayan,
    templo:_drawTemplo, hukuman:_drawHukuman, ospital:_drawOspital,
    pulisya:_drawPulisya, daungan:_drawDaungan, kalye:_drawKalye,
    minalangis:_drawMinalangis,
  };

  drawBuilding(ctx, sc, w, h, def, this.type, this.level, now, _inlineRenderers);

  if (def.isHome) {
    var occ = this.getOccupancy(), cap = this.getCapacity();
    _drawOccupancyBadge(ctx, sc, w, h, occ, cap, 'home');
  } else if ((def.workerSlots || 0) > 0) {
    var wSlots = this.getWorkerSlots();
    var wCount = this._assignedWorkers ? this._assignedWorkers.length : 0;
    if (wSlots > 0) _drawOccupancyBadge(ctx, sc, w, h, wCount, wSlots, 'work');
  }

  if (def.attackRange > 0) {
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, def.attackRange*sc, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Draw gold indicator
  if (this.shouldShowGoldIndicator()) {
    var ug   = Math.floor(this.uncollectedGold);
    var bob2 = Math.sin(Date.now()/600 + this.x) * 3 * sc;
    ctx.fillStyle = '#f5c842';
    ctx.beginPath(); ctx.arc(0, -h*1.55+bob2, 13*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#c49a1a'; ctx.lineWidth = 1.5*sc; ctx.stroke();
    ctx.fillStyle = '#7a5010'; ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🪙', 0, -h*1.55+bob2);
    ctx.fillStyle = '#f5c842'; ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+ug, 0, -h*1.55+bob2+15*sc);
    ctx.textBaseline = 'alphabetic';
  }
  
  // Draw rice indicator
  if (this.shouldShowFoodIndicator()) {
    var uf   = Math.floor(this.uncollectedFood);
    var bob3 = Math.sin(Date.now()/700 + this.x + 1) * 3 * sc;
    var xOff = this.shouldShowGoldIndicator() ? w * 0.7 : 0;
    ctx.fillStyle = '#44bb44';
    ctx.beginPath(); ctx.arc(xOff, -h*1.55+bob3, 13*sc, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#228822'; ctx.lineWidth = 1.5*sc; ctx.stroke();
    ctx.fillStyle = '#0a2a0a'; ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌾', xOff, -h*1.55+bob3);
    ctx.fillStyle = '#88ee88'; ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+uf, xOff, -h*1.55+bob3+15*sc);
    ctx.textBaseline = 'alphabetic';
  }
  
  // Draw langis indicator
  if (this.shouldShowLangisIndicator()) {
    var ul   = Math.floor(this.uncollectedLangis);
    var bobL = Math.sin(Date.now()/800 + this.x + 2) * 3 * sc;
    var xOff = 0;
    
    if (this.shouldShowGoldIndicator() && this.shouldShowFoodIndicator()) {
      xOff = -w * 0.5;
    } else if (this.shouldShowGoldIndicator()) {
      xOff = w * 0.35;
    } else if (this.shouldShowFoodIndicator()) {
      xOff = -w * 0.35;
    }
    
    ctx.fillStyle = '#2a4a3a';
    ctx.beginPath(); 
    ctx.arc(xOff, -h*1.55+bobL, 13*sc, 0, Math.PI*2); 
    ctx.fill();
    ctx.strokeStyle = '#4a8a6a'; 
    ctx.lineWidth = 1.5*sc; 
    ctx.stroke();
    ctx.fillStyle = '#0a2a1a'; 
    ctx.font = 'bold '+(9*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; 
    ctx.textBaseline = 'middle';
    ctx.fillText('⛽', xOff, -h*1.55+bobL);
    ctx.fillStyle = '#88eeaa'; 
    ctx.font = 'bold '+(8*sc)+'px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('+'+ul, xOff, -h*1.55+bobL+15*sc);
    ctx.textBaseline = 'alphabetic';
  }

  if (this.level > 1) {
    ctx.fillStyle = '#f5c842';
    ctx.beginPath(); ctx.arc(w*0.38, -h*1.22, 7*sc, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a0f06'; ctx.font = 'bold '+(10*sc)+'px Oldenburg,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.level, w*0.38, -h*1.22+0.5*sc);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.fillStyle = 'rgba(255,225,155,0.82)';
  ctx.font = (11*sc)+'px Crimson Pro,serif'; ctx.textAlign = 'center';
  ctx.fillText(def.label, 0, h*0.28);
  ctx.restore();
};

/* ── Wreck drawing functions (unchanged) ──────────────────── */
function _drawWreck(ctx, sc, w, h, b) {
  var def = b.getDef ? b.getDef() : {};
  ctx.fillStyle = 'rgba(80,60,40,0.75)'; ctx.fillRect(-w*0.45,-h*0.28,w*0.9,h*0.32);
  ctx.fillStyle = 'rgba(100,80,55,0.65)';
  [[-w*0.3,-h*0.35,w*0.18,h*0.1],[w*0.15,-h*0.3,w*0.22,h*0.12],[-w*0.45,-h*0.1,w*0.15,h*0.1]].forEach(function(r){ctx.fillRect(r[0],r[1],r[2],r[3]);});
  if (def.wallColor) { ctx.globalAlpha=0.35; ctx.fillStyle=def.wallColor; ctx.fillRect(-w*0.42,-h*0.3,w*0.84,h*0.34); ctx.globalAlpha=1; }
  ctx.strokeStyle=def.roofColor||'#5a3a10'; ctx.lineWidth=2.5*sc;
  ctx.beginPath(); ctx.moveTo(-w*0.25,-h*0.28); ctx.lineTo(0,-h*0.58); ctx.lineTo(w*0.18,-h*0.28); ctx.stroke();
  ctx.fillStyle='rgba(10,6,2,0.78)';
  var pw=32*sc,ph=13*sc,px=-pw/2,py=-h*0.82;
  _rrectWreck(ctx,px,py,pw,ph,3*sc); ctx.fill();
  ctx.fillStyle='#ffcc44'; ctx.font='bold '+Math.max(7,Math.round(9*sc))+'px monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🔧 SIRA',0,py+ph/2); ctx.textBaseline='alphabetic';
}

function _rrectWreck(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

function _drawOccupancyBadge(ctx,sc,w,h,occ,cap,mode){var text=occ+'/'+cap;var icon=mode==='work'?'👷':'🏠';var label=icon+text;var bx=-w*0.48,by=-h*1.28,bw=Math.max((label.length*6+10)*sc,28*sc),bh=12*sc;ctx.save();if(mode==='work'){ctx.fillStyle=occ>=cap?'#1a4a1a':occ>0?'#1a3a0a':'#1a1808';ctx.strokeStyle=occ>=cap?'#44aa44':'#5a8a3a';}else{ctx.fillStyle=occ>=cap?'#c0392b':occ>0?'#1a4a8a':'#1a1808';ctx.strokeStyle=occ>=cap?'#e74c3c':'#4a8abf';}ctx.lineWidth=0.8;_rrect(ctx,bx,by,bw,bh,2*sc);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font=(8*sc)+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,bx+bw/2,by+bh/2);ctx.textBaseline='alphabetic';ctx.restore();}

function _rrect(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();}

/* ══════════════════════════════════════════════════════════════
   DRAW FUNCTIONS (unchanged)
══════════════════════════════════════════════════════════════ */
function _drawFarm(ctx,sc,w,h,def,level,now){var t=now?now/1000:0;var rows=Math.min(2+level,5);var fw=w*1.1,fh=h*0.9,top=-fh*0.5,rowH=fh/rows;for(var r=0;r<rows;r++){var ry=top+r*rowH;ctx.fillStyle=(r%2===0)?'rgba(80,140,160,0.72)':'rgba(60,120,140,0.65)';ctx.fillRect(-fw*0.5,ry,fw,rowH-1.5*sc);var shimmer=Math.sin(t*0.9+r*1.1)*0.12+0.10;ctx.fillStyle='rgba(200,240,255,'+shimmer+')';ctx.fillRect(-fw*0.3,ry+rowH*0.35,fw*0.6,1.5*sc);ctx.fillStyle='rgba(180,220,255,0.15)';ctx.fillRect(-fw*0.5,ry+1.5*sc,fw,rowH*0.18);ctx.fillStyle='#6b4c2a';ctx.fillRect(-fw*0.52,ry+rowH-1.5*sc,fw*1.04,3.5*sc);ctx.fillStyle='#7a5830';ctx.fillRect(-fw*0.52,ry,3*sc,rowH);ctx.fillRect(fw*0.49,ry,3*sc,rowH);var stalksPerRow=Math.floor(fw/(8*sc)),stalkSpacing=fw/(stalksPerRow+1);for(var s=0;s<stalksPerRow;s++){var sx2=-fw*0.5+stalkSpacing*(s+1);var sway=Math.sin(t*1.2+s*0.7+r*2.1)*0.8*sc;var stalkH=(rowH*0.62)*(0.85+0.3*((s*7+r*3)%5)/5);var stalkBase=ry+rowH-2*sc;ctx.strokeStyle='#4a7a28';ctx.lineWidth=1.2*sc;ctx.beginPath();ctx.moveTo(sx2,stalkBase);ctx.quadraticCurveTo(sx2+sway,stalkBase-stalkH*0.5,sx2+sway*1.5,stalkBase-stalkH);ctx.stroke();ctx.strokeStyle='#8aae38';ctx.lineWidth=1.8*sc;ctx.beginPath();ctx.moveTo(sx2+sway*1.5,stalkBase-stalkH);ctx.quadraticCurveTo(sx2+sway*1.5+2*sc,stalkBase-stalkH+2*sc,sx2+sway*1.5+1*sc,stalkBase-stalkH+4.5*sc);ctx.stroke();ctx.fillStyle='rgba(200,170,40,0.85)';ctx.beginPath();ctx.ellipse(sx2+sway*1.5+1*sc,stalkBase-stalkH+5.5*sc,1.4*sc,2.2*sc,0.3,0,Math.PI*2);ctx.fill();}}ctx.strokeStyle='#5a3c18';ctx.lineWidth=2*sc;ctx.strokeRect(-fw*0.52,top,fw*1.04,fh+2*sc);var scx=fw*0.32,scy=top+fh*0.25;ctx.strokeStyle='#6b4020';ctx.lineWidth=1.8*sc;ctx.beginPath();ctx.moveTo(scx,scy+10*sc);ctx.lineTo(scx,scy-14*sc);ctx.stroke();ctx.beginPath();ctx.moveTo(scx-7*sc,scy-5*sc);ctx.lineTo(scx+7*sc,scy-5*sc);ctx.stroke();ctx.fillStyle='#c8a040';ctx.beginPath();ctx.ellipse(scx,scy-15*sc,4.5*sc,2.5*sc,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(scx,scy-17*sc,2.5*sc,2.5*sc,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(200,80,40,0.7)';ctx.fillRect(scx-3.5*sc,scy-10*sc,7*sc,6*sc);}

function _drawStandard(ctx,sc,w,h,def,type,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);var ws=ctx.createLinearGradient(-w/2,0,w/2,0);ws.addColorStop(0,'rgba(0,0,0,0)');ws.addColorStop(0.7,'rgba(0,0,0,0)');ws.addColorStop(1,'rgba(0,0,0,0.18)');ctx.fillStyle=ws;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.12);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,0.08)';ctx.beginPath();ctx.moveTo(-w*0.1,-h*0.55);ctx.lineTo(0,-h*1.12);ctx.lineTo(w*0.1,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle=def.doorColor||'rgba(30,15,5,0.8)';var dw=10*sc,dh=h*0.34;ctx.beginPath();ctx.rect(-dw/2,-dh,dw,dh);ctx.arc(0,-dh,dw/2,Math.PI,0,true);ctx.fill();var ww=9*sc,wh=7*sc;ctx.fillStyle=def.winColor||'rgba(255,230,140,0.6)';ctx.fillRect(-w*0.32,-h*0.48,ww,wh);ctx.fillRect(w*0.22,-h*0.48,ww,wh);ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=0.8*sc;[-w*0.32+ww/2,w*0.22+ww/2].forEach(function(wx){ctx.beginPath();ctx.moveTo(wx,-h*0.48);ctx.lineTo(wx,-h*0.48+wh);ctx.moveTo(wx-ww/2,-h*0.48+wh/2);ctx.lineTo(wx+ww/2,-h*0.48+wh/2);ctx.stroke();});if(type==='storage'){ctx.fillStyle='rgba(100,80,40,0.7)';ctx.beginPath();ctx.ellipse(0,-h*0.28,8*sc,10*sc,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6b4c2a';ctx.lineWidth=1.5*sc;for(var bi=0;bi<2;bi++){ctx.beginPath();ctx.ellipse(0,-h*0.28+(bi-0.5)*8*sc,8*sc,2.5*sc,0,0,Math.PI*2);ctx.stroke();}}}

function _drawPaaralan(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.6,-h*0.6,w*1.2,h*0.1);ctx.fillStyle=def.winColor;for(var wi=-1;wi<=1;wi++){ctx.fillRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=0.8*sc;ctx.strokeRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);}ctx.strokeStyle='#888';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.moveTo(w*0.38,-h*0.6);ctx.lineTo(w*0.38,-h*1.25);ctx.stroke();ctx.fillStyle='#3a80c0';ctx.fillRect(w*0.38,-h*1.23,12*sc,7*sc);ctx.fillStyle='#fff';ctx.fillRect(w*0.38,-h*1.23,12*sc,3*sc);ctx.fillStyle=def.doorColor||'rgba(80,60,0,0.8)';ctx.fillRect(-6*sc,-h*0.28,12*sc,h*0.28);ctx.fillStyle='#fff8c0';ctx.fillRect(-w*0.35,-h*0.68,w*0.7,9*sc);ctx.fillStyle='#5a3800';ctx.font=(9*sc)+'px Oldenburg,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PAARALAN',0,-h*0.68+4.5*sc);ctx.textBaseline='alphabetic';}

function _drawCuartel(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.62,w*1.1,h*0.1);for(var bi=-2;bi<=2;bi++)ctx.fillRect(bi*w*0.22-5*sc,-h*0.76,10*sc,15*sc);ctx.fillStyle='rgba(10,20,5,0.7)';for(var si=-1;si<=1;si++)ctx.fillRect(si*w*0.28-2.5*sc,-h*0.53,5*sc,13*sc);ctx.fillStyle=def.doorColor||'rgba(10,30,5,0.9)';ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.strokeStyle='#6b4c2a';ctx.lineWidth=2*sc;ctx.strokeRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.fillStyle='#8b7040';for(var di=0;di<3;di++){ctx.beginPath();ctx.arc(-4*sc,-h*0.26+di*5*sc,1.5*sc,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4*sc,-h*0.26+di*5*sc,1.5*sc,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#8b4513';ctx.fillRect(-w*0.42,-h*0.51,3*sc,12*sc);ctx.fillStyle='#ff8c00';ctx.beginPath();ctx.ellipse(-w*0.42+1.5*sc,-h*0.54,4*sc,5*sc,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,200,50,0.6)';ctx.beginPath();ctx.ellipse(-w*0.42+1.5*sc,-h*0.56,2.5*sc,3.5*sc,0,0,Math.PI*2);ctx.fill();}

function _drawMoog(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.beginPath();ctx.rect(-w*0.4,-h*0.9,w*0.8,h*1.05);ctx.fill();ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.5,-h*0.92,w*1.0,h*0.12);for(var mi=-2;mi<=2;mi++)ctx.fillRect(mi*w*0.22-4*sc,-h*1.05,8*sc,14*sc);ctx.fillStyle='rgba(10,8,5,0.7)';ctx.fillRect(-3*sc,-h*0.6,6*sc,14*sc);ctx.fillRect(-3*sc,-h*0.3,6*sc,14*sc);ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.8*sc;for(var si2=0;si2<4;si2++){ctx.beginPath();ctx.moveTo(-w*0.4,-h*0.6+si2*h*0.2);ctx.lineTo(w*0.4,-h*0.6+si2*h*0.2);ctx.stroke();}ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';ctx.beginPath();ctx.rect(-5*sc,0,10*sc,h*0.2);ctx.arc(0,0,5*sc,Math.PI,0,true);ctx.fill();}

function _drawKuta(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w*0.55,-h*0.4,w*1.1,h*0.55);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.45,w*1.1,h*0.1);var nParts=Math.floor(w*0.9/12);for(var ki=0;ki<nParts;ki++){var kx=-w*0.5+ki*(w/nParts);ctx.fillRect(kx,-h*0.56,w*0.04,h*0.15);}ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=0.6*sc;ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.15);ctx.lineTo(w*0.55,-h*0.15);ctx.stroke();ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.3);ctx.lineTo(w*0.55,-h*0.3);ctx.stroke();}

function _drawBantayan(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.beginPath();ctx.rect(-w*0.35,-h*1.1,w*0.7,h*1.25);ctx.fill();ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.42,-h*1.1);ctx.lineTo(0,-h*1.55);ctx.lineTo(w*0.42,-h*1.1);ctx.closePath();ctx.fill();ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.42,-h*0.55,w*0.84,h*0.08);for(var ai=-1;ai<=1;ai++)ctx.fillRect(ai*w*0.25-4*sc,-h*0.64,8*sc,10*sc);ctx.fillStyle='rgba(10,8,5,0.7)';ctx.fillRect(-2.5*sc,-h*0.9,5*sc,12*sc);ctx.fillRect(-2.5*sc,-h*0.35,5*sc,12*sc);ctx.fillStyle=def.doorColor||'rgba(20,15,5,0.95)';ctx.beginPath();ctx.rect(-5*sc,0,10*sc,h*0.2);ctx.arc(0,0,5*sc,Math.PI,0,true);ctx.fill();ctx.fillStyle='#DAA520';ctx.beginPath();ctx.moveTo(-3*sc,-h*1.53);ctx.lineTo(0,-h*1.7);ctx.lineTo(3*sc,-h*1.53);ctx.closePath();ctx.fill();}

function _drawTemplo(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,0.1)';ctx.beginPath();ctx.moveTo(-w*0.35,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.35,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(50,30,0,0.9)';ctx.fillRect(-8*sc,-h*0.35,16*sc,h*0.35);ctx.fillStyle='#DAA520';ctx.beginPath();ctx.arc(0,-h*0.7,6*sc,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffaaa';ctx.beginPath();ctx.arc(0,-h*0.7,3.5*sc,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(200,200,255,0.3)';ctx.lineWidth=1.5*sc;for(var ti=0;ti<2;ti++){ctx.beginPath();ctx.moveTo((ti?5:-5)*sc,-h*0.55);ctx.quadraticCurveTo((ti?12:-12)*sc,-h*0.75,(ti?6:-6)*sc,-h*0.95);ctx.stroke();}}

function _drawHukuman(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=_darken(def.wallColor,0.15);for(var ci=-1;ci<=1;ci++){ctx.fillRect(ci*w*0.28-3*sc,-h*0.55,6*sc,h*0.5);}ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*0.9);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle=def.doorColor||'rgba(50,30,5,0.9)';ctx.fillRect(-9*sc,-h*0.3,18*sc,h*0.3);ctx.strokeStyle='#DAA520';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.moveTo(0,-h*0.72);ctx.lineTo(0,-h*0.62);ctx.stroke();ctx.beginPath();ctx.moveTo(-8*sc,-h*0.72);ctx.lineTo(8*sc,-h*0.72);ctx.stroke();ctx.beginPath();ctx.arc(-6*sc,-h*0.68,4*sc,0,Math.PI);ctx.stroke();ctx.beginPath();ctx.arc(6*sc,-h*0.68,4*sc,0,Math.PI);ctx.stroke();}

function _drawOspital(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.55,-h*0.6,w*1.1,h*0.1);ctx.fillStyle=def.winColor;for(var wi=-1;wi<=1;wi++){ctx.fillRect(wi*w*0.28-7*sc,-h*0.5,14*sc,10*sc);}ctx.fillStyle='#cc2222';ctx.fillRect(-3*sc,-h*0.48,6*sc,18*sc);ctx.fillRect(-9*sc,-h*0.38,18*sc,6*sc);ctx.fillStyle=def.doorColor;ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);}

function _drawPulisya(ctx,sc,w,h,def,level){ctx.fillStyle=def.wallColor;ctx.fillRect(-w/2,-h*0.55,w,h*0.67);ctx.fillStyle=def.roofColor;ctx.beginPath();ctx.moveTo(-w*0.58,-h*0.55);ctx.lineTo(0,-h*1.0);ctx.lineTo(w*0.58,-h*0.55);ctx.closePath();ctx.fill();ctx.fillStyle='#f5c842';ctx.beginPath();ctx.arc(0,-h*0.35,8*sc,0,Math.PI*2);ctx.fill();ctx.fillStyle=def.wallColor;ctx.font='bold '+(6*sc)+'px Oldenburg,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('PNP',0,-h*0.35+0.5*sc);ctx.textBaseline='alphabetic';ctx.fillStyle=def.doorColor;ctx.fillRect(-7*sc,-h*0.28,14*sc,h*0.28);}

function _drawDaungan(ctx,sc,w,h,def,level){ctx.fillStyle='#5a4020';ctx.fillRect(-w*0.55,-h*0.25,w*1.1,h*0.35);for(var pi=-2;pi<=2;pi++){ctx.fillStyle='#4a3010';ctx.fillRect(pi*w*0.22-2*sc,0,4*sc,h*0.3);}ctx.fillStyle=def.wallColor;ctx.fillRect(-w*0.35,-h*0.55,w*0.7,h*0.32);ctx.fillStyle=def.roofColor;ctx.fillRect(-w*0.4,-h*0.6,w*0.8,h*0.1);ctx.fillStyle='rgba(60,120,180,0.35)';ctx.fillRect(-w*0.55,h*0.22,w*1.1,h*0.12);ctx.strokeStyle='#e8d4a0';ctx.lineWidth=1.5*sc;ctx.beginPath();ctx.arc(0,-h*0.38,4*sc,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-h*0.38-4*sc);ctx.lineTo(0,-h*0.38+8*sc);ctx.stroke();}

function _drawKalye(ctx,sc,w,h,def,level){ctx.fillStyle='#7a6a50';ctx.fillRect(-w*0.55,-h*0.3,w*1.1,h*0.45);ctx.strokeStyle='rgba(240,230,180,0.5)';ctx.lineWidth=1.5*sc;ctx.setLineDash([8*sc,6*sc]);ctx.beginPath();ctx.moveTo(-w*0.5,0);ctx.lineTo(w*0.5,0);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='rgba(255,230,150,0.3)';ctx.lineWidth=1*sc;ctx.beginPath();ctx.moveTo(-w*0.55,-h*0.29);ctx.lineTo(w*0.55,-h*0.29);ctx.stroke();ctx.beginPath();ctx.moveTo(-w*0.55,h*0.14);ctx.lineTo(w*0.55,h*0.14);ctx.stroke();}

function _drawMinalangis(ctx, sc, w, h, def, level) {
  ctx.fillStyle = '#3a2808';
  ctx.fillRect(-w*0.5, -h*0.2, w, h*0.32);
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 3.5 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.35, 0); ctx.lineTo(0, -h*1.05); ctx.lineTo(w*0.35, 0); ctx.stroke();
  ctx.lineWidth = 2 * sc; ctx.strokeStyle = '#4a2a08';
  ctx.beginPath(); ctx.moveTo(-w*0.25, -h*0.35); ctx.lineTo(w*0.25, -h*0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w*0.18, -h*0.65); ctx.lineTo(w*0.18, -h*0.65); ctx.stroke();
  ctx.fillStyle = '#7a4018'; ctx.fillRect(-w*0.38, -h*0.38, w*0.28, h*0.2);
  ctx.strokeStyle = '#c87828'; ctx.lineWidth = 4 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.24, -h*0.3); ctx.lineTo(-w*0.08, -h*0.52); ctx.stroke();
  ctx.strokeStyle = '#1a1008'; ctx.lineWidth = 5 * sc;
  ctx.beginPath(); ctx.moveTo(-w*0.08, -h*0.52); ctx.lineTo(-w*0.08, 0); ctx.stroke();
  ctx.fillStyle = 'rgba(10,8,4,0.55)';
  ctx.beginPath(); ctx.ellipse(-w*0.08, h*0.08, 10*sc, 4*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5a3810';
  ctx.beginPath(); ctx.ellipse(w*0.3, -h*0.1, 11*sc, 11*sc, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#8a5820'; ctx.lineWidth = 1.5 * sc;
  for (var ring = -1; ring <= 1; ring++) {
    ctx.beginPath(); ctx.ellipse(w*0.3, -h*0.1 + ring*5*sc, 11*sc, 3*sc, 0, 0, Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle = '#f5c842'; ctx.fillRect(-3*sc, -h*1.08, 6*sc, 6*sc);
  ctx.fillStyle = '#cc2222'; ctx.fillRect(-3*sc, -h*1.08, 3*sc, 3*sc); ctx.fillRect(0, -h*1.05, 3*sc, 3*sc);
  if (level >= 2) {
    ctx.fillStyle = '#2a1808';
    ctx.beginPath(); ctx.ellipse(w*0.44, -h*0.22, 5*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 1 * sc;
    ctx.beginPath(); ctx.ellipse(w*0.44, -h*0.22, 5*sc, 2*sc, 0, 0, Math.PI); ctx.stroke();
  }
}

function _darken(hex,amount){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.max(0,Math.round(r*(1-amount)));g=Math.max(0,Math.round(g*(1-amount)));b=Math.max(0,Math.round(b*(1-amount)));return '#'+('0'+r.toString(16)).slice(-2)+('0'+g.toString(16)).slice(-2)+('0'+b.toString(16)).slice(-2);}

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
    var b = new Building(d.type, d.x, d.y);
    b.id      = d.id;
    b.level   = d.level !== undefined ? d.level : 1;
    b.unlocked = d.unlocked !== undefined ? d.unlocked : true;
    if (d.isWreck) { b.isWreck = true; b.originalType = d.originalType || d.type; }
    b.uncollectedGold = d.uncollectedGold || 0;
    b.uncollectedFood = d.uncollectedFood || 0;
    b.uncollectedLangis = d.uncollectedLangis || 0;
    if (d.underConstruction) {
      b.underConstruction = true;
      b.constructionTime  = d.constructionTime || 0;
      b.constructionMax   = d.constructionMax  || 0;
      if (d.upgradeLevel) b._upgradeLevel = d.upgradeLevel;
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