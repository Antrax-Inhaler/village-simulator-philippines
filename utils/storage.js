/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/storage.js  (updated)

   STORAGE HANDLERS
   ─────────────────────────────────────────────────────────────
   UPDATED FOR:
   - Debt system (principal, creditScore, defaulted, etc.)
   - Uncollected langis in buildings
   - Langis resource nodes
   - All new citizen stats
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
      isTraining:  v.isTraining || false,
      trainingProgress: v.trainingProgress || 0,
      isChild:     v.isChild || false,
      age:         v.age || 0,
      growthTimer: v.growthTimer || 0,
      isLeader:    v.isLeader || false,
    };
  });
}

/* ── Building serialisation (updated with uncollectedLangis) ─ */
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
      uncollectedLangis: Math.floor(b.uncollectedLangis || 0),  // NEW
      underConstruction: b.underConstruction || false,
      constructionTime:  Math.ceil(b.constructionTime || 0),
      constructionMax:   b.constructionMax || 0,
      upgradeLevel:      b._upgradeLevel || 0,
      isWreck:           b.isWreck      || false,
      originalType:      b.originalType || null,
    };
  });
}

/* ── Resource node serialisation (updated with langis) ────── */
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

/* ── Debt serialisation (NEW) ─────────────────────────────── */
function _serializeDebt(debt) {
  if (!debt) return null;
  return {
    principal:        Math.round(debt.principal || 0),
    interestRate:     debt.interestRate || 0.05,
    lastInterestDay:  debt.lastInterestDay || 0,
    paymentHistory:   (debt.paymentHistory || []).slice(),
    creditScore:      debt.creditScore || 60,
    defaulted:        debt.defaulted || false,
    lastPaymentDay:   debt.lastPaymentDay || 0,
    missedPayments:   debt.missedPayments || 0,
  };
}

/* ── Corruption serialisation (unchanged) ─────────────────── */
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

/* ── Policies serialisation (unchanged) ───────────────────── */
function _serializePolicies(p) {
  if (!p) return null;
  return { active: Object.assign({}, p.active), totalSpent: p.totalSpent };
}

/* ── Election serialisation (unchanged) ───────────────────── */
function _serializeElection(e) {
  if (!e) return null;
  return { termTimer: e.termTimer, termNumber: e.termNumber, lastApproval: e.lastApproval, terminated: e.terminated };
}

/* ── Events serialisation (unchanged) ─────────────────────── */
function _serializeEvents(ev) {
  if (!ev) return null;
  return { queue: ev.queue ? ev.queue.slice() : [], cooldown: ev.cooldown || 0 };
}

/* ── Trade serialisation (NEW) ────────────────────────────── */
function _serializeTrade(trade) {
  if (!trade) return null;
  return {
    reputation:      trade.reputation || 50,
    contracts:       (trade.contracts || []).slice(),
    pendingImports:  (trade.pendingImports || []).slice(),
    history:         (trade.history || []).slice(),
    contractCooldown: trade.contractCooldown || 0,
  };
}

/* ── Needs serialisation (NEW) ────────────────────────────── */
function _serializeNeeds(needs) {
  if (!needs) return null;
  return {
    requests:           (needs.requests || []).map(function(r) {
      // Don't serialize functions, only data
      return {
        id: r.id,
        category: r.category,
        subcategory: r.subcategory,
        message: r.message,
        citizenLabel: r.citizenLabel,
        citizenId: r.citizenId,
        urgency: r.urgency,
        helpCostGold: r.helpCostGold,
        timeLeft: r.timeLeft,
        timeMax: r.timeMax,
        createdAt: r.createdAt,
        resolved: r.resolved,
        buildingType: r.buildingType,
        profession: r.profession,
        unemployedCount: r.unemployedCount,
        solutionBuilding: r.solutionBuilding,
        homelessCount: r.homelessCount,
        ayudaMin: r.ayudaMin,
        ayudaMax: r.ayudaMax,
      };
    }),
    resolved:           (needs.resolved || []).slice(),
    cooldowns:          Object.assign({}, needs.cooldowns || {}),
    employmentProgress: Object.assign({}, needs.employmentProgress || {}),
  };
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
      version:            5,  // Incremented version for debt and new fields
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
      trade:              _serializeTrade(VS.trade),
      needs:              _serializeNeeds(VS.needs),
      debt:               _serializeDebt(VS.debt),          // NEW
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
        version: 5, savedAt: Date.now(), dayCount: dayCount, time: VS.time,
        res: Object.assign({}, VS.res), resCap: Object.assign({}, VS.resCap),
        pop: Object.assign({}, VS.pop), villagers: [],
        buildings: _serializeBuildings(VS.buildings),
        resourceNodes: _serializeResourceNodes(VS.resourceNodes),
        corruption: _serializeCorruption(VS.corruption),
        policies: _serializePolicies(VS.policies),
        election: _serializeElection(VS.election),
        events: null, trade: null, needs: null, debt: null,
        unlockedZones: (VS.unlockedZones || []).slice(), food: null,
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
    if (state.version < 5) state = _upgradeToV5(state);
    return state;
  } catch (e) {
    console.error('[storage] loadGame failed:', e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   Upgrade to V5 (adds debt, uncollectedLangis, trade, needs)
══════════════════════════════════════════════════════════════ */
function _upgradeToV5(s) {
  // Upgrade from v4 to v5
  if (s.version < 5) {
    // Add missing citizen fields if needed
    if (s.villagers) {
      s.villagers = s.villagers.map(function(v) {
        return Object.assign({ 
          hunger: 20, health: 80, govTrust: 50, happiness: 60, anger: 0, income: 0,
          isTraining: false, trainingProgress: 0, isChild: false, age: 0, growthTimer: 0, isLeader: false
        }, v);
      });
    }
    
    // Add uncollectedLangis to buildings
    if (s.buildings) {
      s.buildings = s.buildings.map(function(b) {
        if (b.uncollectedLangis === undefined) {
          b.uncollectedLangis = 0;
        }
        return b;
      });
    }
    
    // Add debt system
    if (!s.debt) {
      s.debt = {
        principal: 0,
        interestRate: 0.05,
        lastInterestDay: 0,
        paymentHistory: [],
        creditScore: 60,
        defaulted: false,
        lastPaymentDay: 0,
        missedPayments: 0
      };
    }
    
    // Add trade system if missing
    if (!s.trade) {
      s.trade = {
        reputation: 50,
        contracts: [],
        pendingImports: [],
        history: [],
        contractCooldown: 0
      };
    }
    
    // Add needs system if missing
    if (!s.needs) {
      s.needs = {
        requests: [],
        resolved: [],
        cooldowns: {},
        employmentProgress: {}
      };
    }
    
    // Ensure food exists
    if (!s.food) {
      s.food = { pool: 200, consumption: 0, buffer: 0 };
    }
    
    // Ensure resCap exists for langis
    if (s.resCap && s.resCap.langis === undefined) {
      s.resCap.langis = 800;
    }
    
    // Ensure res has langis
    if (s.res && s.res.langis === undefined) {
      s.res.langis = 20;
    }
    
    s.version = 5;
  }
  return s;
}

/* ── Legacy upgrade (keep for old saves) ──────────────────── */
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