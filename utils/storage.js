/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — utils/storage.js  (Version 7 - Missile Warfare)
   STORAGE HANDLERS
   ─────────────────────────────────────────────────────────────
   UPDATED FOR:
   - Debt system (principal, creditScore, defaulted, etc.)
   - Uncollected langis in buildings
   - Langis resource nodes
   - All new citizen stats
   - RANKING SYSTEM (score, history, previousDayStats)
   - MISSILE WARFARE SYSTEM (outgoing, incoming, history, warState)
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
      id:              v.id,
      typeIdx:         v.typeIdx,
      x:               Math.round(v.x),
      y:               Math.round(v.y),
      mood:            v.mood,
      personality:     v.personality,
      gender:          v.gender,
      label:           v.label,
      carrying:        v.carrying,
      hp:              v.hp,
      hunger:          v.hunger    !== undefined ? Math.round(v.hunger)    : 20,
      health:          v.health    !== undefined ? Math.round(v.health)    : 80,
      govTrust:        v.govTrust  !== undefined ? Math.round(v.govTrust)  : 50,
      happiness:       v.happiness !== undefined ? Math.round(v.happiness) : 60,
      anger:           v.anger     !== undefined ? Math.round(v.anger)     : 0,
      income:          v.income    !== undefined ? v.income                : 0,
      workShiftTimer:  v.workShiftTimer || 0,
      isTraining:      v.isTraining || false,
      trainingProgress: v.trainingProgress || 0,
      isChild:         v.isChild || false,
      age:             v.age || 0,
      growthTimer:     v.growthTimer || 0,
      isLeader:        v.isLeader || false,
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
      uncollectedLangis: Math.floor(b.uncollectedLangis || 0),
      underConstruction: b.underConstruction || false,
      constructionTime:  Math.ceil(b.constructionTime || 0),
      constructionMax:   b.constructionMax || 0,
      upgradeLevel:      b._upgradeLevel || 0,
      isWreck:           b.isWreck      || false,
      originalType:      b.originalType || null,
      // Missile building state
      missileStock:      b.missileStock || null,
      reloadTimer:       b.reloadTimer || 0,
      lastLaunchTime:    b.lastLaunchTime || 0,
      interceptorStock:  b.interceptorStock !== undefined ? b.interceptorStock : 0,
      interceptCooldown: b.interceptCooldown || 0,
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

/* ── Debt serialisation ───────────────────────────────────── */
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

/* ── Ranking serialisation ────────────────────────────────── */
function _serializeRank(rank) {
  if (!rank) return null;
  return {
    score:            rank.score || 0,
    history:          (rank.history || []).slice(),
    lastRankId:       rank.lastRankId || 1,
    previousDayStats: rank.previousDayStats ? {
      avgApproval:      rank.previousDayStats.avgApproval,
      population:       rank.previousDayStats.population,
      employed:         rank.previousDayStats.employed,
      buildings:        rank.previousDayStats.buildings,
      totalLevels:      rank.previousDayStats.totalLevels,
      tradeProfit:      rank.previousDayStats.tradeProfit,
      corruption:       rank.previousDayStats.corruption,
      waste:            rank.previousDayStats.waste,
      resolvedEvents:   rank.previousDayStats.resolvedEvents,
      damagedBuildings: rank.previousDayStats.damagedBuildings
    } : null
  };
}

/* ══════════════════════════════════════════════════════════════
   MISSILE WARFARE SERIALISATION (NEW v7)
   ══════════════════════════════════════════════════════════════ */

/* ── Missiles serialisation ───────────────────────────────── */
function _serializeMissiles(missiles) {
  if (!missiles) return null;
  return {
    outgoing: (missiles.outgoing || []).map(function(m) {
      return {
        id:           m.id,
        type:         m.type,
        targetX:      m.targetX,
        targetY:      m.targetY,
        targetZone:   m.targetZone,
        targetName:   m.targetName,
        launchTime:   m.launchTime,
        impactTime:   m.impactTime,
        eta:          m.eta,
        status:       m.status,
        damage:       m.damage || 0,
        buildingHit:  m.buildingHit || null,
        lootGained:   m.lootGained || 0,
        cancelled:    m.cancelled || false,
        startX:       m.startX || 0,
        startY:       m.startY || 0,
        progress:     m.progress || 0,
      };
    }),
    incoming: (missiles.incoming || []).map(function(m) {
      return {
        id:           m.id,
        type:         m.type,
        attackerName: m.attackerName,
        launchTime:   m.launchTime,
        impactTime:   m.impactTime,
        eta:          m.eta,
        status:       m.status,
        intercepted:  m.intercepted || false,
        damage:       m.damage || 0,
        buildingHit:  m.buildingHit || null,
      };
    }),
    history: (missiles.history || []).slice(0, 50),
  };
}

/* ── War State serialisation ──────────────────────────────── */
function _serializeWarState(warState) {
  if (!warState) return null;
  return {
    attacksMade:         (warState.attacksMade || []).slice(0, 100),
    attacksReceived:     (warState.attacksReceived || []).slice(0, 100),
    lastAttackTime:      warState.lastAttackTime || 0,
    lastRetaliationTime: warState.lastRetaliationTime || 0,
    trustPenalties:      warState.trustPenalties || 0,
    rankPenalties:       warState.rankPenalties || 0,
    dailyAttackCount:    warState.dailyAttackCount || 0,
    dailyAttackReset:    warState.dailyAttackReset || 0,
    weeklyAttacks:       (warState.weeklyAttacks || []).slice(0, 50),
    lastLoginTime:       warState.lastLoginTime || Date.now(),
  };
}

/* ── Missile Inventory serialisation ──────────────────────── */
function _serializeMissileInventory(inventory) {
  if (!inventory) return null;
  return {
    basic:       inventory.basic || 0,
    precision:   inventory.precision || 0,
    ballistic:   inventory.ballistic || 0,
    mirv:        inventory.mirv || 0,
    interceptor: inventory.interceptor || 0,
  };
}

/* ── Scout History serialisation ──────────────────────────── */
function _serializeScoutHistory(scoutHistory) {
  if (!scoutHistory) return null;
  return (scoutHistory || []).slice(0, 20).map(function(s) {
    return {
      id:            s.id || 'scout_' + Date.now(),
      targetX:       s.targetX,
      targetY:       s.targetY,
      targetZone:    s.targetZone,
      targetName:    s.targetName,
      scannedAt:     s.scannedAt,
      expiresAt:     s.expiresAt,
      villageLevel:  s.villageLevel || 1,
      defPower:      s.defPower || 0,
      goldLoot:      s.goldLoot || 0,
      riceLoot:      s.riceLoot || 0,
      buildings:     s.buildings || [],
    };
  });
}

/* ── Corruption serialisation ─────────────────────────────── */
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

/* ── Policies serialisation ───────────────────────────────── */
function _serializePolicies(p) {
  if (!p) return null;
  return { active: Object.assign({}, p.active), totalSpent: p.totalSpent };
}

/* ── Election serialisation ───────────────────────────────── */
function _serializeElection(e) {
  if (!e) return null;
  return { 
    termTimer: e.termTimer, 
    termNumber: e.termNumber, 
    lastApproval: e.lastApproval, 
    terminated: e.terminated 
  };
}

/* ── Events serialisation ─────────────────────────────────── */
function _serializeEvents(ev) {
  if (!ev) return null;
  return { queue: ev.queue ? ev.queue.slice() : [], cooldown: ev.cooldown || 0 };
}

/* ── Trade serialisation ──────────────────────────────────── */
function _serializeTrade(trade) {
  if (!trade) return null;
  return {
    reputation:       trade.reputation || 50,
    contracts:        (trade.contracts || []).slice(),
    pendingImports:   (trade.pendingImports || []).slice(),
    history:          (trade.history || []).slice(),
    contractCooldown: trade.contractCooldown || 0,
  };
}

/* ── Needs serialisation ──────────────────────────────────── */
function _serializeNeeds(needs) {
  if (!needs) return null;
  return {
    requests: (needs.requests || []).map(function(r) {
      return {
        id:               r.id,
        category:         r.category,
        subcategory:      r.subcategory,
        message:          r.message,
        citizenLabel:     r.citizenLabel,
        citizenId:        r.citizenId,
        urgency:          r.urgency,
        helpCostGold:     r.helpCostGold,
        timeLeft:         r.timeLeft,
        timeMax:          r.timeMax,
        createdAt:        r.createdAt,
        resolved:         r.resolved,
        buildingType:     r.buildingType,
        profession:       r.profession,
        unemployedCount:  r.unemployedCount,
        solutionBuilding: r.solutionBuilding,
        homelessCount:    r.homelessCount,
        ayudaMin:         r.ayudaMin,
        ayudaMax:         r.ayudaMax,
      };
    }),
    resolved: (needs.resolved || []).slice(),
    cooldowns: Object.assign({}, needs.cooldowns || {}),
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
      version:            7,  // UPDATED: Version 7 for Missile Warfare
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
      debt:               _serializeDebt(VS.debt),
      rank:               _serializeRank(VS.rank),
      // NEW v7: Missile Warfare System
      missiles:           _serializeMissiles(VS.missiles),
      warState:           _serializeWarState(VS.warState),
      missileInventory:   _serializeMissileInventory(VS.missileInventory),
      scoutHistory:       _serializeScoutHistory(VS.scoutHistory),
      // Existing
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
        version: 7, savedAt: Date.now(), dayCount: dayCount, time: VS.time,
        res: Object.assign({}, VS.res), resCap: Object.assign({}, VS.resCap),
        pop: Object.assign({}, VS.pop), villagers: [],
        buildings: _serializeBuildings(VS.buildings),
        resourceNodes: _serializeResourceNodes(VS.resourceNodes),
        corruption: _serializeCorruption(VS.corruption),
        policies: _serializePolicies(VS.policies), 
        election: _serializeElection(VS.election),
        events: null, trade: null, needs: null, debt: null, rank: null,
        missiles: null, warState: null, missileInventory: null, scoutHistory: null,
        unlockedZones: (VS.unlockedZones || []).slice(), food: null,
        playerGold:  0, playerRice: 0, corruptionHistory: [],
      };
      localStorage.setItem(key, JSON.stringify(minimal));
      return true;
    } catch (e2) { 
      console.error('[storage] saveGame failed completely:', e2.message); 
      return false; 
    }
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
    
    // Upgrade chain: v4 → v5 → v6 → v7
    if (state.version < 7) state = _upgradeToV7(state);
    if (state.version < 6) state = _upgradeToV6(state);
    if (state.version < 5) state = _upgradeToV5(state);
    if (state.version < 4) state = _upgradeToV4(state);
    
    return state;
  } catch (e) {
    console.error('[storage] loadGame failed:', e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   Upgrade to V7 (adds Missile Warfare System)
   ══════════════════════════════════════════════════════════════ */
function _upgradeToV7(s) {
  if (s.version < 7) {
    // Add missile warfare system
    if (!s.missiles) {
      s.missiles = {
        outgoing: [],
        incoming: [],
        history: []
      };
    }
    
    // Add war state tracking
    if (!s.warState) {
      s.warState = {
        attacksMade: [],
        attacksReceived: [],
        lastAttackTime: 0,
        lastRetaliationTime: 0,
        trustPenalties: 0,
        rankPenalties: 0,
        dailyAttackCount: 0,
        dailyAttackReset: 0,
        weeklyAttacks: [],
        lastLoginTime: Date.now()
      };
    }
    
    // Add missile inventory
    if (!s.missileInventory) {
      s.missileInventory = {
        basic: 0,
        precision: 0,
        ballistic: 0,
        mirv: 0,
        interceptor: 0
      };
    }
    
    // Add scout history
    if (!s.scoutHistory) {
      s.scoutHistory = [];
    }
    
    // Ensure buildings have missile state fields
    if (s.buildings) {
      s.buildings = s.buildings.map(function(b) {
        if (!b.missileStock) b.missileStock = null;
        if (!b.reloadTimer) b.reloadTimer = 0;
        if (!b.lastLaunchTime) b.lastLaunchTime = 0;
        if (b.interceptorStock === undefined) b.interceptorStock = 0;
        if (!b.interceptCooldown) b.interceptCooldown = 0;
        return b;
      });
    }
    
    s.version = 7;
  }
  return s;
}

/* ══════════════════════════════════════════════════════════════
   Upgrade to V6 (adds ranking system)
   ══════════════════════════════════════════════════════════════ */
function _upgradeToV6(s) {
  if (s.version < 6) {
    if (!s.rank) {
      s.rank = {
        score: 0,
        history: [],
        lastRankId: 1,
        previousDayStats: null
      };
    }
    s.version = 6;
  }
  return s;
}

/* ══════════════════════════════════════════════════════════════
   Upgrade to V5 (adds debt, uncollectedLangis, trade, needs)
   ══════════════════════════════════════════════════════════════ */
function _upgradeToV5(s) {
  if (s.version < 5) {
    if (s.villagers) {
      s.villagers = s.villagers.map(function(v) {
        return Object.assign({
          hunger: 20, health: 80, govTrust: 50, happiness: 60, anger: 0, income: 0,
          isTraining: false, trainingProgress: 0, isChild: false, age: 0, growthTimer: 0, isLeader: false
        }, v);
      });
    }
    if (s.buildings) {
      s.buildings = s.buildings.map(function(b) {
        if (b.uncollectedLangis === undefined) {
          b.uncollectedLangis = 0;
        }
        return b;
      });
    }
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
    if (!s.trade) {
      s.trade = {
        reputation: 50,
        contracts: [],
        pendingImports: [],
        history: [],
        contractCooldown: 0
      };
    }
    if (!s.needs) {
      s.needs = {
        requests: [],
        resolved: [],
        cooldowns: {},
        employmentProgress: {}
      };
    }
    if (!s.food) {
      s.food = { pool: 200, consumption: 0, buffer: 0 };
    }
    if (s.resCap && s.resCap.langis === undefined) {
      s.resCap.langis = 800;
    }
    if (s.res && s.res.langis === undefined) {
      s.res.langis = 20;
    }
    s.version = 5;
  }
  return s;
}

/* ── Legacy upgrade (keep for old saves) ──────────────────── */
function _upgradeToV4(s) {
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

/* ══════════════════════════════════════════════════════════════
   Missile State Helpers (NEW v7)
   ══════════════════════════════════════════════════════════════ */

/* Check for missiles that should have impacted while game was closed */
export function processOfflineMissiles(VS, currentTime) {
  if (!VS.missiles) return { impacted: [], intercepted: [] };
  
  var impacted = [];
  var intercepted = [];
  
  // Check outgoing missiles
  if (VS.missiles.outgoing) {
    VS.missiles.outgoing = VS.missiles.outgoing.filter(function(m) {
      if (m.status === 'traveling' && currentTime >= m.impactTime && !m.cancelled) {
        m.status = 'impacted';
        impacted.push(m);
        return false;
      }
      return m.status === 'traveling' && !m.cancelled;
    });
  }
  
  // Check incoming missiles
  if (VS.missiles.incoming) {
    VS.missiles.incoming = VS.missiles.incoming.filter(function(m) {
      if (m.status === 'traveling' && currentTime >= m.impactTime) {
        if (m.intercepted) {
          m.status = 'intercepted';
          intercepted.push(m);
        } else {
          m.status = 'impacted';
          impacted.push(m);
        }
        return false;
      }
      return m.status === 'traveling';
    });
  }
  
  return { impacted: impacted, intercepted: intercepted };
}

/* Calculate ETA for a missile based on distance */
export function calculateMissileETA(distance, missileType) {
  var speeds = {
    basic:     150,
    precision: 120,
    ballistic: 100,
    mirv:      80
  };
  var speed = speeds[missileType] || 100;
  var variance = 0.8 + Math.random() * 0.4;
  return Math.floor((distance / speed) * variance);
}

/* Get distance between two world coordinates */
export function getWorldDistance(x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/* Export version info for debugging */
export var STORAGE_VERSION = 7;