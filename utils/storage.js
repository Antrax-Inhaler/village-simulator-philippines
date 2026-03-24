/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/storage.js  (modified)

   CHANGES FROM ORIGINAL
   ─────────────────────────────────────────────────────────────
   saveGame signature: saveGame(VS, dayCount, slotKey, personalFinance)
     personalFinance = { playerGold, playerRice, corruptionHistory }
     persisted as top-level fields on the save object.

   loadGame returns playerGold, playerRice, corruptionHistory.
   Callers restore personal finance via initPersonalFinance().

   version bump → 4 (v3 saves still load via compat shim)
═══════════════════════════════════════════════════════════════ */

var SAVE_KEY      = 'miniBayan_save';
var AUTOSAVE_KEY  = 'miniBayan_autosave';
var SETTINGS_KEY  = 'miniBayan_settings';

var _autoSaveTimer  = 0;
var AUTO_SAVE_EVERY = 60;

/* ── Villager serialisation ───────────────────────────────── */
function _serializeVillagers(villagers) {
  return villagers.map(function(v) {
  return {
      id:          v.id,
      typeIdx:     v.typeIdx,
      x:           Math.round(v.x),
      y:           Math.round(v.y),
      mood:        v.mood,
      personality: v.personality,
      gender:      v.gender,
      label:       v.label,
      carrying:    v.carrying,
      hp:          v.hp,
      hunger:      v.hunger    !== undefined ? Math.round(v.hunger)    : 20,
      health:      v.health    !== undefined ? Math.round(v.health)    : 80,
      govTrust:    v.govTrust  !== undefined ? Math.round(v.govTrust)  : 50,
      happiness:   v.happiness !== undefined ? Math.round(v.happiness) : 60,
      anger:       v.anger     !== undefined ? Math.round(v.anger)     : 0,
      income:      v.income    !== undefined ? v.income                : 0,
      workShiftTimer: v.workShiftTimer || 0,
    };
  });
}

function _serializeBuildings(buildings) {
  return buildings.map(function(b) {
    return {
      id:                b.id,
      type:              b.type,
      level:             b.level,
      x:                 Math.round(b.x),
      y:                 Math.round(b.y),
      unlocked:          b.unlocked,
      uncollectedGold:   Math.floor(b.uncollectedGold || 0),
      uncollectedFood:   Math.floor(b.uncollectedFood || 0),
      underConstruction: b.underConstruction || false,
      constructionTime:  Math.ceil(b.constructionTime || 0),
      constructionMax:   b.constructionMax || 0,
      upgradeLevel:      b._upgradeLevel || 0,
      isWreck:           b.isWreck      || false,
      originalType:      b.originalType || null,
    };
  });
}

function _serializeResourceNodes(nodes) {
  return nodes.map(function(r) {
    return {
      id:       r.id,
      type:     r.type,
      x:        Math.round(r.x),
      y:        Math.round(r.y),
      amount:   Math.round(r.amount),
      capacity: r.capacity,
    };
  });
}

function _serializeCorruption(c) {
  if (!c) return null;
  return {
    personalFund:     Math.round(c.personalFund),
    riskLevel:        Math.round(c.riskLevel),
    exposureLevel:    Math.round(c.exposureLevel),
    scandalsThisTerm: c.scandalsThisTerm,
    totalDiverted:    Math.round(c.totalDiverted),
  };
}
function _serializePolicies(p) {
  if (!p) return null;
  return { active: Object.assign({}, p.active), totalSpent: p.totalSpent };
}
function _serializeElection(e) {
  if (!e) return null;
  return { termTimer: e.termTimer, termNumber: e.termNumber, lastApproval: e.lastApproval, terminated: e.terminated };
}
function _serializeEvents(ev) {
  if (!ev) return null;
  return { queue: ev.queue ? ev.queue.slice() : [], cooldown: ev.cooldown || 0 };
}

/* ══════════════════════════════════════════════════════════════
   saveGame
   @param personalFinance  { playerGold, playerRice, corruptionHistory }
══════════════════════════════════════════════════════════════ */
export function saveGame(VS, dayCount, slotKey, personalFinance) {
  var key = slotKey || SAVE_KEY;
  try {
    var pf = personalFinance || { playerGold: 0, playerRice: 0, corruptionHistory: [] };
    var state = {
      version:            4,
      savedAt:            Date.now(),
      dayCount:           dayCount,
      time:               VS.time,
      res:                Object.assign({}, VS.res),
      resCap:             Object.assign({}, VS.resCap),
      pop:                Object.assign({}, VS.pop),
      villagers:          _serializeVillagers(VS.villagers),
      buildings:          _serializeBuildings(VS.buildings),
      resourceNodes:      _serializeResourceNodes(VS.resourceNodes),
      corruption:         _serializeCorruption(VS.corruption),
      policies:           _serializePolicies(VS.policies),
      election:           _serializeElection(VS.election),
      events:             _serializeEvents(VS.events),
      unlockedZones:      (VS.unlockedZones || []).slice(),
      food:               VS.food ? Object.assign({}, VS.food) : null,
      /* Personal finance */
      playerGold:         Math.round(pf.playerGold || 0),
      playerRice:         Math.round(pf.playerRice || 0),
      corruptionHistory:  (pf.corruptionHistory || []).slice(),
    };
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('[storage] saveGame failed:', e.message);
    try {
      var minimal = {
        version: 4, savedAt: Date.now(), dayCount: dayCount, time: VS.time,
        res: Object.assign({}, VS.res), resCap: Object.assign({}, VS.resCap),
        pop: Object.assign({}, VS.pop), villagers: [],
        buildings: _serializeBuildings(VS.buildings),
        resourceNodes: _serializeResourceNodes(VS.resourceNodes),
        corruption: _serializeCorruption(VS.corruption),
        policies: _serializePolicies(VS.policies),
        election: _serializeElection(VS.election),
        events: null, unlockedZones: (VS.unlockedZones || []).slice(), food: null,
        playerGold: 0, playerRice: 0, corruptionHistory: [],
      };
      localStorage.setItem(key, JSON.stringify(minimal));
      return true;
    } catch (e2) { console.error('[storage] saveGame failed completely:', e2.message); return false; }
  }
}

/* ══════════════════════════════════════════════════════════════
   loadGame
══════════════════════════════════════════════════════════════ */
export function loadGame(slotKey) {
  var key = slotKey || SAVE_KEY;
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var state = JSON.parse(raw);
    if (!state || !state.version) console.warn('[storage] Save has no version tag.');
    if (state.version < 4) state = _upgradeToV4(state);
    return state;
  } catch (e) {
    console.error('[storage] loadGame failed:', e.message);
    return null;
  }
}

function _upgradeToV4(s) {
  /* v2/v3 → v4: add citizen fields + personal finance */
  if (s.villagers) {
    s.villagers = s.villagers.map(function(v) {
      return Object.assign({ hunger:20, health:80, govTrust:50, happiness:60, anger:0, income:0 }, v);
    });
  }
  s.corruption        = s.corruption    || null;
  s.policies          = s.policies      || null;
  s.election          = s.election      || null;
  s.events            = s.events        || null;
  s.unlockedZones     = s.unlockedZones || [];
  s.food              = s.food          || null;
  s.playerGold        = s.playerGold    || 0;
  s.playerRice        = s.playerRice    || 0;
  s.corruptionHistory = s.corruptionHistory || [];
  s.version = 4;
  return s;
}

export function deleteSave(slotKey) {
  try { localStorage.removeItem(slotKey || SAVE_KEY); } catch(e) {}
}
export function hasSave(slotKey) {
  try { return localStorage.getItem(slotKey || SAVE_KEY) !== null; } catch(e) { return false; }
}
export function getSaveInfo(slotKey) {
  var state = loadGame(slotKey);
  if (!state) return null;
  return { dayCount: state.dayCount || 1, savedAt: state.savedAt || 0 };
}
export function updateAutoSave(dt, VS, dayCount, personalFinance) {
  _autoSaveTimer += dt;
  if (_autoSaveTimer >= AUTO_SAVE_EVERY) {
    _autoSaveTimer = 0;
    saveGame(VS, dayCount, AUTOSAVE_KEY, personalFinance);
    console.log('[storage] Auto-saved at day', dayCount, 'hour', VS.time.toFixed(1));
  }
}
export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch(e) {}
}
export function loadSettings() {
  try {
    var raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}