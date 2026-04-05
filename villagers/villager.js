/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/villager.js  (major rewrite)

   CHANGES FROM ORIGINAL
   ─────────────────────────────────────────────────────────────
   FOUR NEW CITIZEN STATS (GDD requirement)
     hunger     0–100  Depletes daily. Managed by resource.js
                       tickFoodPool(). High hunger → slower speed.
     health     0–100  Drops when hunger is extreme, improves with
                       ospital buildings and Libreng Pagamot policy.
     govTrust   0–100  Citizen's trust in the player-government.
                       Affected by decisions, events, corruption.
     happiness  0–100  Overall life satisfaction. Affected by needs
                       met, anger accumulated, quality-path buildings.

   ANGER (supporting stat)
     anger      0–100  Accumulates from ignored needs, high tax,
                       disasters. Drains govTrust slowly when high.
                       Managed by citizenNeeds.js and policy.js.

   SPEED SCALING
     updateVillager now reads v._hungerSpeedMult (written by
     resource.js tickFoodPool) to slow hungry villagers.

   WORK BUILDING ASSIGNMENT
     Each villager gets a workBuilding reference set by assignWork().
     Called alongside assignHomes() from main.js _onNewDay().
     Villagers spend workStayChance of waypoints near workBuilding.

   ISLEADER FLAG
     Some citizens can become leaders (isLeader = true).
     Set by politics.js based on trust/anger history.
     Leader citizens count 3× in elections.

   MILITARY VISUAL OVERHAUL (v4)
     Bantay, Bayani, Marine, Air Force now use _drawArmedBody()
     which renders:
       • Armour breastplate over torso
       • Pauldron shoulder pads
       • Helmet with visor slit (bantay/bayani) or baret (marine/airforce)
       • Weapon in right hand — spear (bantay), sword (bayani),
         rifle (marine/airforce)
       • Rank stripe on left arm
     Civilian types continue to use the original _drawBody().

   NEW TYPES (v4)
     typeIdx 13 — Marine     (trains at Cuartel level 4)
     typeIdx 14 — Air Force  (trains at Cuartel level 5)

   TRAINING MAP minLevel support
     Each cuartel entry now has an optional minLevel field that
     startTraining / drawer.js should check against building.level
     before offering the course.

   COMPLETE VILLAGER OBJECT SHAPE
   ─────────────────────────────────────────────────────────────
   id, typeIdx, x, y, dx, dy           — identity + position
   label, gender, mood, personality    — character
   carrying, carryIcon                 — item display
   waitT, spd                          — movement
   homeBuilding, isHome                — housing
   workBuilding, workTimer, roamTimer  — workplace
   collisionCooldown, _hoverStopped    — interaction state
   _typeDef, _typeScale                — type reference cache
   isTraining, trainingProgress, trainBuilding, trainEntry — training
   isChild, age, growthTimer           — lifecycle
   parentA, parentB                    — reproduction links
   hunger, health, govTrust, happiness, anger, income — GDD stats
   isLeader                            — politics flag
   _hungerSpeedMult                    — computed by resource.js
   _policyHungerMult, _policyIncomeBonus — computed by policy.js
═══════════════════════════════════════════════════════════════ */

import { perspScale, clamp, dist, randRange, randInt, lerp } from '../utils/perspective.js';
import { tickQuips, drawVillagerQuip }                        from './villagerQuips.js';

/* ── Filipino name lists ──────────────────────────────────── */
var MALE_NAMES = [
  'Jose','Pedro','Juan','Miguel','Carlos','Antonio','Roberto',
  'Eduardo','Fernando','Mario','Ramon','Luis','Manuel','Diego',
  'Andres','Ricardo','Victor','Ernesto','Alfredo','Rodrigo',
  'Bong','Boy','Jun','Rey','Dong','Noel','Rodel','Arnel','Nestor','Efren',
];
var FEMALE_NAMES = [
  'Maria','Ana','Rosa','Elena','Carmen','Luz','Gloria','Nena',
  'Lita','Cora','Perla','Delia','Norma','Alma','Linda','Susan',
  'Rowena','Maricel','Jasmine','Lovely','Fe','Grace','Hope','Joy',
  'Liwayway','Paraluman','Marilou','Sheryl','Noemi','Glenda',
];
var SURNAMES = [
  'Reyes','Cruz','Santos','Garcia','Torres','Flores','Ramos','Dela Cruz',
  'Aquino','Mendoza','Lopez','Ocampo','Castillo','Bautista','Villanueva',
  'Padilla','Salazar','Santiago','Lim','Tan','Abad','Dela Torre',
  'Manalo','Soriano','Pangilinan','Buenaventura','Espiritu','Macaraeg',
];
var PERSONALITIES = [
  'Masipag','Malikhain','Masaya','Matiyaga','Maasikaso',
  'Matapang','Matalino','Mapagmahal','Mapagbigay','Maingat',
  'Makulit','Mapagpala','Mabait','Malusog','Masungit',
];
var MOODS = ['happy','masaya','tired','stressed','excited'];

/* ── Villager type counter ────────────────────────────────── */
var _vidCounter = 0;

/* ══════════════════════════════════════════════════════════════
   VILLAGER TYPE DATABASE
   typeIdx maps to this array. Order must be stable — used in
   saves and training references.
══════════════════════════════════════════════════════════════ */
export var VILLAGER_TYPES = [
  /* 0 */ {
    type:'magsasaka', typeIdx:0, role:'Magsasaka',
    scale:1.0, clothColor:'#8B4513', skinColor:'#F0DDB0',
    hat:'straw', hatColor:'#C19A6B',
    carryChance:0.7, carryIcon:'🌾', waitMin:2, waitMax:5, spd:25,
    waypointBias:'mines', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'farm', workStayChance:0.72, workRadius:55,
    workWaitMin:3, workWaitMax:9,
    isArmed:false,
  },
  /* 1 */ {
    type:'mangangalakal', typeIdx:1, role:'Mangangalakal',
    scale:1.0, clothColor:'#4A6FA5', skinColor:'#F0DDB0',
    hat:'wide', hatColor:'#2C3E50',
    carryChance:0.9, carryIcon:'📦', waitMin:1, waitMax:3, spd:30,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'palengke', workStayChance:0.65, workRadius:60,
    workWaitMin:2, workWaitMax:7,
    isArmed:false,
  },
  /* 2 */ {
    type:'bantay', typeIdx:2, role:'Bantay',
    scale:1.0, clothColor:'#2C3E50', skinColor:'#F0DDB0',
    hat:'helm', hatColor:'#566573',
    carryChance:0.1, carryIcon:'🗡️', waitMin:3, waitMax:6, spd:20,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'defence', workStayChance:0.55, workRadius:100,
    workWaitMin:4, workWaitMax:10,
    isArmed:true, armedType:'bantay',
  },
  /* 3 */ {
    type:'matanda', typeIdx:3, role:'Matanda',
    scale:0.9, clothColor:'#95A5A6', skinColor:'#E0C0A0',
    hat:'none', hatColor:'',
    carryChance:0.2, carryIcon:'📿', waitMin:4, waitMax:8, spd:15,
    waypointBias:'all', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:null, workStayChance:0, workRadius:0,
    workWaitMin:5, workWaitMax:12,
    isArmed:false,
  },
  /* 4 */ {
    type:'bata', typeIdx:4, role:'Bata',
    scale:0.68, clothColor:'#F39C12', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.3, carryIcon:'🧸', waitMin:0.5, waitMax:2, spd:38,
    waypointBias:'all', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:'home', workStayChance:0.60, workRadius:70,
    workWaitMin:1, workWaitMax:4,
    isArmed:false,
  },
  /* 5 */ {
    type:'guro', typeIdx:5, role:'Guro',
    scale:1.0, clothColor:'#1ABC9C', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.55, carryIcon:'📚', waitMin:2, waitMax:4, spd:22,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'paaralan', workStayChance:0.75, workRadius:45,
    workWaitMin:3, workWaitMax:8,
    isArmed:false,
  },
  /* 6 */ {
    type:'mangingisda', typeIdx:6, role:'Mangingisda',
    scale:1.0, clothColor:'#2980B9', skinColor:'#D4A06A',
    hat:'straw', hatColor:'#B8860B',
    carryChance:0.8, carryIcon:'🐟', waitMin:3, waitMax:7, spd:20,
    waypointBias:'mines', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'river', workStayChance:0.70, workRadius:50,
    workWaitMin:4, workWaitMax:10,
    isArmed:false,
  },
  /* 7 */ {
    type:'albularyo', typeIdx:7, role:'Albularyo',
    scale:1.0, clothColor:'#8E44AD', skinColor:'#E0C0A0',
    hat:'none', hatColor:'',
    carryChance:0.6, carryIcon:'🌿', waitMin:3, waitMax:6, spd:18,
    waypointBias:'all', sleeps:true, nightOwl:true, canReproduce:true,
    workBias:'templo', workStayChance:0.55, workRadius:65,
    workWaitMin:3, workWaitMax:9,
    isArmed:false,
  },
  /* 8 */ {
    type:'doktor', typeIdx:8, role:'Doktor',
    scale:1.0, clothColor:'#ECF0F1', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.4, carryIcon:'💊', waitMin:2, waitMax:5, spd:24,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'ospital', workStayChance:0.78, workRadius:40,
    workWaitMin:2, workWaitMax:6,
    isArmed:false,
  },
  /* 9 */ {
    type:'driver', typeIdx:9, role:'Driver',
    scale:1.0, clothColor:'#E67E22', skinColor:'#F0DDB0',
    hat:'cap', hatColor:'#784A10',
    carryChance:0.5, carryIcon:'🚗', waitMin:1, waitMax:3, spd:35,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'kalye', workStayChance:0.50, workRadius:80,
    workWaitMin:1, workWaitMax:5,
    isArmed:false,
  },
  /* 10 */ {
    type:'estudyante', typeIdx:10, role:'Estudyante',
    scale:0.85, clothColor:'#3498DB', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.4, carryIcon:'📖', waitMin:1, waitMax:4, spd:28,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:'paaralan', workStayChance:0.65, workRadius:50,
    workWaitMin:2, workWaitMax:6,
    isArmed:false,
  },
  /* 11 */ {
    type:'bayani', typeIdx:11, role:'Bayani',
    scale:1.15, clothColor:'#922B21', skinColor:'#F0DDB0',
    hat:'helm', hatColor:'#7B241C',
    carryChance:0.05, carryIcon:'⚔️', waitMin:2, waitMax:5, spd:22,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'cuartel', workStayChance:0.60, workRadius:90,
    workWaitMin:3, workWaitMax:8,
    isArmed:true, armedType:'bayani',
  },
  /* 12 */ {
    type:'konstruktor', typeIdx:12, role:'Konstruktor',
    scale:1.0, clothColor:'#E67E22', skinColor:'#F0DDB0',
    hat:'cap', hatColor:'#E8A000',
    carryChance:0.9, carryIcon:'🔨', waitMin:1, waitMax:3, spd:20,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'construction', workStayChance:0.90, workRadius:30,
    workWaitMin:1, workWaitMax:4,
    isArmed:false,
  },
  /* 13 — Marine (unlocks at Cuartel level 4) ─────────────── */
  {
    type:'marine', typeIdx:13, role:'Marine',
    scale:1.1, clothColor:'#1B4F72', skinColor:'#F0DDB0',
    hat:'helm', hatColor:'#1A5276',
    carryChance:0.05, carryIcon:'🔱', waitMin:2, waitMax:5, spd:28,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'defence', workStayChance:0.65, workRadius:120,
    workWaitMin:3, workWaitMax:9,
    isArmed:true, armedType:'marine',
  },
  /* 14 — Air Force (unlocks at Cuartel level 5) ──────────── */
  {
    type:'airforce', typeIdx:14, role:'Air Force',
    scale:1.1, clothColor:'#1C2833', skinColor:'#F0DDB0',
    hat:'cap', hatColor:'#17202A',
    carryChance:0.05, carryIcon:'✈️', waitMin:2, waitMax:4, spd:32,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'defence', workStayChance:0.60, workRadius:150,
    workWaitMin:3, workWaitMax:8,
    isArmed:true, armedType:'airforce',
  },
];

/* ══════════════════════════════════════════════════════════════
   TRAINING MAP
   Maps building type → array of training course entries.
   duration is in real-seconds.
   minLevel (optional) — minimum building level required.
   drawer.js / startTraining should check building.level >= minLevel.
══════════════════════════════════════════════════════════════ */
export var TRAINING_MAP = {
  paaralan: [
    { typeIdx:0,  label:'Magsasaka',       cost:{ gold:60,  rice:20 }, duration:180 },
    { typeIdx:5,  label:'Guro',            cost:{ gold:100, rice:30 }, duration:300 },
    { typeIdx:8,  label:'Doktor',          cost:{ gold:150, rice:50 }, duration:420 },
    { typeIdx:1,  label:'Mangangalakal',   cost:{ gold:80,  rice:20 }, duration:240 },
    { typeIdx:6,  label:'Mangingisda',     cost:{ gold:60,  rice:30 }, duration:180 },
    { typeIdx:7,  label:'Albularyo',       cost:{ gold:120, rice:40 }, duration:360 },
    { typeIdx:12, label:'Konstruktor',     cost:{ gold:80,  rice:20 }, duration:150 },
  ],
  cuartel: [
    { typeIdx:2,  label:'Bantay',          cost:{ gold:80,  rice:20 }, duration:200,  minLevel:1 },
    { typeIdx:11, label:'Bayani',          cost:{ gold:200, rice:60 }, duration:600,  minLevel:2 },
    { typeIdx:13, label:'Marine',          cost:{ gold:320, rice:80 }, duration:700,  minLevel:4 },
    { typeIdx:14, label:'Air Force',       cost:{ gold:450, rice:100}, duration:900,  minLevel:5 },
  ],
};

/* ══════════════════════════════════════════════════════════════
   createVillager
   Constructs a new villager object with all fields initialised.
══════════════════════════════════════════════════════════════ */
export function createVillager(typeIdx, x, y, parentA, parentB) {
  var vt     = VILLAGER_TYPES[typeIdx] || VILLAGER_TYPES[0];
  var gender = Math.random() < 0.5 ? 'male' : 'female';
  var first  = gender === 'male'
    ? MALE_NAMES[randInt(0, MALE_NAMES.length - 1)]
    : FEMALE_NAMES[randInt(0, FEMALE_NAMES.length - 1)];
  var surname = SURNAMES[randInt(0, SURNAMES.length - 1)];

  var vw = window._VW || 800;
  var vh = window._VH || 600;
  var px = x !== undefined ? x : randRange(vw * 0.1, vw * 0.9);
  var py = y !== undefined ? y : randRange(vh * 0.2, vh * 0.8);

  return {
    /* Identity */
    id:          'v_' + (_vidCounter++),
    typeIdx:     typeIdx,
    label:       first + ' ' + surname,
    gender:      gender,
    personality: PERSONALITIES[randInt(0, PERSONALITIES.length - 1)],
    mood:        MOODS[randInt(0, MOODS.length - 1)],

    /* Position + movement */
    x: px, y: py,
    dx: 0, dy: 0,
    spd: vt.spd,
    waitT: randRange(0.5, 2.0),
    destX: px, destY: py,

    /* Carrying */
    carrying:  Math.random() < vt.carryChance,
    carryIcon: vt.carryIcon,

    /* Home + work */
    homeBuilding:   null,
    isHome:         false,
    isInsideWork:   false,
    workBuilding:   null,
    workTimer:      randRange(10, 60),
    workShiftTimer: 0,
    roamTimer:      0,

    /* ── Schedule system ──────────────────────────────────── */
    // true  → villager is hidden inside a building (work or home)
    // skip all movement, AI, collision, and drawing when true
    isInsideBuilding: false,
    // 'work'  → currently inside workplace  (9am–6pm schedule)
    // 'home'  → gone home early             (6pm–9pm, 50% group)
    // null    → roaming normally
    scheduleState:    null,
    // Which schedule group this villager belongs to (assigned once)
    // 'work80'  → 80% that go inside buildings during work hours
    // 'roam20'  → 20% that always roam
    // 'home50'  → of the work80, 50% go home at 6pm instead of roaming
    scheduleGroup:    null,

    /* Interaction state */
    collisionCooldown: 0,
    _hoverStopped:     false,
    _savedWaitT:       0,

    /* Type reference cache */
    _typeDef:   vt,
    _typeScale: vt.scale,

    /* Training */
    isTraining:       false,
    trainingProgress: 0,
    trainBuilding:    null,
    trainEntry:       null,

    /* Lifecycle */
    isChild:     typeIdx === 4,
    age:         typeIdx === 4 ? 0 : randRange(18, 60),
    growthTimer: typeIdx === 4 ? 0 : -1,

    /* Reproduction */
    parentA:    parentA || null,
    parentB:    parentB || null,
    reproTimer: randRange(60, 200),
    hp:         100,

    /* ── GDD citizen stats ─────────────────────────────── */
    hunger:    20,
    health:    80,
    govTrust:  40,
    happiness: 45,
    anger:     0,
    income:    0,

    /* Politics */
    isLeader:  false,

    /* Computed each tick by other systems */
    _hungerSpeedMult:   1.0,
    _policyHungerMult:  1.0,
    _policyIncomeBonus: 0,

    /* Floating quip */
    _quip: null,
  };
}

/* ══════════════════════════════════════════════════════════════
   updateVillager
══════════════════════════════════════════════════════════════ */
var REAL_SECS_PER_GAME_HOUR = 30;
var WORK_SHIFT_MIN_S = 6  * REAL_SECS_PER_GAME_HOUR;
var WORK_SHIFT_MAX_S = 8  * REAL_SECS_PER_GAME_HOUR;
var ROAM_BREAK_MIN_S = 1  * REAL_SECS_PER_GAME_HOUR;
var ROAM_BREAK_MAX_S = 2  * REAL_SECS_PER_GAME_HOUR;
var ENTER_RADIUS     = 22;

export function updateVillager(v, dt, waypoints) {
  /* ── Schedule building hide: skip ALL processing ─────────── */
  if (v.isInsideBuilding) return;

  var hungerMult = v._hungerSpeedMult !== undefined ? v._hungerSpeedMult : 1.0;
  var healthMult = 1.0;
  if (v.health !== undefined && v.health < 30) {
    healthMult = clamp(v.health / 30, 0.3, 1.0);
  }
  var speedMult = hungerMult * healthMult;

  if (v.isTraining) {
    if (v.trainBuilding) {
      v.x = lerp(v.x, v.trainBuilding.x, 0.1);
      v.y = lerp(v.y, v.trainBuilding.y + 4, 0.1);
    }
    return;
  }

  if (v.isInsideWork) {
    v.workShiftTimer = Math.max(0, v.workShiftTimer - dt);
    if (v.workShiftTimer <= 0) {
      v.isInsideWork = false;
      if (v.workBuilding) {
        v.x = v.workBuilding.x + randRange(-20, 20);
        v.y = v.workBuilding.y + 16;
      }
      v.waitT = randRange(ROAM_BREAK_MIN_S, ROAM_BREAK_MAX_S);
      v.workTimer = WORK_SHIFT_MIN_S + randRange(0, ROAM_BREAK_MAX_S);
    }
    return;
  }

  if (v._canWork === false && v.hunger > 80) {
    v.workTimer = 999;
    if (!v.isInsideWork && v.workBuilding) {
      if (v.waitT <= 0) chooseNextWaypoint(v, waypoints);
    }
  }

  if (v.workBuilding && v.workTimer > 0 && v._canWork !== false) {
    v.workTimer -= dt;
  }

  if (v.workBuilding && v.workTimer <= 0 && !v.isInsideWork && v._canWork !== false) {
    var wb   = v.workBuilding;
    var dToW = dist(v.x, v.y, wb.x, wb.y);
    if (dToW <= ENTER_RADIUS) {
      v.isInsideWork   = true;
      v.workShiftTimer = randRange(WORK_SHIFT_MIN_S, WORK_SHIFT_MAX_S);
      v.x = wb.x; v.y = wb.y;
      v.waitT = 0;
      return;
    }
    if (v.waitT <= 0 || (dist(v.destX, v.destY, wb.x, wb.y) > ENTER_RADIUS * 2)) {
      v.destX = wb.x + randRange(-10, 10);
      v.destY = wb.y + randRange(-6, 6);
    }
  }

  if (v.waitT > 0) {
    v.waitT -= dt;
    if (v.waitT <= 0) {
      if (!v.workBuilding || v.workTimer > 0 || v._canWork === false) {
        chooseNextWaypoint(v, waypoints);
      }
    }
    return;
  }

  var dx  = v.destX - v.x;
  var dy  = v.destY - v.y;
  var d   = Math.sqrt(dx * dx + dy * dy);
  var spd = v.spd * perspScale(v.y) * speedMult;

  if (d < spd * dt + 1) {
    v.x = v.destX; v.y = v.destY;
    if (v.workBuilding && v.workTimer <= 0 &&
        dist(v.x, v.y, v.workBuilding.x, v.workBuilding.y) <= ENTER_RADIUS &&
        v._canWork !== false) {
      v.isInsideWork   = true;
      v.workShiftTimer = randRange(WORK_SHIFT_MIN_S, WORK_SHIFT_MAX_S);
      v.x = v.workBuilding.x; v.y = v.workBuilding.y;
      return;
    }
    var vt2 = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    v.waitT = randRange(vt2.waitMin, vt2.waitMax);
    chooseNextWaypoint(v, waypoints);
  } else {
    v.x += (dx / d) * spd * dt;
    v.y += (dy / d) * spd * dt;
  }

  if (Math.random() < 0.0004) {
    var vt3 = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    v.carrying = Math.random() < vt3.carryChance;
  }

  _updateMood(v, dt);
}

function _chooseWorkWaypoint(v, vt) {
  if (!v.workBuilding) return;
  var wb = v.workBuilding;
  var r  = vt.workRadius || 50;
  v.destX = wb.x + randRange(-r, r);
  v.destY = wb.y + randRange(-r * 0.6, r * 0.6);
  v.workTimer = randRange(vt.workWaitMin || 3, vt.workWaitMax || 9);
}

function _updateMood(v, dt) {
  if (Math.random() > 0.0003) return;
  if (v.hunger > 70)    { v.mood = 'stressed'; return; }
  if (v.health < 30)    { v.mood = 'tired';    return; }
  if (v.happiness > 75) { v.mood = 'masaya';   return; }
  if (v.anger > 60)     { v.mood = 'stressed'; return; }
  if (v.govTrust > 70)  { v.mood = 'happy';    return; }
  var moods = ['happy', 'masaya', 'tired'];
  v.mood = moods[randInt(0, moods.length - 1)];
}

export function chooseNextWaypoint(v, waypoints) {
  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  if (v.workBuilding && vt.workStayChance > 0 && Math.random() < vt.workStayChance) {
    _chooseWorkWaypoint(v, vt);
    return;
  }
  var pool = waypoints.all;
  if (vt.waypointBias === 'mines'     && waypoints.mines.length)     pool = waypoints.mines;
  if (vt.waypointBias === 'buildings' && waypoints.buildings.length) pool = waypoints.buildings;
  if (!pool || pool.length === 0) return;
  var wp = pool[randInt(0, pool.length - 1)];
  v.destX = wp.wx + randRange(-20, 20);
  v.destY = wp.wy + randRange(-10, 10);
}

export function assignHomes(villagers, buildings) {
  villagers.forEach(function(v) { v.homeBuilding = null; });
  buildings.forEach(function(b) { b._occupants = []; });
  var homes = buildings.filter(function(b) { return b.getDef().isHome; });
  villagers.forEach(function(v) {
    var best = null, bestScore = Infinity;
    homes.forEach(function(h) {
      var cap = h.getCapacity();
      if (cap <= 0) return;
      var occ = h._occupants.length;
      if (occ >= cap) return;
      var d = dist(v.x, v.y, h.x, h.y);
      var score = d + occ * 200;
      if (score < bestScore) { bestScore = score; best = h; }
    });
    if (best) { v.homeBuilding = best; best._occupants.push(v); }
  });
}

export function assignWork(villagers, buildings) {
  villagers.forEach(function(v) { v.workBuilding = null; });
  villagers.forEach(function(v) {
    var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    if (!vt.workBias) return;
    var candidates;
    if (vt.workBias === 'defence') {
      candidates = buildings.filter(function(b) { return b.getDef().category === 'defence'; });
    } else if (vt.workBias === 'home') {
      candidates = buildings.filter(function(b) { return b.getDef().isHome; });
    } else if (vt.workBias === 'construction') {
      candidates = buildings.filter(function(b) { return b.underConstruction; });
    } else {
      candidates = buildings.filter(function(b) { return b.type === vt.workBias; });
    }
    if (!candidates.length) return;
    var best = null, bestDist = Infinity;
    candidates.forEach(function(b) {
      var d = dist(v.x, v.y, b.x, b.y);
      if (d < bestDist) { bestDist = d; best = b; }
    });
    if (best) v.workBuilding = best;
  });

  buildings.forEach(function(b) {
    b.workers          = [];
    b._assignedWorkers = [];
  });

  villagers.forEach(function(v) {
    if (v.workBuilding && !v.workBuilding.underConstruction) {
      var slots = v.workBuilding.getWorkerSlots ? v.workBuilding.getWorkerSlots() : 0;
      if (slots > 0 && v.workBuilding._assignedWorkers.length < slots) {
        v.workBuilding._assignedWorkers.push(v);
      }
    }
  });

  var constructionSites = buildings.filter(function(b) { return b.underConstruction; });
  villagers.forEach(function(v) {
    var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    if (!v.workBuilding && constructionSites.length > 0 && !v.isChild && !v.isTraining) {
      var nearest = null, nearestDist = Infinity;
      constructionSites.forEach(function(b) {
        var d = dist(v.x, v.y, b.x, b.y);
        if (d < nearestDist) { nearestDist = d; nearest = b; }
      });
      if (nearest && nearest.workers.length < 5) v.workBuilding = nearest;
    }
    if (v.workBuilding && v.workBuilding.underConstruction) {
      if (v.workBuilding.workers.indexOf(v.id) === -1 && v.workBuilding.workers.length < 5) {
        v.workBuilding.workers.push(v.id);
      }
    }
  });
}

export function getBedtime(v) {
  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  if (!vt.sleeps) return Infinity;
  return 20 + randRange(-1.5, 1.5);
}

export function updateNightBehaviour(v, currentHour, bedtime) {
  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  var wakeHour = 6.0;

  if (v.isHome) {
    if (currentHour >= wakeHour && currentHour < bedtime) {
      v.isHome = false;
      return 'wake';
    }
    return 'home';
  }

  if (vt.sleeps && currentHour >= bedtime) {
    v.isInsideWork = false;
    if (!v.homeBuilding) { v.isHome = true; return 'home'; }
    var hb = v.homeBuilding;
    var dh = dist(v.x, v.y, hb.x, hb.y);
    if (dh <= ENTER_RADIUS) {
      v.isHome = true; v.x = hb.x; v.y = hb.y; v.waitT = 0;
      return 'home';
    }
    v.destX = hb.x; v.destY = hb.y; v.waitT = 0;
    return 'awake';
  }
  return 'awake';
}

export function updateReproduction(villagers, dt, VS, spawnFn) {
  if (villagers.length >= VS.pop.max) return;
  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    if (!vt.canReproduce || v.isChild || v.isTraining) continue;
    v.reproTimer -= dt;
    if (v.reproTimer > 0) continue;
    v.reproTimer = randRange(120, 300);
    for (var j = i + 1; j < villagers.length; j++) {
      var p  = villagers[j];
      var pt = VILLAGER_TYPES[p.typeIdx] || VILLAGER_TYPES[0];
      if (!pt.canReproduce || p.isChild || p.isTraining) continue;
      if (v.gender === p.gender) continue;
      if (dist(v.x, v.y, p.x, p.y) > 60) continue;
      var happMult   = ((v.happiness || 60) + (p.happiness || 60)) / 200;
      var healthMult = ((v.health    || 80) + (p.health    || 80)) / 200;
      var chance     = 0.25 * happMult * healthMult;
      if (Math.random() < chance) spawnFn(4, (v.x + p.x) / 2, (v.y + p.y) / 2, v, p);
      break;
    }
  }
}

var TEEN_AGE_SECS   = 90;
var ADULT_AUTO_SECS = 300;

export function updateGrowth(villagers, dt, VS, notifyFn) {
  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    if (v.typeIdx !== 4 && v.typeIdx !== 10) continue;
    if (v.isTraining) continue;
    if (!(v.typeIdx === 10 && v.growthTimer >= ADULT_AUTO_SECS)) {
      v.growthTimer += dt;
    }
    if (v.typeIdx === 4 && v.growthTimer >= TEEN_AGE_SECS) {
      v.typeIdx    = 10;
      v._typeDef   = VILLAGER_TYPES[10];
      v._typeScale = VILLAGER_TYPES[10].scale;
      v.spd        = VILLAGER_TYPES[10].spd;
      v.isChild    = false;
      v.workBuilding = null;
      if (notifyFn) notifyFn(v.label + ' ay naging Estudyante na! I-enroll sa Paaralan.', 'info');
    }
    if (v.typeIdx === 10 && v.growthTimer >= ADULT_AUTO_SECS && !v.isTraining) {
      var hasPaaralan = VS && VS.buildings && VS.buildings.some(function(b) { return b.type === 'paaralan' && !b.underConstruction; });
      if (!hasPaaralan) {
        v.typeIdx    = 0;
        v._typeDef   = VILLAGER_TYPES[0];
        v._typeScale = VILLAGER_TYPES[0].scale;
        v.spd        = VILLAGER_TYPES[0].spd;
        v.isChild    = false;
        v.growthTimer = -1;
        v.reproTimer  = randRange(60, 200);
        v.health      = 80;
        if (notifyFn) notifyFn(v.label + ' ay naging Magsasaka (walang Paaralan).', 'info');
      }
    }
  }
}

export function updateTraining(villagers, dt) {
  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    if (!v.isTraining || !v.trainEntry) continue;
    var speedMult = v._policyTrainingMult || 1.0;
    var tickRate  = dt / v.trainEntry.duration;
    v.trainingProgress = Math.min(1.0, v.trainingProgress + tickRate * speedMult);
    if (v.trainingProgress >= 1.0) {
      var newIdx   = v.trainEntry.typeIdx;
      v.typeIdx    = newIdx;
      v._typeDef   = VILLAGER_TYPES[newIdx];
      v._typeScale = VILLAGER_TYPES[newIdx].scale;
      v.spd        = VILLAGER_TYPES[newIdx].spd;
      v.isTraining       = false;
      v.trainingProgress = 0;
      v.trainBuilding    = null;
      v.trainEntry       = null;
      v.govTrust = clamp((v.govTrust || 50) + 5, 0, 100);
    }
  }
}

export function startTraining(villager, building, entry, VS) {
  if (villager.isTraining) {
    return { ok: false, msg: villager.label + ' ay nag-aaral na.' };
  }
  /* Check building level for minLevel-gated courses */
  if (entry.minLevel && building.level < entry.minLevel) {
    return {
      ok:  false,
      msg: 'Kailangan ng Cuartel Level ' + entry.minLevel + ' para mag-train ng ' + entry.label + '.',
    };
  }
  if (VS.res.gold < entry.cost.gold || VS.res.rice < entry.cost.rice) {
    return {
      ok:  false,
      msg: 'Kulang! ' + entry.cost.gold + ' ginto at ' + entry.cost.rice + ' bigas.',
    };
  }
  VS.res.gold -= entry.cost.gold;
  VS.res.rice -= entry.cost.rice;
  villager.isTraining       = true;
  villager.trainingProgress = 0;
  villager.trainBuilding    = building;
  villager.trainEntry       = entry;
  villager.waitT            = 9999;
  return {
    ok:  true,
    msg: villager.label + ' nagsimulang mag-aral bilang ' + entry.label + '!',
  };
}

export function rebuildVillagersFromSave(savedVillagers) {
  return savedVillagers.map(function(d) {
    var v = createVillager(d.typeIdx || 0, d.x, d.y);
    v.id          = d.id;
    v.label       = d.label       || v.label;
    v.gender      = d.gender      || v.gender;
    v.mood        = d.mood        || v.mood;
    v.personality = d.personality || v.personality;
    v.carrying    = d.carrying    !== undefined ? d.carrying : v.carrying;
    v.hp          = d.hp          !== undefined ? d.hp : 100;
    v.hunger         = d.hunger    !== undefined ? d.hunger    : 20;
    v.health         = d.health    !== undefined ? d.health    : 80;
    v.govTrust       = d.govTrust  !== undefined ? d.govTrust  : 40;
    v.happiness      = d.happiness !== undefined ? d.happiness : 45;
    v.anger          = d.anger     !== undefined ? d.anger     : 0;
    v.income         = d.income    !== undefined ? d.income    : 0;
    v.workShiftTimer = d.workShiftTimer || 0;
    return v;
  });
}

/* ══════════════════════════════════════════════════════════════
   drawVillager
   Reads isArmed / armedType to route to the correct body renderer.
══════════════════════════════════════════════════════════════ */
export function drawVillager(ctx, v) {
  if (v.isHome || v.isInsideWork) return;

  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  var sc = perspScale(v.y) * vt.scale;

  var healthAlpha = v.health !== undefined
    ? clamp(0.45 + (v.health / 100) * 0.55, 0.45, 1.0)
    : 1.0;

  var t      = Date.now() / 1000;
  var moving = (v.waitT <= 0) && !v.isHome && !v.isTraining;
  var idHash = 0;
  for (var ci = 0; ci < Math.min(v.id.length, 6); ci++) idHash += v.id.charCodeAt(ci);
  var phase    = (idHash % 100) / 100 * Math.PI * 2;
  var walkFreq = (vt.spd || 20) / 10;
  var walkAmt  = moving ? Math.sin(t * walkFreq * 5 + phase) : 0;
  var bob      = moving ? Math.abs(walkAmt) * 1.5 * sc : 0;

  ctx.save();
  ctx.globalAlpha = healthAlpha;
  ctx.translate(v.x, v.y - bob);

  /* Shadow */
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * sc + bob, 9 * sc * (1 - bob * 0.02), 3 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  /* Body — armed units get a distinct military renderer */
  if (vt.isArmed) {
    var _anim = (v.attackAnimation && v.attackAnimation.progress < 1) ? v.attackAnimation : null;
    _drawArmedBody(ctx, vt, sc, walkAmt, moving, _anim);
  } else {
    _drawBody(ctx, vt, sc, v.isChild, walkAmt, moving);
  }

  /* Hat — only for non-armed (armed body draws its own headgear) */
  if (!vt.isArmed && vt.hat !== 'none') _drawHat(ctx, vt, sc);

  /* Carry icon */
  if (v.carrying && v.carryIcon) {
    ctx.font         = (13 * sc) + 'px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha *= 0.9;
    ctx.fillText(v.carryIcon, 12 * sc, -18 * sc);
  }

  /* Hunger indicator */
  if (v.hunger !== undefined) {
    if (v.hunger > 80) {
      ctx.globalAlpha = 0.7 + Math.sin(t * 8) * 0.3;
      ctx.fillStyle   = '#e74c3c';
      ctx.font        = 'bold ' + (12 * sc) + 'px sans-serif';
      ctx.fillText('!!!', 0, -32 * sc);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle   = '#ff4444';
      ctx.beginPath();
      ctx.arc(0, -20 * sc, 12 * sc, 0, Math.PI * 2);
      ctx.fill();
    } else if (v.hunger > 60) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle   = '#ff8844';
      ctx.font        = 'bold ' + (10 * sc) + 'px sans-serif';
      ctx.fillText('!', 0, -32 * sc);
    } else if (v.hunger > 30) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle   = '#ffaa44';
      ctx.beginPath();
      ctx.arc(6 * sc, -28 * sc, 2.2 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (v.anger !== undefined && v.anger > 70) {
    ctx.globalAlpha  = 0.85;
    ctx.fillStyle    = '#e74c3c';
    ctx.font         = 'bold ' + (8 * sc) + 'px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('!', 0, -32 * sc);
  }

  ctx.restore();

  if (v._quip) drawVillagerQuip(ctx, v, window._camZoom || 1);
}

/* ══════════════════════════════════════════════════════════════
   _drawArmedBody
   Distinct visual for military units: Bantay, Bayani, Marine,
   Air Force.  Each armedType gets its own weapon, armour tint,
   and helmet style.

   armedType values:
     'bantay'   — dark blue-grey armour, spear
     'bayani'   — deep red armour, sword + cape
     'marine'   — navy blue armour, rifle, anchor badge
     'airforce' — charcoal armour, rifle, wing badge
══════════════════════════════════════════════════════════════ */
function _drawArmedBody(ctx, vt, sc, walkAmt, moving, anim) {
  var at  = vt.armedType || 'bantay';
  var wa  = walkAmt || 0;

  /* ── Read attack animation overrides ──────────────────────
     anim.aimAngle    — world-space direction arm points (radians)
     anim.swingOffset — extra reach along aimAngle (pixels before sc)
     anim.bodyLean    — torso shear
     anim.kickAngle   — extra weapon rotation on top of aimAngle
     anim.recoilBack  — body pushed opposite to aimAngle
  ── */
  var isAttacking   = anim && anim.progress > 0 && anim.progress < 1;
  var animAimAngle  = isAttacking ? (anim.aimAngle  || 0) : null;
  var animSwing     = isAttacking ? (anim.swingOffset || 0) : 0;
  var animBodyLean  = isAttacking ? (anim.bodyLean   || 0) : 0;
  var animKick      = isAttacking ? (anim.kickAngle  || 0) : 0;
  var animRecoilBack= isAttacking ? (anim.recoilBack || 0) : 0;

  /* Apply whole-body recoil: push OPPOSITE to the aim direction */
  if (animRecoilBack > 0 && animAimAngle !== null) {
    ctx.translate(
      -Math.cos(animAimAngle) * animRecoilBack * sc * 0.25,
      -Math.sin(animAimAngle) * animRecoilBack * sc * 0.25
    );
  }

  /* ── Colour palette per branch ───────────────────────── */
  var palette = {
    bantay: {
      armour:'#2C3E50', armourDark:'#1A252F', armourLight:'#3D5166',
      pants:'#1A252F', skin:vt.skinColor,
      helmetMain:'#566573', helmetVisor:'#1C2833',
      strapCol:'#AAB7B8', rankCol:'#F0B27A',
      weapon:'spear',
    },
    bayani: {
      armour:'#922B21', armourDark:'#641E16', armourLight:'#C0392B',
      pants:'#641E16', skin:vt.skinColor,
      helmetMain:'#7B241C', helmetVisor:'#1C2833',
      strapCol:'#F5CBA7', rankCol:'#F9E79F',
      weapon:'sword',
      hasCape: true,
    },
    marine: {
      armour:'#1B4F72', armourDark:'#154360', armourLight:'#2E86C1',
      pants:'#154360', skin:vt.skinColor,
      helmetMain:'#1A5276', helmetVisor:'#0D1B2A',
      strapCol:'#AED6F1', rankCol:'#7FB3D3',
      weapon:'rifle',
      badge:'anchor',
    },
    airforce: {
      armour:'#1C2833', armourDark:'#17202A', armourLight:'#2C3E50',
      pants:'#17202A', skin:vt.skinColor,
      helmetMain:'#212F3D', helmetVisor:'#0A0F14',
      strapCol:'#85929E', rankCol:'#D5D8DC',
      weapon:'rocket',
      badge:'wings',
    },
  };

  var p = palette[at] || palette.bantay;

  /* ── Cape (Bayani only) — drawn behind body ──────────── */
  if (p.hasCape) {
    ctx.fillStyle = '#7B241C';
    ctx.save();
    ctx.transform(1, 0, wa * 0.06, 1, 0, 0);
    ctx.beginPath();
    ctx.moveTo(-4 * sc, -13 * sc);
    ctx.quadraticCurveTo(-14 * sc + wa * 2 * sc, -5 * sc, -10 * sc + wa * sc, 6 * sc);
    ctx.lineTo(-4 * sc, 5 * sc);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ── Legs ─────────────────────────────────────────────── */
  ctx.fillStyle = p.pants;
  /* Left leg */
  ctx.save();
  ctx.translate(-2.5 * sc, 0);
  ctx.transform(1, 0, wa * 0.04, 1, 0, 0);
  ctx.fillRect(-2 * sc, 0, 4 * sc, 9 * sc);
  /* Boot */
  ctx.fillStyle = _darken(p.pants, 0.3);
  ctx.fillRect(-2.5 * sc, 7 * sc, 5 * sc, 3 * sc);
  ctx.restore();
  /* Right leg */
  ctx.fillStyle = p.pants;
  ctx.save();
  ctx.translate(2.5 * sc, 0);
  ctx.transform(1, 0, -wa * 0.04, 1, 0, 0);
  ctx.fillRect(-2 * sc, 0, 4 * sc, 9 * sc);
  ctx.fillStyle = _darken(p.pants, 0.3);
  ctx.fillRect(-2.5 * sc, 7 * sc, 5 * sc, 3 * sc);
  ctx.restore();

  /* ── Torso / breastplate ─────────────────────────────── */
  ctx.save();
  var totalLean = wa * 0.04 + animBodyLean;
  ctx.transform(1, 0, totalLean, 1, 0, 0);
  /* Base cloth */
  ctx.fillStyle = p.armour;
  ctx.fillRect(-5 * sc, -14 * sc, 10 * sc, 15 * sc);
  /* Breastplate highlight */
  ctx.fillStyle = p.armourLight;
  ctx.beginPath();
  ctx.moveTo(-3.5 * sc, -13 * sc);
  ctx.lineTo(0, -11 * sc);
  ctx.lineTo(3.5 * sc, -13 * sc);
  ctx.lineTo(3.5 * sc, -5 * sc);
  ctx.lineTo(0, -3 * sc);
  ctx.lineTo(-3.5 * sc, -5 * sc);
  ctx.closePath();
  ctx.fill();
  /* Centre line */
  ctx.strokeStyle = p.armourDark;
  ctx.lineWidth   = 0.8 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -13 * sc);
  ctx.lineTo(0, -1 * sc);
  ctx.stroke();
  /* Horizontal strap */
  ctx.fillStyle = p.strapCol;
  ctx.fillRect(-5 * sc, -8 * sc, 10 * sc, 1.5 * sc);
  /* Rank stripe on left arm — 2 stripes for bayani/marine/airforce, 1 for bantay */
  ctx.fillStyle = p.rankCol;
  var stripes = (at === 'bantay') ? 1 : (at === 'bayani') ? 2 : 3;
  for (var ri = 0; ri < stripes; ri++) {
    ctx.fillRect(-5 * sc, -13 * sc + ri * 2.5 * sc, 2.5 * sc, 1.5 * sc);
  }
  ctx.restore();

  /* ── Pauldrons (shoulder pads) ───────────────────────── */
  ctx.fillStyle = p.armourLight;
  ctx.beginPath();
  ctx.ellipse(-6.5 * sc, -12 * sc, 4 * sc, 2.5 * sc, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6.5 * sc, -12 * sc, 4 * sc, 2.5 * sc, 0.3, 0, Math.PI * 2);
  ctx.fill();

  /* ── Arms ────────────────────────────────────────────── */
  ctx.fillStyle = p.armour;
  /* Left arm (swing back) */
  ctx.save();
  ctx.translate(-6.5 * sc, -12 * sc);
  ctx.transform(1, 0, -wa * 0.10, 1, 0, 0);
  ctx.fillRect(-1.5 * sc, 0, 3 * sc, 8 * sc);
  /* Gauntlet */
  ctx.fillStyle = p.armourDark;
  ctx.fillRect(-2 * sc, 6 * sc, 4 * sc, 3 * sc);
  ctx.restore();

  /* Right arm holds weapon — target-facing when attacking */
  ctx.fillStyle = p.armour;
  ctx.save();
  ctx.translate(6.5 * sc, -12 * sc);

  if (animAimAngle !== null) {
    /* ── ATTACK POSE: arm rotates to point toward the target ──
       The arm is drawn DOWN from shoulder (0 = points down).
       aimAngle is a world-space direction (0 = right, -PI/2 = up).
       We add PI/2 so that aim=up maps to arm pointing up.        */
    var shoulderAng = animAimAngle + Math.PI / 2;
    ctx.rotate(shoulderAng);
    /* Reach along aim direction */
    ctx.translate(0, -animSwing * sc * 0.6);
  } else {
    /* ── IDLE / WALK: original skew swing ── */
    ctx.transform(1, 0, wa * 0.10, 1, 0, 0);
  }

  ctx.fillRect(-1.5 * sc, 0, 3 * sc, 8 * sc);
  ctx.fillStyle = p.armourDark;
  ctx.fillRect(-2 * sc, 6 * sc, 4 * sc, 3 * sc);

  /* Weapon — already in arm's local rotated space, so it faces target */
  _drawWeapon(ctx, p.weapon, sc, wa, at, animKick, anim, animAimAngle);
  ctx.restore();

  /* ── Badge on chest ──────────────────────────────────── */
  if (p.badge) {
    _drawBadge(ctx, p.badge, sc, p.rankCol);
  }

  /* ── Head + helmet ───────────────────────────────────── */
  var headTilt = wa * 0.05 + animBodyLean * 0.6;
  /* Neck */
  ctx.fillStyle = p.skin;
  ctx.fillRect(-2 * sc, -17 * sc, 4 * sc, 4 * sc);
  /* Head */
  ctx.save();
  ctx.transform(1, 0, headTilt, 1, 0, 0);
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.ellipse(0, -22 * sc, 5.5 * sc, 6.5 * sc, 0, 0, Math.PI * 2);
  ctx.fill();
  /* Eyes */
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(-2 * sc, -23 * sc, 1 * sc, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(2 * sc, -23 * sc, 1 * sc, 0, Math.PI * 2); ctx.fill();
  /* Mouth — determined expression */
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth   = 0.7 * sc;
  ctx.beginPath();
  ctx.moveTo(-2 * sc, -20 * sc);
  ctx.lineTo(2 * sc, -20 * sc);
  ctx.stroke();
  /* Helmet */
  _drawMilitaryHelmet(ctx, at, p, sc);
  ctx.restore();
}

/* ── Weapon drawing ───────────────────────────────────────── */
/* Called inside the right-arm ctx.save() which is already
   rotated so that "down" points toward the target.
   animKick = extra weapon tilt (recoil angle)
   animAimAngle = world aim direction (used for orientation cues)  */
function _drawWeapon(ctx, type, sc, wa, at, animKick, anim, animAimAngle) {
  animKick = animKick || 0;
  var isAttacking = anim && anim.progress > 0 && anim.progress < 1;

  if (type === 'spear') {
    /* ── SPEAR ──────────────────────────────────────────────
       In arm-local space: shaft runs from hand upward toward tip.
       "Down" already faces target, so tip (at negative Y) points
       toward the target naturally.                            */
    ctx.save();
    /* Slight weapon-angle wobble on idle walk */
    ctx.rotate(isAttacking ? animKick : wa * 0.04);

    /* Shaft — extends from hand upward through arm */
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-0.8 * sc, -20 * sc, 1.6 * sc, 26 * sc);

    /* Grip wrap strips */
    ctx.fillStyle = '#5a3a08';
    ctx.fillRect(-1 * sc, -4  * sc, 2 * sc, 2.5 * sc);
    ctx.fillRect(-1 * sc,  1  * sc, 2 * sc, 2.5 * sc);

    /* Blade tip at top of shaft */
    ctx.fillStyle = '#D4D7D8';
    ctx.beginPath();
    ctx.moveTo(0,       -28 * sc);
    ctx.lineTo(-2.5*sc, -20 * sc);
    ctx.lineTo(2.5*sc,  -20 * sc);
    ctx.closePath();
    ctx.fill();

    /* Blade edge glint */
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(0.4*sc, -27*sc);
    ctx.lineTo(2*sc,   -20*sc);
    ctx.lineTo(0.8*sc, -20*sc);
    ctx.closePath();
    ctx.fill();

    /* Butt cap */
    ctx.fillStyle = '#AAA';
    ctx.beginPath();
    ctx.ellipse(0, 6 * sc, 1.5 * sc, 1 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Attack: tip energy shimmer at thrust peak */
    if (isAttacking && anim.flashAlpha > 0.1) {
      ctx.globalAlpha = anim.flashAlpha * 0.8;
      ctx.fillStyle   = '#ddeebb';
      ctx.shadowColor = '#aaccaa';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(0, -28 * sc, 3.5 * sc * anim.flashAlpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

  } else if (type === 'sword') {
    /* ── SWORD ──────────────────────────────────────────────
       Held in hand, blade extends "up" in arm-local space.
       kickAngle adds the slash swing rotation.               */
    ctx.save();
    ctx.rotate(isAttacking ? animKick * 0.6 : (0.2 + wa * 0.1));

    /* Blade — from grip upward */
    ctx.fillStyle = '#D0D3D4';
    ctx.fillRect(-1 * sc, -20 * sc, 2 * sc, 17 * sc);

    /* Fuller */
    ctx.fillStyle = '#A8ABAC';
    ctx.fillRect(-0.3 * sc, -19 * sc, 0.6 * sc, 12 * sc);

    /* Edge glint */
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0.5 * sc, -19 * sc, 0.5 * sc, 13 * sc);

    /* Crossguard */
    ctx.fillStyle = '#D4AC0D';
    ctx.fillRect(-4.5 * sc, -3 * sc, 9 * sc, 2 * sc);
    ctx.fillStyle = '#F0B27A';
    ctx.fillRect(-3.5 * sc, -4 * sc, 7 * sc, 1 * sc);

    /* Grip */
    ctx.fillStyle = '#784212';
    ctx.fillRect(-1.2 * sc, -1 * sc, 2.4 * sc, 5 * sc);
    /* Grip wrap */
    ctx.fillStyle = '#5D3412';
    ctx.fillRect(-1.2 * sc, 0.5 * sc, 2.4 * sc, 1 * sc);
    ctx.fillRect(-1.2 * sc, 2.5 * sc, 2.4 * sc, 1 * sc);

    /* Pommel */
    ctx.fillStyle = '#D4AC0D';
    ctx.beginPath();
    ctx.arc(0, 4.5 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.fill();

    /* Attack: blade glow during slash */
    if (isAttacking && anim.flashAlpha > 0.1) {
      ctx.globalAlpha = anim.flashAlpha * 0.7;
      ctx.fillStyle   = '#ffee99';
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur  = 10;
      ctx.fillRect(-1.2 * sc, -20 * sc, 2.4 * sc, 17 * sc);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

  } else if (type === 'rifle') {
    /* ── RIFLE ──────────────────────────────────────────────
       In arm-local space the arm already points at the target.
       The rifle is drawn along the arm axis so the barrel aims
       directly at the target.
       kickAngle tilts the barrel upward on recoil.           */
    ctx.save();
    /* Recoil kick tilts barrel up (negative = upward in local space) */
    ctx.rotate(-animKick * 0.8);

    /* Main receiver along arm axis (up = toward target, negative Y) */
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-1.5 * sc, -22 * sc, 3 * sc, 16 * sc);

    /* Barrel extends forward (muzzle at top) */
    ctx.fillStyle = '#252525';
    ctx.fillRect(-0.9 * sc, -30 * sc, 1.8 * sc, 9 * sc);

    /* Muzzle ring */
    ctx.fillStyle = '#555';
    ctx.fillRect(-1.2 * sc, -31 * sc, 2.4 * sc, 1.5 * sc);

    /* Handguard */
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(-1.3 * sc, -14 * sc, 2.6 * sc, 3.5 * sc);

    /* Magazine */
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-1 * sc, -10 * sc, 2 * sc, 5 * sc);

    /* Stock */
    ctx.fillStyle = '#6B3A1F';
    ctx.fillRect(-1.6 * sc,  0, 3.2 * sc, 4.5 * sc);
    ctx.fillStyle = '#5a2e14';
    ctx.fillRect(-1.6 * sc,  3.5 * sc, 3.2 * sc, 1 * sc);

    /* Trigger */
    ctx.strokeStyle = '#555';
    ctx.lineWidth   = 0.8 * sc;
    ctx.beginPath();
    ctx.arc(0, -3 * sc, 2.2 * sc, 0.1, Math.PI - 0.1);
    ctx.stroke();

    /* Scope (airforce only) */
    if (at === 'airforce') {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(-1 * sc, -20 * sc, 2 * sc, 7 * sc);
      /* Scope body */
      ctx.strokeStyle = '#85929E';
      ctx.lineWidth   = 0.5 * sc;
      ctx.strokeRect(-1 * sc, -20 * sc, 2 * sc, 7 * sc);
      /* Lens glint */
      ctx.fillStyle = 'rgba(80,160,255,0.55)';
      ctx.beginPath();
      ctx.arc(-0.3 * sc, -19.5 * sc, 0.7 * sc, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Attack: muzzle glow while firing */
    if (isAttacking && anim.flashAlpha > 0.2) {
      ctx.globalAlpha = anim.flashAlpha * 0.9;
      ctx.fillStyle   = '#ffffcc';
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(0, -31 * sc, 3 * sc * anim.flashAlpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

  } else if (type === 'rocket') {
    /* ── ROCKET LAUNCHER ────────────────────────────────────
       Shoulder tube launcher; points directly at target.
       kickAngle is minimal (rocket launchers barely kick).   */
    ctx.save();
    ctx.rotate(-animKick * 0.4);

    /* Main launch tube */
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(-2.4 * sc, -28 * sc, 4.8 * sc, 24 * sc);

    /* Front rim */
    ctx.fillStyle = '#3a4a3a';
    ctx.beginPath();
    ctx.ellipse(0, -28 * sc, 2.8 * sc, 1.4 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Rocket nose (visible at muzzle) */
    ctx.fillStyle = '#cc3311';
    ctx.beginPath();
    ctx.moveTo(0,      -33 * sc);
    ctx.lineTo(-2*sc,  -28 * sc);
    ctx.lineTo( 2*sc,  -28 * sc);
    ctx.closePath();
    ctx.fill();

    /* Rocket body fins */
    ctx.fillStyle = '#aa2200';
    ctx.fillRect(-0.6 * sc, -30 * sc, 1.2 * sc, 3 * sc);

    /* Rear exhaust port */
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(0, -5 * sc, 2.2 * sc, 1.1 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Grip / trigger assembly */
    ctx.fillStyle = '#4a3a20';
    ctx.fillRect(-1.6 * sc, -14 * sc, 3.2 * sc, 5 * sc);

    /* Sight rail */
    ctx.fillStyle = '#556655';
    ctx.fillRect(-0.4 * sc, -26 * sc, 0.8 * sc, 12 * sc);

    /* Attack: muzzle + exhaust glow on fire */
    if (isAttacking && anim.flashAlpha > 0.15) {
      /* Front muzzle bloom */
      ctx.globalAlpha = anim.flashAlpha * 0.85;
      ctx.fillStyle   = '#ff9933';
      ctx.shadowColor = '#ff5500';
      ctx.shadowBlur  = 16;
      ctx.beginPath();
      ctx.arc(0, -33 * sc, 5 * sc * anim.flashAlpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      /* Rear exhaust glow */
      ctx.globalAlpha = anim.flashAlpha * 0.6;
      ctx.fillStyle   = '#ff6622';
      ctx.beginPath();
      ctx.arc(0, -3 * sc, 4 * sc * anim.flashAlpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ── Military helmet styles ───────────────────────────────── */
function _drawMilitaryHelmet(ctx, at, p, sc) {
  ctx.fillStyle = p.helmetMain;
  if (at === 'bantay') {
    /* Simple rounded helm with nasal guard */
    ctx.beginPath();
    ctx.arc(0, -24 * sc, 6 * sc, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-6 * sc, -24 * sc, 12 * sc, 3 * sc);
    /* Nasal guard */
    ctx.fillStyle = _darken(p.helmetMain, 0.2);
    ctx.fillRect(-1 * sc, -28 * sc, 2 * sc, 7 * sc);
    /* Visor slit hint */
    ctx.fillStyle = p.helmetVisor;
    ctx.fillRect(-3 * sc, -25 * sc, 6 * sc, 1.5 * sc);
  } else if (at === 'bayani') {
    /* Crested helm — more ornate */
    ctx.beginPath();
    ctx.arc(0, -24 * sc, 6.5 * sc, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-6.5 * sc, -24 * sc, 13 * sc, 3 * sc);
    /* Crest */
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.moveTo(-1.5 * sc, -29.5 * sc);
    ctx.quadraticCurveTo(0, -34 * sc, 1.5 * sc, -29.5 * sc);
    ctx.lineTo(1.5 * sc, -29.5 * sc);
    ctx.closePath();
    ctx.fill();
    /* Visor bar */
    ctx.fillStyle = p.helmetVisor;
    ctx.fillRect(-4 * sc, -25.5 * sc, 8 * sc, 2 * sc);
    /* Cheek guards */
    ctx.fillStyle = p.helmetMain;
    ctx.fillRect(-7 * sc, -25 * sc, 2 * sc, 5 * sc);
    ctx.fillRect(5 * sc, -25 * sc, 2 * sc, 5 * sc);
  } else if (at === 'marine') {
    /* Combat helmet — wider brim */
    ctx.beginPath();
    ctx.arc(0, -24 * sc, 6.5 * sc, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-6.5 * sc, -24 * sc, 13 * sc, 2.5 * sc);
    /* Wide brim */
    ctx.beginPath();
    ctx.ellipse(0, -24 * sc, 8.5 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    /* Chin strap */
    ctx.strokeStyle = p.strapCol;
    ctx.lineWidth   = 0.8 * sc;
    ctx.beginPath();
    ctx.arc(0, -20 * sc, 6 * sc, 0.1, Math.PI - 0.1);
    ctx.stroke();
    /* Camo dots */
    ctx.fillStyle = 'rgba(0,50,0,0.3)';
    for (var di = 0; di < 5; di++) {
      ctx.beginPath();
      ctx.arc(-3 * sc + di * 1.5 * sc, -26 * sc, 0.8 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (at === 'airforce') {
    /* Peaked service cap */
    /* Band */
    ctx.fillRect(-5.5 * sc, -25 * sc, 11 * sc, 3 * sc);
    /* Crown */
    ctx.beginPath();
    ctx.arc(0, -25 * sc, 5.5 * sc, Math.PI, 0);
    ctx.fill();
    /* Peak / visor bill */
    ctx.fillStyle = p.helmetVisor;
    ctx.beginPath();
    ctx.moveTo(-6 * sc, -23 * sc);
    ctx.lineTo(6 * sc, -23 * sc);
    ctx.lineTo(7.5 * sc, -21.5 * sc);
    ctx.lineTo(-7.5 * sc, -21.5 * sc);
    ctx.closePath();
    ctx.fill();
    /* Top button */
    ctx.fillStyle = p.rankCol;
    ctx.beginPath();
    ctx.arc(0, -30 * sc, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    /* Gold chin strap */
    ctx.strokeStyle = p.rankCol;
    ctx.lineWidth   = 0.7 * sc;
    ctx.beginPath();
    ctx.moveTo(-5.5 * sc, -23 * sc);
    ctx.quadraticCurveTo(-6 * sc, -19 * sc, -3 * sc, -18 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5.5 * sc, -23 * sc);
    ctx.quadraticCurveTo(6 * sc, -19 * sc, 3 * sc, -18 * sc);
    ctx.stroke();
  }
}

/* ── Branch badge on chest ────────────────────────────────── */
function _drawBadge(ctx, type, sc, col) {
  ctx.fillStyle   = col;
  ctx.strokeStyle = col;
  ctx.lineWidth   = 0.6 * sc;
  if (type === 'anchor') {
    /* Simple anchor shape centred at chest */
    var ax = 0, ay = -8 * sc;
    ctx.beginPath();
    ctx.arc(ax, ay - 2 * sc, 2 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax, ay - 4 * sc);
    ctx.lineTo(ax, ay + 3 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 2.5 * sc, ay - 1 * sc);
    ctx.lineTo(ax + 2.5 * sc, ay - 1 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 2 * sc, ay + 3 * sc);
    ctx.arc(ax, ay + 3 * sc, 2 * sc, Math.PI, 0);
    ctx.stroke();
  } else if (type === 'wings') {
    /* Simplified wing shape */
    var wx = 0, wy = -8 * sc;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx - 4 * sc, wy - 2 * sc, wx - 5 * sc, wy + 1 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 4 * sc, wy - 2 * sc, wx + 5 * sc, wy + 1 * sc);
    ctx.stroke();
    /* Centre star */
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(wx, wy, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── Civilian body drawing (unchanged) ───────────────────── */
function _drawBody(ctx, vt, sc, isChild, walkAmt, moving) {
  var sizeScale = isChild ? 0.72 : 1.0;
  var ss  = sc * sizeScale;
  var wa  = walkAmt || 0;
  var sw  = wa * 5 * ss;

  ctx.fillStyle = _darken(vt.clothColor, 0.3);
  ctx.save();
  ctx.translate(-2.5 * ss, 0);
  ctx.transform(1, 0, sw * 0.04, 1, 0, 0);
  ctx.fillRect(-1.5 * ss, 0, 3.5 * ss, 9 * ss);
  ctx.restore();
  ctx.save();
  ctx.translate(2.5 * ss, 0);
  ctx.transform(1, 0, -sw * 0.04, 1, 0, 0);
  ctx.fillRect(-2 * ss, 0, 3.5 * ss, 9 * ss);
  ctx.restore();

  ctx.fillStyle = vt.clothColor;
  ctx.save();
  ctx.transform(1, 0, wa * 0.04, 1, 0, 0);
  ctx.fillRect(-5 * ss, -14 * ss, 10 * ss, 15 * ss);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-5 * ss, -14 * ss, 2 * ss, 15 * ss);
  ctx.fillRect(3 * ss, -14 * ss, 2 * ss, 15 * ss);
  ctx.restore();

  ctx.fillStyle = vt.clothColor;
  ctx.save();
  ctx.translate(-6.5 * ss, -13 * ss);
  ctx.transform(1, 0, -wa * 0.12, 1, 0, 0);
  ctx.fillRect(0, 0, 3 * ss, 9 * ss);
  ctx.restore();
  ctx.save();
  ctx.translate(3.5 * ss, -13 * ss);
  ctx.transform(1, 0, wa * 0.12, 1, 0, 0);
  ctx.fillRect(0, 0, 3 * ss, 9 * ss);
  ctx.restore();

  var headTilt = wa * 0.06;
  ctx.fillStyle = vt.skinColor;
  ctx.save();
  ctx.transform(1, 0, headTilt, 1, 0, 0);
  ctx.beginPath();
  ctx.ellipse(0, -20 * ss, 6 * ss, 7 * ss, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(-2.2 * ss, -21.5 * ss, 1.1 * ss, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(2.2 * ss, -21.5 * ss, 1.1 * ss, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -18 * ss, 1.8 * ss, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

function _drawHat(ctx, vt, sc) {
  ctx.fillStyle = vt.hatColor || '#888';
  if (vt.hat === 'straw') {
    ctx.beginPath();
    ctx.ellipse(0, -26 * sc, 9 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -27.5 * sc, 5 * sc, 3.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (vt.hat === 'wide') {
    ctx.beginPath();
    ctx.ellipse(0, -26 * sc, 10 * sc, 2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-4 * sc, -30 * sc, 8 * sc, 5 * sc);
  } else if (vt.hat === 'helm') {
    ctx.beginPath();
    ctx.arc(0, -24 * sc, 6.5 * sc, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-6.5 * sc, -24 * sc, 13 * sc, 3 * sc);
  } else if (vt.hat === 'cap') {
    ctx.beginPath();
    ctx.arc(0, -24 * sc, 5.5 * sc, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-2 * sc, -24 * sc, 9 * sc, 2.5 * sc);
  }
}

function _darken(hex, amount) {
  var r = parseInt(hex.slice(1,3),16);
  var g = parseInt(hex.slice(3,5),16);
  var b = parseInt(hex.slice(5,7),16);
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return '#' +
    ('0' + r.toString(16)).slice(-2) +
    ('0' + g.toString(16)).slice(-2) +
    ('0' + b.toString(16)).slice(-2);
}

export function getHungerStatus(v) {
  if (!v || v.hunger === undefined) return { level: 'Unknown', multiplier: 1.0, canWork: true };
  if (v.hunger <= 30) return { level: 'Busog',              multiplier: 1.0, canWork: true  };
  if (v.hunger <= 60) return { level: 'Gutom na',           multiplier: 0.8, canWork: true  };
  if (v.hunger <= 80) return { level: 'Gutom na gutom',     multiplier: 0.5, canWork: true  };
  return                     { level: 'Halos mamatay sa gutom', multiplier: 0.2, canWork: false };
}

export { tickQuips } from './villagerQuips.js';