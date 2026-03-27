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

   EVERYTHING STRUCTURALLY UNCHANGED
     VILLAGER_TYPES, TRAINING_MAP, drawing code, reproduction,
     growth, bedtime, night behaviour — all original logic kept.
     New fields are additive, not replacing.

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
  },
  /* 1 */ {
    type:'mangangalakal', typeIdx:1, role:'Mangangalakal',
    scale:1.0, clothColor:'#4A6FA5', skinColor:'#F0DDB0',
    hat:'wide', hatColor:'#2C3E50',
    carryChance:0.9, carryIcon:'📦', waitMin:1, waitMax:3, spd:30,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'palengke', workStayChance:0.65, workRadius:60,
    workWaitMin:2, workWaitMax:7,
  },
  /* 2 */ {
    type:'bantay', typeIdx:2, role:'Bantay',
    scale:1.0, clothColor:'#2C3E50', skinColor:'#F0DDB0',
    hat:'helm', hatColor:'#7F8C8D',
    carryChance:0.1, carryIcon:'🗡️', waitMin:3, waitMax:6, spd:20,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'defence', workStayChance:0.55, workRadius:100,
    workWaitMin:4, workWaitMax:10,
  },
  /* 3 */ {
    type:'matanda', typeIdx:3, role:'Matanda',
    scale:0.9, clothColor:'#95A5A6', skinColor:'#E0C0A0',
    hat:'none', hatColor:'',
    carryChance:0.2, carryIcon:'📿', waitMin:4, waitMax:8, spd:15,
    waypointBias:'all', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:null, workStayChance:0, workRadius:0,
    workWaitMin:5, workWaitMax:12,
  },
  /* 4 */ {
    type:'bata', typeIdx:4, role:'Bata',
    scale:0.68, clothColor:'#F39C12', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.3, carryIcon:'🧸', waitMin:0.5, waitMax:2, spd:38,
    waypointBias:'all', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:'home', workStayChance:0.60, workRadius:70,
    workWaitMin:1, workWaitMax:4,
  },
  /* 5 */ {
    type:'guro', typeIdx:5, role:'Guro',
    scale:1.0, clothColor:'#1ABC9C', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.55, carryIcon:'📚', waitMin:2, waitMax:4, spd:22,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'paaralan', workStayChance:0.75, workRadius:45,
    workWaitMin:3, workWaitMax:8,
  },
  /* 6 */ {
    type:'mangingisda', typeIdx:6, role:'Mangingisda',
    scale:1.0, clothColor:'#2980B9', skinColor:'#D4A06A',
    hat:'straw', hatColor:'#B8860B',
    carryChance:0.8, carryIcon:'🐟', waitMin:3, waitMax:7, spd:20,
    waypointBias:'mines', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'river', workStayChance:0.70, workRadius:50,
    workWaitMin:4, workWaitMax:10,
  },
  /* 7 */ {
    type:'albularyo', typeIdx:7, role:'Albularyo',
    scale:1.0, clothColor:'#8E44AD', skinColor:'#E0C0A0',
    hat:'none', hatColor:'',
    carryChance:0.6, carryIcon:'🌿', waitMin:3, waitMax:6, spd:18,
    waypointBias:'all', sleeps:true, nightOwl:true, canReproduce:true,
    workBias:'templo', workStayChance:0.55, workRadius:65,
    workWaitMin:3, workWaitMax:9,
  },
  /* 8 */ {
    type:'doktor', typeIdx:8, role:'Doktor',
    scale:1.0, clothColor:'#ECF0F1', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.4, carryIcon:'💊', waitMin:2, waitMax:5, spd:24,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'ospital', workStayChance:0.78, workRadius:40,
    workWaitMin:2, workWaitMax:6,
  },
  /* 9 */ {
    type:'driver', typeIdx:9, role:'Driver',
    scale:1.0, clothColor:'#E67E22', skinColor:'#F0DDB0',
    hat:'cap', hatColor:'#784A10',
    carryChance:0.5, carryIcon:'🚗', waitMin:1, waitMax:3, spd:35,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'kalye', workStayChance:0.50, workRadius:80,
    workWaitMin:1, workWaitMax:5,
  },
  /* 10 */ {
    type:'estudyante', typeIdx:10, role:'Estudyante',
    scale:0.85, clothColor:'#3498DB', skinColor:'#F0DDB0',
    hat:'none', hatColor:'',
    carryChance:0.4, carryIcon:'📖', waitMin:1, waitMax:4, spd:28,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:false,
    workBias:'paaralan', workStayChance:0.65, workRadius:50,
    workWaitMin:2, workWaitMax:6,
  },
  /* 11 */ {
    type:'bayani', typeIdx:11, role:'Bayani',
    scale:1.15, clothColor:'#C0392B', skinColor:'#F0DDB0',
    hat:'helm', hatColor:'#8B0000',
    carryChance:0.15, carryIcon:'⚔️', waitMin:2, waitMax:5, spd:22,
    waypointBias:'buildings', sleeps:false, nightOwl:true, canReproduce:false,
    workBias:'cuartel', workStayChance:0.60, workRadius:90,
    workWaitMin:3, workWaitMax:8,
  },
  /* 12 */ {
    type:'konstruktor', typeIdx:12, role:'Konstruktor',
    scale:1.0, clothColor:'#E67E22', skinColor:'#F0DDB0',
    hat:'cap', hatColor:'#E8A000',
    carryChance:0.9, carryIcon:'🔨', waitMin:1, waitMax:3, spd:20,
    waypointBias:'buildings', sleeps:true, nightOwl:false, canReproduce:true,
    workBias:'construction', workStayChance:0.90, workRadius:30,
    workWaitMin:1, workWaitMax:4,
  },
];

/* ══════════════════════════════════════════════════════════════
   TRAINING MAP
   Maps building type → array of training course entries.
   duration is in real-seconds.
══════════════════════════════════════════════════════════════ */
export var TRAINING_MAP = {
  paaralan: [
    { typeIdx:0,  label:'Magsasaka',       cost:{ gold:60,  rice:20 }, duration:180 },
    { typeIdx:5,  label:'Guro',            cost:{ gold:100, rice:30 }, duration:300 },
    { typeIdx:8,  label:'Doktor',          cost:{ gold:150, rice:50 }, duration:420 },
    { typeIdx:1,  label:'Mangangalakal',   cost:{ gold:80,  rice:20 }, duration:240 },
    { typeIdx:6,  label:'Mangingisda',     cost:{ gold:60,  rice:30 }, duration:180 },
    { typeIdx:7,  label:'Albularyo',       cost:{ gold:120, rice:40 }, duration:360 },
    { typeIdx:12, label:'Konstruktor',      cost:{ gold:80,  rice:20 }, duration:150 },
  ],
  cuartel: [
    { typeIdx:2,  label:'Bantay',          cost:{ gold:80,  rice:20 }, duration:200 },
    { typeIdx:11, label:'Bayani',          cost:{ gold:200, rice:60 }, duration:600 },
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
    isInsideWork:   false,   /* true while inside workBuilding during shift */
    workBuilding:   null,
    workTimer:      randRange(10, 60),  /* staggered start so not all rush at once */
    workShiftTimer: 0,
    roamTimer:      0,

    /* Interaction state */
    collisionCooldown: 0,
    _hoverStopped:     false,
    _savedWaitT:       0,

    /* Type reference cache (set once, avoids repeated array lookup) */
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
    parentA:         parentA || null,
    parentB:         parentB || null,
    reproTimer:      randRange(60, 200),
    hp:              100,

    /* HP (legacy — kept for building defenceHP compat) */
    hp: 100,

    /* ── NEW GDD citizen stats ─────────────────────────── */
    hunger:    20,       /* 0 = full, 100 = starving */
    health:    80,       /* 0 = dying, 100 = perfect */
    govTrust:  40,       /* starts skeptical — player must earn trust */
    happiness: 45,       /* starts neutral-low — player must improve conditions */
    anger:     0,        /* 0 = calm, 100 = rioting */
    income:    0,        /* gold per in-game day (set by economy.js) */

    /* Politics flag — set by politics.js */
    isLeader:  false,

    /* Computed by other systems each tick */
    _hungerSpeedMult:   1.0,   /* set by resource.js tickFoodPool */
    _policyHungerMult:  1.0,   /* set by policy.js applyPolicies */
    _policyIncomeBonus: 0,     /* set by policy.js applyPolicies */

    /* Floating head quip — managed by villagerQuips.js */
    _quip: null,
  };
}

/* ══════════════════════════════════════════════════════════════
   updateVillager
   Per-tick movement and state update.
   Called from main.js for every non-sleeping villager.
══════════════════════════════════════════════════════════════ */
/* ── In-game time constants ──────────────────────────────────
   time.js: 1 real second = 2 in-game minutes at speed 1
   → 1 in-game hour = 30 real seconds at speed 1
   Work shift: 6–8 in-game hours = 180–240 real seconds
   Roam break:  1–2 in-game hours = 30–60 real seconds
─────────────────────────────────────────────────────────── */
var REAL_SECS_PER_GAME_HOUR = 30;
var WORK_SHIFT_MIN_S = 6  * REAL_SECS_PER_GAME_HOUR;   /* 180s */
var WORK_SHIFT_MAX_S = 8  * REAL_SECS_PER_GAME_HOUR;   /* 240s */
var ROAM_BREAK_MIN_S = 1  * REAL_SECS_PER_GAME_HOUR;   /* 30s  */
var ROAM_BREAK_MAX_S = 2  * REAL_SECS_PER_GAME_HOUR;   /* 60s  */
var ENTER_RADIUS     = 22; /* px — snap inside when within this distance */

export function updateVillager(v, dt, waypoints) {
  // Use the hunger speed multiplier from resource.js
  var hungerMult = v._hungerSpeedMult !== undefined ? v._hungerSpeedMult : 1.0;
  var healthMult = 1.0;
  
  if (v.health !== undefined && v.health < 30) {
    healthMult = clamp(v.health / 30, 0.3, 1.0);
  }
  
  var speedMult = hungerMult * healthMult;

  /* ── TRAINING: locked inside trainBuilding ─────────────── */
  if (v.isTraining) {
    if (v.trainBuilding) {
      v.x = lerp(v.x, v.trainBuilding.x, 0.1);
      v.y = lerp(v.y, v.trainBuilding.y + 4, 0.1);
    }
    return;
  }

  /* ── INSIDE WORK BUILDING: count down shift then exit ──── */
  if (v.isInsideWork) {
    v.workShiftTimer = Math.max(0, v.workShiftTimer - dt);
    if (v.workShiftTimer <= 0) {
      v.isInsideWork = false;
      if (v.workBuilding) {
        var vt0 = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
        v.x = v.workBuilding.x + randRange(-20, 20);
        v.y = v.workBuilding.y + 16;
      }
      v.waitT = randRange(ROAM_BREAK_MIN_S, ROAM_BREAK_MAX_S);
      v.workTimer = WORK_SHIFT_MIN_S + randRange(0, ROAM_BREAK_MAX_S);
    }
    return;
  }

  /* ── HAS WORK: walk to building and enter after roam break  */
  // Check if hunger prevents work
  if (v._canWork === false && v.hunger > 80) {
    // Too hungry to work - stay home/roam
    v.workTimer = 999; // Delay work indefinitely
    if (!v.isInsideWork && v.workBuilding) {
      // Don't go to work, just roam
      if (v.waitT <= 0) {
        chooseNextWaypoint(v, waypoints);
      }
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
      v.x              = wb.x;
      v.y              = wb.y;
      v.waitT          = 0;
      return;
    }

    if (v.waitT <= 0 || (dist(v.destX, v.destY, wb.x, wb.y) > ENTER_RADIUS * 2)) {
      v.destX = wb.x + randRange(-10, 10);
      v.destY = wb.y + randRange(-6, 6);
    }
  }

  /* ── WAIT TIMER ────────────────────────────────────────── */
  if (v.waitT > 0) {
    v.waitT -= dt;
    if (v.waitT <= 0) {
      if (!v.workBuilding || v.workTimer > 0 || v._canWork === false) {
        chooseNextWaypoint(v, waypoints);
      }
    }
    return;
  }

  /* ── MOVEMENT ──────────────────────────────────────────── */
  var dx  = v.destX - v.x;
  var dy  = v.destY - v.y;
  var d   = Math.sqrt(dx * dx + dy * dy);
  var spd = v.spd * perspScale(v.y) * speedMult;

  if (d < spd * dt + 1) {
    v.x = v.destX;
    v.y = v.destY;

    if (v.workBuilding && v.workTimer <= 0 && dist(v.x, v.y, v.workBuilding.x, v.workBuilding.y) <= ENTER_RADIUS && v._canWork !== false) {
      v.isInsideWork   = true;
      v.workShiftTimer = randRange(WORK_SHIFT_MIN_S, WORK_SHIFT_MAX_S);
      v.x              = v.workBuilding.x;
      v.y              = v.workBuilding.y;
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


/* ── Choose a work-biased waypoint ────────────────────────── */
function _chooseWorkWaypoint(v, vt) {
  if (!v.workBuilding) return;
  var wb = v.workBuilding;
  var r  = vt.workRadius || 50;
  v.destX = wb.x + randRange(-r, r);
  v.destY = wb.y + randRange(-r * 0.6, r * 0.6);
  v.workTimer = randRange(vt.workWaitMin || 3, vt.workWaitMax || 9);
}

/* ── Mood drift based on GDD stats ────────────────────────── */
function _updateMood(v, dt) {
  /* Don't drift if fixed by a recent event */
  if (Math.random() > 0.0003) return;

  if (v.hunger > 70)     { v.mood = 'stressed'; return; }
  if (v.health < 30)     { v.mood = 'tired';    return; }
  if (v.happiness > 75)  { v.mood = 'masaya';   return; }
  if (v.anger > 60)      { v.mood = 'stressed'; return; }
  if (v.govTrust > 70)   { v.mood = 'happy';    return; }

  var moods = ['happy', 'masaya', 'tired'];
  v.mood = moods[randInt(0, moods.length - 1)];
}

/* ══════════════════════════════════════════════════════════════
   chooseNextWaypoint
   Picks a destination from the waypoints pool.
   Respects workBias when workTimer > 0.
══════════════════════════════════════════════════════════════ */
export function chooseNextWaypoint(v, waypoints) {
  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];

  /* Work bias: go near workBuilding */
  if (v.workBuilding && vt.workStayChance > 0 && Math.random() < vt.workStayChance) {
    _chooseWorkWaypoint(v, vt);
    return;
  }

  /* Waypoint pool selection */
  var pool = waypoints.all;
  if (vt.waypointBias === 'mines'     && waypoints.mines.length)     pool = waypoints.mines;
  if (vt.waypointBias === 'buildings' && waypoints.buildings.length) pool = waypoints.buildings;

  if (!pool || pool.length === 0) return;

  var wp = pool[randInt(0, pool.length - 1)];
  v.destX = wp.wx + randRange(-20, 20);
  v.destY = wp.wy + randRange(-10, 10);
}

/* ══════════════════════════════════════════════════════════════
   assignHomes
   Distributes villagers to house buildings.
   Houses have a capacity (popBonus × level). Called from main.js
   _onNewDay() and after any building change.
══════════════════════════════════════════════════════════════ */
export function assignHomes(villagers, buildings) {
  /* Clear existing assignments */
  villagers.forEach(function(v) { v.homeBuilding = null; });
  buildings.forEach(function(b) { b._occupants = []; });

  /* Collect home buildings sorted by distance centroid */
  var homes = buildings.filter(function(b) { return b.getDef().isHome; });

  villagers.forEach(function(v) {
    /* Find the least-full home with capacity remaining */
    var best = null, bestScore = Infinity;
    homes.forEach(function(h) {
      var cap = h.getCapacity();
      if (cap <= 0) return;
      var occ   = h._occupants.length;
      if (occ >= cap) return;
      /* Score: prefer closer + less full */
      var d = dist(v.x, v.y, h.x, h.y);
      var score = d + occ * 200;
      if (score < bestScore) { bestScore = score; best = h; }
    });
    if (best) {
      v.homeBuilding = best;
      best._occupants.push(v);
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   assignWork
   Assigns each villager to a work building matching their workBias.
   Called from main.js _onNewDay() after assignHomes.
══════════════════════════════════════════════════════════════ */
export function assignWork(villagers, buildings) {
  /* Clear existing work assignments */
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
      /* Konstruktors go to the nearest building under construction */
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

  /* Reset all worker tracking */
  buildings.forEach(function(b) {
    b.workers          = [];
    b._assignedWorkers = [];
  });

  /* Register assigned workers into building._assignedWorkers */
  villagers.forEach(function(v) {
    if (v.workBuilding && !v.workBuilding.underConstruction) {
      var slots = v.workBuilding.getWorkerSlots ? v.workBuilding.getWorkerSlots() : 0;
      if (slots > 0 && v.workBuilding._assignedWorkers.length < slots) {
        v.workBuilding._assignedWorkers.push(v);
      }
    }
  });

  /* Construction sites: Konstruktors + unemployed adults as helpers */
  var constructionSites = buildings.filter(function(b) { return b.underConstruction; });
  villagers.forEach(function(v) {
    var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    if (!v.workBuilding && constructionSites.length > 0 && !v.isChild && !v.isTraining) {
      var nearest = null, nearestDist = Infinity;
      constructionSites.forEach(function(b) {
        var d = dist(v.x, v.y, b.x, b.y);
        if (d < nearestDist) { nearestDist = d; nearest = b; }
      });
      if (nearest && nearest.workers.length < 5) {
        v.workBuilding = nearest;
      }
    }
    if (v.workBuilding && v.workBuilding.underConstruction) {
      if (v.workBuilding.workers.indexOf(v.id) === -1 && v.workBuilding.workers.length < 5) {
        v.workBuilding.workers.push(v.id);
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   getBedtime / updateNightBehaviour
   Night cycle: villagers go home at bedtime, stay until dawn.
══════════════════════════════════════════════════════════════ */
export function getBedtime(v) {
  var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  if (!vt.sleeps) return Infinity;           /* night owls never sleep */
  return 20 + randRange(-1.5, 1.5);         /* sleep 20:00 ± variance */
}

export function updateNightBehaviour(v, currentHour, bedtime) {
  var vt      = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
  var wakeHour = 6.0;

  /* ── SLEEPING: already inside home ────────────────────── */
  if (v.isHome) {
    if (currentHour >= wakeHour && currentHour < bedtime) {
      v.isHome = false;
      return 'wake';
    }
    return 'home';
  }

  /* ── BEDTIME ───────────────────────────────────────────── */
  if (vt.sleeps && currentHour >= bedtime) {
    /* Exit work building */
    v.isInsideWork = false;

    if (!v.homeBuilding) {
      /* Homeless — just disappear (hide) */
      v.isHome = true;
      return 'home';
    }

    var hb = v.homeBuilding;
    var dh = dist(v.x, v.y, hb.x, hb.y);

    if (dh <= ENTER_RADIUS) {
      /* At the door — go inside */
      v.isHome = true;
      v.x      = hb.x;
      v.y      = hb.y;
      v.waitT  = 0;
      return 'home';
    }

    /* Walk straight toward home door — override any other destination */
    v.destX = hb.x;
    v.destY = hb.y;
    v.waitT = 0;  /* don't pause, keep walking */
    return 'awake';  /* still awake but walking home */
  }

  return 'awake';
}

/* ══════════════════════════════════════════════════════════════
   updateReproduction
   Randomly pairs compatible adults and spawns a child.
   spawnFn is called with (typeIdx=4, x, y, parentA, parentB).
══════════════════════════════════════════════════════════════ */
export function updateReproduction(villagers, dt, VS, spawnFn) {
  if (villagers.length >= VS.pop.max) return;

  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    var vt = VILLAGER_TYPES[v.typeIdx] || VILLAGER_TYPES[0];
    if (!vt.canReproduce || v.isChild || v.isTraining) continue;

    v.reproTimer -= dt;
    if (v.reproTimer > 0) continue;
    v.reproTimer = randRange(120, 300);

    /* Find a nearby compatible partner */
    for (var j = i + 1; j < villagers.length; j++) {
      var p = villagers[j];
      var pt = VILLAGER_TYPES[p.typeIdx] || VILLAGER_TYPES[0];
      if (!pt.canReproduce || p.isChild || p.isTraining) continue;
      if (v.gender === p.gender) continue;
      if (dist(v.x, v.y, p.x, p.y) > 60) continue;

      /* Happiness and health influence reproduction chance */
      var happMult   = ((v.happiness || 60) + (p.happiness || 60)) / 200;
      var healthMult = ((v.health    || 80) + (p.health    || 80)) / 200;
      var chance     = 0.25 * happMult * healthMult;

      if (Math.random() < chance) {
        spawnFn(4, (v.x + p.x) / 2, (v.y + p.y) / 2, v, p);
      }
      break;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   updateGrowth
   Children age up to adult (random type) after growthTimer.
══════════════════════════════════════════════════════════════ */
/* ── Growth stages ────────────────────────────────────────
   Bata (child, typeIdx=4):
     0  →  90s  : baby — stays as Bata, small scale
     90 → 180s  : teen — becomes Estudyante (typeIdx=10)
                  Can now enroll in Paaralan for a profession
     After training graduates → chosen adult profession
   
   If no Paaralan / not enrolled after 300 real seconds:
     auto-graduates to a default adult profession (magsasaka)
─────────────────────────────────────────────────────── */
var TEEN_AGE_SECS   = 90;    /* 90 real sec = 3 in-game hours  */
var ADULT_AUTO_SECS = 300;   /* 300 real sec = 10 in-game hours */

export function updateGrowth(villagers, dt, VS, notifyFn) {
  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    if (v.typeIdx !== 4 && v.typeIdx !== 10) continue;  /* only bata / estudyante */
    if (v.isTraining) continue;

    /* Don't keep incrementing for waiting estudyantes - just hold at cap */
    if (!(v.typeIdx === 10 && v.growthTimer >= ADULT_AUTO_SECS)) {
      v.growthTimer += dt;
    }

    /* Stage 1: Baby → Teen (Estudyante) after 90 real seconds */
    if (v.typeIdx === 4 && v.growthTimer >= TEEN_AGE_SECS) {
      v.typeIdx    = 10;   /* Estudyante */
      v._typeDef   = VILLAGER_TYPES[10];
      v._typeScale = VILLAGER_TYPES[10].scale;
      v.spd        = VILLAGER_TYPES[10].spd;
      v.isChild    = false;
      /* Reset workBuilding — they should now go to paaralan */
      v.workBuilding = null;
      if (notifyFn) notifyFn(v.label + ' ay naging Estudyante na! I-enroll sa Paaralan.', 'info');
    }

    /* Stage 2: Estudyante auto-graduates if not enrolled after 300s */
    if (v.typeIdx === 10 && v.growthTimer >= ADULT_AUTO_SECS && !v.isTraining) {
      /* Check if there is a paaralan they could enroll in */
      var hasPaaralan = VS && VS.buildings && VS.buildings.some(function(b) { return b.type === 'paaralan' && !b.underConstruction; });
      /* Auto-graduate to magsasaka (most common need in a village) */
      var adultIdx = hasPaaralan ? 10 : 0;   /* stay estudyante if paaralan exists so player can enroll */
      if (!hasPaaralan) {
        v.typeIdx    = 0;   /* magsasaka */
        v._typeDef   = VILLAGER_TYPES[0];
        v._typeScale = VILLAGER_TYPES[0].scale;
        v.spd        = VILLAGER_TYPES[0].spd;
        v.isChild    = false;
        v.growthTimer = -1;
        v.reproTimer  = randRange(60, 200);
        v.health      = 80;
        if (notifyFn) notifyFn(v.label + ' ay naging Magsasaka (walang Paaralan).', 'info');
      }
      /* If paaralan exists, stay as estudyante until enrolled or player acts */
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   updateTraining
   Ticks training progress. Calls completion when done.
   Training speed can be boosted by Pondo sa Edukasyon policy.
══════════════════════════════════════════════════════════════ */
export function updateTraining(villagers, dt) {
  for (var i = 0; i < villagers.length; i++) {
    var v = villagers[i];
    if (!v.isTraining || !v.trainEntry) continue;

    /* Policy speed bonus via _policyTrainingMult */
    var speedMult = v._policyTrainingMult || 1.0;
    var tickRate  = dt / v.trainEntry.duration;
    v.trainingProgress = Math.min(1.0, v.trainingProgress + tickRate * speedMult);

    if (v.trainingProgress >= 1.0) {
      /* Graduate — change type */
      var newIdx   = v.trainEntry.typeIdx;
      v.typeIdx    = newIdx;
      v._typeDef   = VILLAGER_TYPES[newIdx];
      v._typeScale = VILLAGER_TYPES[newIdx].scale;
      v.spd        = VILLAGER_TYPES[newIdx].spd;
      /* Clear training state */
      v.isTraining       = false;
      v.trainingProgress = 0;
      v.trainBuilding    = null;
      v.trainEntry       = null;
      /* Small govTrust boost on graduation */
      v.govTrust = clamp((v.govTrust || 50) + 5, 0, 100);
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   startTraining
   Begins a training course for a villager at a building.
   Called from ui/drawer.js when player picks a course.
══════════════════════════════════════════════════════════════ */
export function startTraining(villager, building, entry, VS) {
  if (villager.isTraining) {
    return { ok: false, msg: villager.label + ' ay nag-aaral na.' };
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
  villager.waitT            = 9999;  /* freeze movement */

  return {
    ok:  true,
    msg: villager.label + ' nagsimulang mag-aral bilang ' + entry.label + '!',
  };
}

/* ══════════════════════════════════════════════════════════════
   rebuildVillagersFromSave
   Reconstructs villager objects from a save state array.
   Handles both v2 saves (missing new fields) and v3 saves.
══════════════════════════════════════════════════════════════ */
export function rebuildVillagersFromSave(savedVillagers) {
  return savedVillagers.map(function(d) {
    var v = createVillager(d.typeIdx || 0, d.x, d.y);
    /* Restore identity */
    v.id          = d.id;
    v.label       = d.label       || v.label;
    v.gender      = d.gender      || v.gender;
    v.mood        = d.mood        || v.mood;
    v.personality = d.personality || v.personality;
    v.carrying    = d.carrying    !== undefined ? d.carrying : v.carrying;
    v.hp          = d.hp          !== undefined ? d.hp : 100;
    /* Restore GDD stats with safe fallbacks for v2 saves */
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
   Canvas rendering — unchanged visual logic from original.
   Reads new stats only for the health-based alpha fade.
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

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * sc + bob, 9 * sc * (1 - bob * 0.02), 3 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  _drawBody(ctx, vt, sc, v.isChild, walkAmt, moving);
  if (vt.hat !== 'none') _drawHat(ctx, vt, sc);
  if (v.carrying && v.carryIcon) {
    ctx.font      = (13 * sc) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha *= 0.9;
    ctx.fillText(v.carryIcon, 12 * sc, -18 * sc);
  }

  /* Enhanced hunger indicator - color changes based on severity */
  if (v.hunger !== undefined) {
    if (v.hunger > 80) {
      // Severe hunger - red exclamation + red aura
      ctx.globalAlpha = 0.7 + Math.sin(t * 8) * 0.3;
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold ' + (12 * sc) + 'px sans-serif';
      ctx.fillText('!!!', 0, -32 * sc);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(0, -20 * sc, 12 * sc, 0, Math.PI * 2);
      ctx.fill();
    } else if (v.hunger > 60) {
      // Moderate hunger - orange warning
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff8844';
      ctx.font = 'bold ' + (10 * sc) + 'px sans-serif';
      ctx.fillText('!', 0, -32 * sc);
    } else if (v.hunger > 30) {
      // Mild hunger - small yellow dot
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffaa44';
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

/* ── Body drawing ─────────────────────────────────────────── */
function _drawBody(ctx, vt, sc, isChild, walkAmt, moving) {
  var sizeScale = isChild ? 0.72 : 1.0;
  var ss  = sc * sizeScale;
  var wa  = walkAmt || 0;          /* -1..1 walk cycle value */
  var sw  = wa * 5 * ss;           /* max leg/arm swing in pixels */

  /* ── Legs (animated) ──────────────────────────────────── */
  ctx.fillStyle = _darken(vt.clothColor, 0.3);
  /* Left leg swings forward when right arm swings back */
  ctx.save();
  ctx.translate(-2.5 * ss, 0);
  ctx.transform(1, 0, sw * 0.04, 1, 0, 0);  /* shear = leg swing */
  ctx.fillRect(-1.5 * ss, 0, 3.5 * ss, 9 * ss);
  ctx.restore();
  /* Right leg opposite phase */
  ctx.save();
  ctx.translate(2.5 * ss, 0);
  ctx.transform(1, 0, -sw * 0.04, 1, 0, 0);
  ctx.fillRect(-2 * ss, 0, 3.5 * ss, 9 * ss);
  ctx.restore();

  /* ── Torso (slight lean into walk) ───────────────────── */
  ctx.fillStyle = vt.clothColor;
  ctx.save();
  ctx.transform(1, 0, wa * 0.04, 1, 0, 0);   /* lean */
  ctx.fillRect(-5 * ss, -14 * ss, 10 * ss, 15 * ss);
  /* Shading */
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-5 * ss, -14 * ss, 2 * ss, 15 * ss);
  ctx.fillRect(3 * ss, -14 * ss, 2 * ss, 15 * ss);
  ctx.restore();

  /* ── Arms (swing opposite to legs) ───────────────────── */
  ctx.fillStyle = vt.clothColor;
  /* Left arm swings back when left leg goes forward */
  ctx.save();
  ctx.translate(-6.5 * ss, -13 * ss);
  ctx.transform(1, 0, -wa * 0.12, 1, 0, 0);
  ctx.fillRect(0, 0, 3 * ss, 9 * ss);
  ctx.restore();
  /* Right arm swings forward */
  ctx.save();
  ctx.translate(3.5 * ss, -13 * ss);
  ctx.transform(1, 0, wa * 0.12, 1, 0, 0);
  ctx.fillRect(0, 0, 3 * ss, 9 * ss);
  ctx.restore();

  /* ── Head (slight bob, tilts into walk direction) ─────── */
  var headTilt = wa * 0.06;
  ctx.fillStyle = vt.skinColor;
  ctx.save();
  ctx.transform(1, 0, headTilt, 1, 0, 0);
  ctx.beginPath();
  ctx.ellipse(0, -20 * ss, 6 * ss, 7 * ss, 0, 0, Math.PI * 2);
  ctx.fill();

  /* ── Face ─────────────────────────────────────────────── */
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(-2.2 * ss, -21.5 * ss, 1.1 * ss, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(2.2 * ss, -21.5 * ss, 1.1 * ss, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -18 * ss, 1.8 * ss, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

/* ── Hat drawing ──────────────────────────────────────────── */
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

/* ── Colour helper ────────────────────────────────────────── */
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
  
  if (v.hunger <= 30) return { level: 'Busog', multiplier: 1.0, canWork: true };
  if (v.hunger <= 60) return { level: 'Gutom na', multiplier: 0.8, canWork: true };
  if (v.hunger <= 80) return { level: 'Gutom na gutom', multiplier: 0.5, canWork: true };
  return { level: 'Halos mamatay sa gutom', multiplier: 0.2, canWork: false };
}
/* Re-export tickQuips so main.js can call it alongside other villager imports */
export { tickQuips } from './villagerQuips.js';