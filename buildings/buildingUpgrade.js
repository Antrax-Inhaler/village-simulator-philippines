import { clamp } from '../utils/perspective.js';

/* ── Path catalogue ───────────────────────────────────────── */
export var PATH_DEFS = {
  capacity: {
    label:       'Kapasidad',
    description: 'Mas maraming tao at kayamanan ang maaari.',
    icon:        'cap',
    effects:     'Storage ×1.5 | Pop ×1.5',
    costMult:    1.0,   /* no cost change */
    /* Multipliers are read by building.js getStats() via building.upgradePath */
    storageMultiplier:    1.5,
    populationMultiplier: 1.5,
    productionMultiplier: 1.0,
    efficiencyMultiplier: 1.0,
    happinessBonus:       0,
  },

  efficiency: {
    label:       'Kahusayan',
    description: 'Mas mabilis na produksyon, mas kaunting manggagawa.',
    icon:        'eff',
    effects:     'Produksyon ×1.4 | Efficiency ×1.2',
    costMult:    1.0,
    storageMultiplier:    1.0,
    populationMultiplier: 1.0,
    productionMultiplier: 1.4,
    efficiencyMultiplier: 1.2,
    happinessBonus:       -0.001,  /* slight happiness cost per tick */
  },

  quality: {
    label:       'Kalidad',
    description: 'Mas masaya at mas nagtitiwala ang mamamayan.',
    icon:        'qual',
    effects:     'Kasiyahan + | Tiwala +',
    costMult:    1.25,  /* 25% more expensive */
    storageMultiplier:    1.0,
    populationMultiplier: 1.0,
    productionMultiplier: 1.1,
    efficiencyMultiplier: 1.0,
    happinessBonus:       0.004,   /* happiness added per tick per nearby citizen */
  },
};

/* ── Which paths are valid for each building category ────── */
var VALID_PATHS_BY_CATEGORY = {
  basic:          ['capacity', 'quality'],
  production:     ['efficiency', 'capacity'],
  storage:        ['capacity', 'efficiency'],
  training:       ['capacity', 'quality'],
  special:        ['quality', 'efficiency'],
  service:        ['capacity', 'quality'],
  trade:          ['efficiency', 'capacity'],
  infrastructure: ['efficiency', 'capacity'],
  defence:        ['capacity', 'efficiency'],
};

/* ── Default: all paths available if category not mapped ─── */
var ALL_PATHS = ['capacity', 'efficiency', 'quality'];

/* ══════════════════════════════════════════════════════════════
   getAvailablePaths
   Returns valid path keys for a given building instance.
══════════════════════════════════════════════════════════════ */
export function getAvailablePaths(building) {
  var def = building.getDef ? building.getDef() : {};
  var cat = def.category || 'basic';
  return VALID_PATHS_BY_CATEGORY[cat] || ALL_PATHS;
}

/* ══════════════════════════════════════════════════════════════
   getPathDescription
   Safe UI-friendly descriptor for a path key.
══════════════════════════════════════════════════════════════ */
export function getPathDescription(path) {
  return PATH_DEFS[path] || {
    label: path, description: '', icon: '', effects: '', costMult: 1,
  };
}

/* ══════════════════════════════════════════════════════════════
   choosePath
   Sets the upgrade path on a building. Can only be called
   when the building is being upgraded from level 1 → 2.
   Once set, the path is permanent.

   @param {Building} building
   @param {string}   path       — 'capacity' | 'efficiency' | 'quality'
   @param {object}   VS
   @param {Function} [notifyFn]
   @returns {{ ok, msg }}
══════════════════════════════════════════════════════════════ */
export function choosePath(building, path, VS, notifyFn) {
  if (!PATH_DEFS[path]) {
    return { ok: false, msg: 'Hindi kilala ang landas na ito.' };
  }

  /* Only allow path choice at level 1 (first upgrade) */
  if (building.level !== 1) {
    return {
      ok:  false,
      msg: 'Ang landas ay napili na sa unang pag-upgrade lamang.',
    };
  }

  /* Check the path is valid for this building type */
  var validPaths = getAvailablePaths(building);
  if (validPaths.indexOf(path) === -1) {
    return {
      ok:  false,
      msg: 'Hindi angkop ang landas na ito para sa ' + (building.getDef().label || 'gusali') + '.',
    };
  }

  /* Check existing path lock */
  if (building.upgradePath && building.upgradePath !== path) {
    return {
      ok:  false,
      msg: 'Ang landas ay nakapirma na: ' + getPathDescription(building.upgradePath).label + '.',
    };
  }

  building.upgradePath = path;
  var def = getPathDescription(path);

  if (notifyFn) {
    notifyFn(
      building.getDef().label + ': Landas ng ' + def.label + ' napili. ' + def.effects,
      'success'
    );
  }

  return { ok: true, msg: 'Landas napili: ' + def.label };
}


export function upgradeWithPath(building, path, VS, notifyFn) {
  /* First upgrade — must choose a path */
  if (building.level === 1 && !building.upgradePath) {
    if (!path) {
      return { ok: false, msg: 'Pumili ng landas bago mag-upgrade.' };
    }
    var pathResult = choosePath(building, path, VS, null);
    if (!pathResult.ok) return pathResult;
  }

  /* Apply cost multiplier for quality path */
  var pathDef  = PATH_DEFS[building.upgradePath] || PATH_DEFS.capacity;
  var baseCost = building.getUpgradeCost();
  var adjCost  = {
    gold: Math.ceil(baseCost.gold * pathDef.costMult),
    rice: Math.ceil(baseCost.rice * pathDef.costMult),
  };

  /* Override cost check (building.upgrade() does its own check,
     but we need the adjusted cost first) */
  if (VS.res.gold < adjCost.gold || VS.res.rice < adjCost.rice) {
    return {
      ok:  false,
      msg: 'Kulang! Kailangan: ' + adjCost.gold + ' ginto, ' + adjCost.rice + ' bigas.',
    };
  }

  /* Temporarily override the cost for the standard upgrade call */
  var origGold = VS.res.gold;
  var origRice = VS.res.rice;
  VS.res.gold  -= adjCost.gold;
  VS.res.rice  -= adjCost.rice;

  /* Do the level-up (skip its own affordability check by pre-paying) */
  var prevGold = VS.res.gold, prevRice = VS.res.rice;
  var result   = building.upgrade(VS);

  /* upgrade() deducted its own cost on top — refund that double-deduction */
  if (result.ok) {
    var upgCost = building.getUpgradeCost(); /* cost at NEW level, which upgrade() already applied at OLD level */
    /* Actually building.upgrade() deducted at old-level cost. We pre-paid adjCost.
       Since we set gold before calling upgrade(), we need to restore the double-charge. */
    /* Simplest: restore to post-pre-pay state and let upgrade() result stand */
    /* ... upgrade() already ran and deducted from what we had after pre-pay.
       Net deduction = adjCost + upgrade's own cost = double.
       Fix: restore the amount upgrade() deducted on its own. */
    var upgOwnCost = { gold: origGold - adjCost.gold - prevGold, rice: origRice - adjCost.rice - prevRice };
    VS.res.gold = clamp(VS.res.gold + (upgOwnCost.gold < 0 ? 0 : upgOwnCost.gold), 0, VS.resCap.gold);
    VS.res.rice = clamp(VS.res.rice + (upgOwnCost.rice < 0 ? 0 : upgOwnCost.rice), 0, VS.resCap.rice);
  } else {
    /* Upgrade failed — refund our pre-payment */
    VS.res.gold = origGold;
    VS.res.rice = origRice;
  }

  if (result.ok) {
    var pDesc = getPathDescription(building.upgradePath);
    var msg   = result.msg + ' [' + pDesc.label + ']';
    if (notifyFn) notifyFn(msg, 'success');
    return { ok: true, msg: msg };
  }

  return result;
}

/* ══════════════════════════════════════════════════════════════
   applyQualityEffect
   Called by citizenNeeds.js each tick for quality-path buildings.
   Adds a small happiness bonus to nearby citizens.

   @param {Building} building
   @param {Array}    villagers
   @param {number}   dt
   @param {number}   range    — world-space radius
══════════════════════════════════════════════════════════════ */
export function applyQualityEffect(building, villagers, dt, range) {
  if (building.upgradePath !== 'quality') return;
  var pathDef = PATH_DEFS.quality;
  var happBonus = pathDef.happinessBonus * building.level * dt * 100;
  if (happBonus <= 0) return;

  villagers.forEach(function(v) {
    var dx = v.x - building.x, dy = v.y - building.y;
    if (Math.sqrt(dx*dx + dy*dy) < range) {
      if (v.happiness === undefined) v.happiness = 60;
      v.happiness = clamp(v.happiness + happBonus, 0, 100);
    }
  });
}
