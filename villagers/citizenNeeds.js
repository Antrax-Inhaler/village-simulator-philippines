/* ═══════════════════════════════════════════════════════════════
   Mini Bayan — villagers/citizenNeeds.js (REDESIGNED)
   
   NEW REQUEST SYSTEM:
   - Job-based requests for unemployed villagers by profession
   - Hidden satisfaction thresholds for ayuda
   - Progress tracking for employment
   - Building deficit detection (palengke, paaralan, ospital, bahay)
═══════════════════════════════════════════════════════════════ */

import { clamp, randInt, randRange } from '../utils/perspective.js';
import { getTaxRate, getWasteStats } from '../resources/economy.js';

/* ── Constants ────────────────────────────────────────────── */
var MAX_ACTIVE_REQUESTS     = 5;
var REQUEST_EXPIRY_SECS     = 180;
var ANGER_DECAY_RATE        = 0.005;
var ANGER_BUILDUP_IGNORED   = 8;
var TRUST_LOSS_PER_IGNORE   = 5;
var TRUST_LOSS_ANGER_RATE   = 0.002;

/* Waste penalty scaling */
var WASTE_TRUST_DIVISOR     = 10000;
var WASTE_TRUST_CAP         = 0.1;
var WASTE_HAPPY_RATIO       = 0.5;

/* Profession types */
var PROFESSIONS = {
  magsasaka: { role: 'Magsasaka', workplace: 'farm', zone: 'bukid', requestMsg: 'Walang bukid! Saan ako magtatanim?', solution: 'Farm' },
  mangingisda: { role: 'Mangingisda', workplace: 'daungan', zone: 'dagat', requestMsg: 'Walang daungan! Hindi ako makapangisda!', solution: 'Daungan' },
  magsasaka_kalikasan: { role: 'Magsasaka (Kalikasan)', workplace: 'kagubatan', zone: 'kalikasan', requestMsg: 'Gusto kong mag-alaga ng puno, walang kagubatan!', solution: 'Kalikasan zone' },
  manggagawa: { role: 'Manggagawa', workplace: 'palengke/minahan', zone: 'bayan', requestMsg: 'Walang trabaho! Kailangan ng palengke o minahan!', solution: 'Palengke/Minahan' }
};

/* Building deficit detection */
var BUILDING_DEFICITS = {
  palengke: { type: 'palengke', requestMsg: 'Saan kami mamimili? Walang palengke!', urgency: 2 },
  paaralan: { type: 'paaralan', requestMsg: 'Ang mga bata walang eskwelahan!', urgency: 3 },
  ospital: { type: 'ospital', requestMsg: 'May sakit ang pamilya ko, walang ospital!', urgency: 3 },
  bahay: { type: 'bahay', requestMsg: 'Wala kaming matuluyan, walang bahay!', urgency: 2 }
};

var _reqIdCounter = 0;
var _ayudaHistory = {}; // track ayuda amounts per request to adjust expectations

/* ── Ensure VS.needs sub-state ────────────────────────────── */
function _ensureState(VS) {
  if (!VS.needs) {
    VS.needs = {
      requests:  [],
      resolved:  [],
      cooldowns: {},
      employmentProgress: {} // track per-request employment progress
    };
  }
}

/* ══════════════════════════════════════════════════════════════
   NEW FUNCTIONS - Job & Building Detection
══════════════════════════════════════════════════════════════ */

/* Get unemployed count by profession type */
export function getUnemployedByProfession(VS) {
  var result = {
    magsasaka: 0,
    mangingisda: 0,
    magsasaka_kalikasan: 0,
    manggagawa: 0
  };
  
  VS.villagers.forEach(function(v) {
    if (!v.workBuilding) {
      var role = (v._typeDef && v._typeDef.role) || '';
      if (role.includes('Magsasaka') && !role.includes('Kalikasan')) result.magsasaka++;
      else if (role.includes('Mangingisda')) result.mangingisda++;
      else if (role.includes('Kalikasan')) result.magsasaka_kalikasan++;
      else result.manggagawa++;
    }
  });
  
  return result;
}

/* Get homeless count */
export function getHousingDeficit(VS) {
  return VS.villagers.filter(function(v) { return !v.homeBuilding; }).length;
}

/* Check if required building exists */
export function getBuildingDeficit(VS, buildingType) {
  var exists = VS.buildings.some(function(b) { 
    return b.type === buildingType || b.label === buildingType;
  });
  return !exists;
}

/* Get hidden ayuda satisfaction range for a request */
export function getAyudaSatisfactionRange(requestId) {
  var history = _ayudaHistory[requestId] || { adjustment: 0 };
  var baseMin = randInt(50, 150);
  var baseMax = randInt(200, 400);
  
  // Adjust based on previous over-giving (increase expectations by 20%)
  if (history.adjustment) {
    return {
      min: Math.floor(baseMin * (1 + history.adjustment)),
      max: Math.floor(baseMax * (1 + history.adjustment))
    };
  }
  
  return { min: baseMin, max: baseMax };
}

/* Record ayuda given, adjust future expectations */
export function recordAyudaGiven(requestId, amount, minThreshold, maxThreshold) {
  if (!_ayudaHistory[requestId]) _ayudaHistory[requestId] = { amount: 0, count: 0, adjustment: 0 };
  
  var history = _ayudaHistory[requestId];
  history.amount += amount;
  history.count++;
  
  // If gave above max, increase future expectations by 20%
  if (amount > maxThreshold) {
    history.adjustment = (history.adjustment || 0) + 0.2;
  }
}

/* Update employment progress for job requests */
export function updateEmploymentProgress(requestId, VS) {
  if (!VS.needs.employmentProgress[requestId]) return;
  
  var progress = VS.needs.employmentProgress[requestId];
  var unemployedNow = 0;
  
  if (progress.profession === 'magsasaka') {
    var counts = getUnemployedByProfession(VS);
    unemployedNow = counts.magsasaka;
  } else if (progress.profession === 'mangingisda') {
    var counts = getUnemployedByProfession(VS);
    unemployedNow = counts.mangingisda;
  } else if (progress.profession === 'manggagawa') {
    var counts = getUnemployedByProfession(VS);
    unemployedNow = counts.manggagawa;
  } else if (progress.profession === 'homeless') {
    unemployedNow = getHousingDeficit(VS);
  }
  
  progress.currentEmployed = progress.initialUnemployed - unemployedNow;
  progress.currentUnemployed = unemployedNow;
}

/* ── Check and emit building deficit requests ─────────────── */
function _checkBuildingDeficits(VS, N, now) {
  for (var type in BUILDING_DEFICITS) {
    var def = BUILDING_DEFICITS[type];
    if (getBuildingDeficit(VS, def.type) && _canEmit('building_' + type, N, now)) {
      N.cooldowns['building_' + type] = now;
      _emitBuildingRequest(type, def, VS, N);
    }
  }
}

function _emitBuildingRequest(buildingType, def, VS, N) {
  var citizen = VS.villagers.length > 0 ? VS.villagers[randInt(0, VS.villagers.length - 1)] : null;
  var req = {
    id: 'building_' + buildingType + '_' + (_reqIdCounter++),
    category: 'building',
    subcategory: buildingType,
    message: def.requestMsg,
    citizenLabel: citizen ? citizen.label : 'Mamamayan',
    citizenId: citizen ? citizen.id : null,
    urgency: def.urgency,
    helpCostGold: _getBuildingCost(buildingType),
    timeLeft: REQUEST_EXPIRY_SECS,
    timeMax: REQUEST_EXPIRY_SECS,
    createdAt: Date.now(),
    resolved: false,
    buildingType: buildingType,
    // Resolution: building must exist
    resolveEffect: function(VS2) {
      // Check if building now exists when player tries to resolve
      if (!getBuildingDeficit(VS2, buildingType)) {
        _adjustAll(VS2.villagers, 'govTrust', 10, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 12, 0, 100);
        return true;
      }
      return false;
    },
    delayEffect: function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
    ignoreEffect: function(VS2) {
      _adjustAll(VS2.villagers, 'anger', 12, 0, 100);
      _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
    }
  };
  N.requests.push(req);
}

function _getBuildingCost(buildingType) {
  var costs = { palengke: 500, paaralan: 600, ospital: 700, bahay: 300 };
  return costs[buildingType] || 400;
}

/* ── Check and emit job-based unemployment requests ───────── */
function _checkJobDeficits(VS, N, now) {
  var unemployed = getUnemployedByProfession(VS);
  
  // Magsasaka request
  if (unemployed.magsasaka > 0 && _canEmit('job_magsasaka', N, now)) {
    N.cooldowns['job_magsasaka'] = now;
    _emitJobRequest('magsasaka', unemployed.magsasaka, VS, N);
  }
  
  // Mangingisda request
  if (unemployed.mangingisda > 0 && _canEmit('job_mangingisda', N, now)) {
    N.cooldowns['job_mangingisda'] = now;
    _emitJobRequest('mangingisda', unemployed.mangingisda, VS, N);
  }
  
  // Magsasaka Kalikasan request
  if (unemployed.magsasaka_kalikasan > 0 && _canEmit('job_kalikasan', N, now)) {
    N.cooldowns['job_kalikasan'] = now;
    _emitJobRequest('magsasaka_kalikasan', unemployed.magsasaka_kalikasan, VS, N);
  }
  
  // Manggagawa request (generic)
  if (unemployed.manggagawa > 0 && _canEmit('job_manggagawa', N, now)) {
    N.cooldowns['job_manggagawa'] = now;
    _emitJobRequest('manggagawa', unemployed.manggagawa, VS, N);
  }
  
  // Housing deficit request (homeless)
  var homeless = getHousingDeficit(VS);
  if (homeless > 0 && _canEmit('housing', N, now)) {
    N.cooldowns['housing'] = now;
    _emitHousingRequest(homeless, VS, N);
  }
}

function _emitJobRequest(profession, unemployedCount, VS, N) {
  var def = PROFESSIONS[profession];
  if (!def) return;
  
  var citizen = VS.villagers.find(function(v) { 
    var role = (v._typeDef && v._typeDef.role) || '';
    return !v.workBuilding && role.includes(def.role.split(' ')[0]);
  }) || VS.villagers[randInt(0, VS.villagers.length - 1)];
  
  var req = {
    id: 'job_' + profession + '_' + (_reqIdCounter++),
    category: 'job',
    subcategory: profession,
    message: def.requestMsg + ' ' + unemployedCount + ' tao ang walang hanapbuhay.',
    citizenLabel: citizen ? citizen.label : 'Mamamayan',
    citizenId: citizen ? citizen.id : null,
    urgency: 2,
    helpCostGold: _getJobHelpCost(profession),
    timeLeft: REQUEST_EXPIRY_SECS,
    timeMax: REQUEST_EXPIRY_SECS,
    createdAt: Date.now(),
    resolved: false,
    profession: profession,
    unemployedCount: unemployedCount,
    solutionBuilding: def.solution,
    // Track progress
    resolveEffect: function(VS2) {
      // This is called when player builds the required workplace
      // Check if any unemployed of this profession now have jobs
      var newUnemployed = getUnemployedByProfession(VS2)[profession];
      if (newUnemployed < unemployedCount) {
        var helped = unemployedCount - newUnemployed;
        _adjustAllByProfession(VS2.villagers, profession, 'govTrust', 5 + helped, 0, 100);
        _adjustAllByProfession(VS2.villagers, profession, 'happiness', 8 + helped, 0, 100);
        return true;
      }
      return false;
    },
    delayEffect: function(VS2) { _adjustAllByProfession(VS2.villagers, profession, 'anger', 6, 0, 100); },
    ignoreEffect: function(VS2) {
      _adjustAllByProfession(VS2.villagers, profession, 'anger', 15, 0, 100);
      _adjustAllByProfession(VS2.villagers, profession, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
    }
  };
  
  // Store employment progress tracking
  VS.needs.employmentProgress[req.id] = {
    profession: profession,
    initialUnemployed: unemployedCount,
    currentEmployed: 0,
    currentUnemployed: unemployedCount
  };
  
  N.requests.push(req);
}

function _emitHousingRequest(homelessCount, VS, N) {
  var citizen = VS.villagers.find(function(v) { return !v.homeBuilding; }) || VS.villagers[0];
  
  var req = {
    id: 'housing_' + (_reqIdCounter++),
    category: 'housing',
    message: homelessCount + ' tao ang walang tirahan! Kailangan ng bagong bahay.',
    citizenLabel: citizen ? citizen.label : 'Mamamayan',
    citizenId: citizen ? citizen.id : null,
    urgency: 2,
    helpCostGold: 300,
    timeLeft: REQUEST_EXPIRY_SECS,
    timeMax: REQUEST_EXPIRY_SECS,
    createdAt: Date.now(),
    resolved: false,
    homelessCount: homelessCount,
    resolveEffect: function(VS2) {
      var newHomeless = getHousingDeficit(VS2);
      if (newHomeless < homelessCount) {
        _adjustAll(VS2.villagers, 'govTrust', 8, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 10, 0, 100);
        return true;
      }
      return false;
    },
    delayEffect: function(VS2) { _adjustAll(VS2.villagers, 'anger', 4, 0, 100); },
    ignoreEffect: function(VS2) {
      _adjustAll(VS2.villagers, 'anger', 12, 0, 100);
      _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
    }
  };
  
  VS.needs.employmentProgress[req.id] = {
    profession: 'homeless',
    initialUnemployed: homelessCount,
    currentEmployed: 0,
    currentUnemployed: homelessCount
  };
  
  N.requests.push(req);
}

function _getJobHelpCost(profession) {
  var costs = { magsasaka: 400, mangingisda: 350, magsasaka_kalikasan: 450, manggagawa: 500 };
  return costs[profession] || 400;
}

function _adjustAllByProfession(villagers, profession, field, delta, lo, hi) {
  var roleMatch = PROFESSIONS[profession] ? PROFESSIONS[profession].role.split(' ')[0] : '';
  villagers.forEach(function(v) {
    var vRole = (v._typeDef && v._typeDef.role) || '';
    if (vRole.includes(roleMatch) && v[field] !== undefined) {
      v[field] = clamp(v[field] + delta, lo, hi);
    }
  });
}

/* ── Ayuda request generation ─────────────────────────────── */
export function generateAyudaRequest(VS, citizen, amount) {
  var minMax = getAyudaSatisfactionRange('temp');
  var req = {
    id: 'ayuda_' + (_reqIdCounter++),
    category: 'ayuda',
    message: 'Kailangan namin ng tulong pinansyal.',
    citizenLabel: citizen ? citizen.label : 'Mamamayan',
    citizenId: citizen ? citizen.id : null,
    urgency: 1,
    helpCostGold: 0, // Ayuda doesn't cost gold from treasury, it gives gold
    timeLeft: REQUEST_EXPIRY_SECS / 2,
    timeMax: REQUEST_EXPIRY_SECS / 2,
    createdAt: Date.now(),
    resolved: false,
    ayudaMin: minMax.min,
    ayudaMax: minMax.max,
    ayudaGiven: null
  };
  return req;
}

/* ══════════════════════════════════════════════════════════════
   tickNeeds - Updated to include new request types
══════════════════════════════════════════════════════════════ */
export function tickNeeds(dt, VS) {
  _ensureState(VS);
  var N = VS.needs;
  
  /* Update employment progress for active job requests */
  for (var id in N.employmentProgress) {
    updateEmploymentProgress(id, VS);
  }
  
  /* Age existing requests */
  for (var i = N.requests.length - 1; i >= 0; i--) {
    var req = N.requests[i];
    if (req.resolved) { N.requests.splice(i, 1); continue; }
    req.timeLeft -= dt;
    if (req.timeLeft <= 0) {
      _applyIgnore(req, VS);
      req.resolved = true;
      N.requests.splice(i, 1);
      _archiveRequest(N, req, 'expired');
    }
  }
  
  /* Passive anger/trust dynamics */
  var hasUrgentNeeds = N.requests.some(function(r) { return r.urgency >= 2; });
  
  VS.villagers.forEach(function(v) {
    if (!hasUrgentNeeds && (v.anger || 0) > 0) {
      v.anger = clamp(v.anger - ANGER_DECAY_RATE * dt * 100, 0, 100);
    }
    if ((v.anger || 0) > 50) {
      v.govTrust = clamp((v.govTrust || 50) - TRUST_LOSS_ANGER_RATE * dt * 100, 0, 100);
    }
  });
  
  /* Waste penalty */
  var waste = getWasteStats(VS);
  var wasteTotal = waste.total;
  if (wasteTotal > 0 && VS.villagers.length > 0) {
    var trustPenalty = Math.min(wasteTotal / WASTE_TRUST_DIVISOR * dt, WASTE_TRUST_CAP * dt);
    var happyPenalty = trustPenalty * WASTE_HAPPY_RATIO;
    VS.villagers.forEach(function(v) {
      if (v.govTrust !== undefined) v.govTrust = clamp(v.govTrust - trustPenalty * 100, 0, 100);
      if (v.happiness !== undefined) v.happiness = clamp(v.happiness - happyPenalty * 100, 0, 100);
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   checkAndEmit - Updated to check job deficits and buildings
══════════════════════════════════════════════════════════════ */
export function checkAndEmit(VS) {
  _ensureState(VS);
  var N = VS.needs;
  if (N.requests.length >= MAX_ACTIVE_REQUESTS) return;
  
  var now = Date.now();
  
  // Check job-based unemployment
  _checkJobDeficits(VS, N, now);
  
  // Check building deficits
  _checkBuildingDeficits(VS, N, now);
  
  // Legacy needs checks
  if (_canEmit('hunger', N, now)) {
    var avgHunger = _avg(VS.villagers, 'hunger', 0);
    if (avgHunger > 60) _emitLegacy('hunger', VS, N, now, avgHunger);
  }
  if (_canEmit('health', N, now)) {
    var sickCount = VS.villagers.filter(function(v) { return (v.health || 80) < 35; }).length;
    if (sickCount > 0) _emitLegacy('health', VS, N, now, sickCount);
  }
  if (_canEmit('safety', N, now)) {
    var avgAnger = _avg(VS.villagers, 'anger', 0);
    if (avgAnger > 65) _emitLegacy('safety', VS, N, now, avgAnger);
  }
}

function _canEmit(category, N, now) {
  var cooldownMap = {
    job_magsasaka: 120, job_mangingisda: 120, job_kalikasan: 120, job_manggagawa: 120,
    housing: 180, building_palengke: 300, building_paaralan: 300, building_ospital: 300, building_bahay: 240,
    hunger: 60, health: 90, safety: 80
  };
  var last = N.cooldowns[category] || 0;
  var cooldown = cooldownMap[category] || 60;
  return (now - last) / 1000 >= cooldown;
}

function _emitLegacy(category, VS, N, now, value) {
  N.cooldowns[category] = now;
  var citizen = VS.villagers.length > 0 ? VS.villagers[randInt(0, VS.villagers.length - 1)] : null;
  var req = _buildLegacyRequest(category, citizen, VS, value);
  if (req) N.requests.push(req);
}

function _buildLegacyRequest(category, citizen, VS, value) {
  var label = citizen ? citizen.label : 'Isang mamamayan';
  var id = 'need_' + (_reqIdCounter++);
  
  var defs = {
    hunger: {
      urgency: value > 80 ? 3 : 2,
      message: 'Nagugutom na kami! Walang sapat na pagkain sa nayon.',
      helpCostGold: 150,
      resolveEffect: function(VS2) {
        VS2.food.pool = Math.min(2000, (VS2.food.pool || 0) + 400);
        _adjustAll(VS2.villagers, 'hunger', -25, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', 6, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 8, 0, 100);
      },
      delayEffect: function(VS2) { _adjustAll(VS2.villagers, 'anger', 8, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', 18, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', -12, 0, 100);
      }
    },
    health: {
      urgency: value > 3 ? 3 : 2,
      message: 'Maraming maysakit! Kailangan namin ng ospital.',
      helpCostGold: 200,
      resolveEffect: function(VS2) {
        VS2.villagers.forEach(function(v) {
          if ((v.health || 80) < 50) v.health = clamp((v.health || 0) + 30, 0, 100);
        });
        _adjustAll(VS2.villagers, 'govTrust', 8, 0, 100);
      },
      delayEffect: function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
      ignoreEffect: function(VS2) {
        VS2.villagers.forEach(function(v) {
          if ((v.health || 80) < 50) v.health = clamp((v.health || 0) - 10, 0, 100);
        });
        _adjustAll(VS2.villagers, 'govTrust', -TRUST_LOSS_PER_IGNORE, 0, 100);
        _adjustAll(VS2.villagers, 'anger', 15, 0, 100);
      }
    },
    safety: {
      urgency: 3,
      message: 'Hindi kami ligtas! Maraming galit na tao sa nayon.',
      helpCostGold: 120,
      resolveEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', -30, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', 10, 0, 100);
        _adjustAll(VS2.villagers, 'happiness', 8, 0, 100);
      },
      delayEffect: function(VS2) { _adjustAll(VS2.villagers, 'anger', 5, 0, 100); },
      ignoreEffect: function(VS2) {
        _adjustAll(VS2.villagers, 'anger', 20, 0, 100);
        _adjustAll(VS2.villagers, 'govTrust', -10, 0, 100);
      }
    }
  };
  
  var def = defs[category];
  if (!def) return null;
  
  return {
    id: id, category: category, message: def.message, citizenLabel: label,
    citizenId: citizen ? citizen.id : null, urgency: def.urgency,
    helpCostGold: def.helpCostGold, timeLeft: REQUEST_EXPIRY_SECS,
    timeMax: REQUEST_EXPIRY_SECS, createdAt: Date.now(), resolved: false,
    resolveEffect: def.resolveEffect, delayEffect: def.delayEffect, ignoreEffect: def.ignoreEffect
  };
}

function _applyIgnore(req, VS) {
  if (req.ignoreEffect) req.ignoreEffect(VS);
}

function _archiveRequest(N, req, outcome) {
  N.resolved.unshift({ id: req.id, category: req.category, outcome: outcome });
  if (N.resolved.length > 10) N.resolved.pop();
}

function _adjustAll(villagers, field, delta, lo, hi) {
  villagers.forEach(function(v) {
    if (v[field] !== undefined) v[field] = clamp(v[field] + delta, lo, hi);
  });
}

function _avg(villagers, field, fallback) {
  if (!villagers.length) return fallback;
  var sum = 0, count = 0;
  villagers.forEach(function(v) {
    if (v[field] !== undefined) { sum += v[field]; count++; }
  });
  return count > 0 ? sum / count : fallback;
}

/* ══════════════════════════════════════════════════════════════
   resolveRequest - Updated to handle ayuda and job requests
══════════════════════════════════════════════════════════════ */
export function resolveRequest(requestId, action, VS, notifyFn, ayudaAmount) {
  _ensureState(VS);
  var N = VS.needs;
  var idx = -1;
  for (var i = 0; i < N.requests.length; i++) {
    if (N.requests[i].id === requestId) { idx = i; break; }
  }
  if (idx === -1) return { ok: false, msg: 'Hindi nahanap ang kahilingan.' };
  
  var req = N.requests[idx];
  
  if (action === 'help') {
    // Handle ayuda separately
    if (req.category === 'ayuda') {
      if (ayudaAmount === undefined) {
        return { ok: false, msg: 'Kailangan ng halaga ng ayuda.' };
      }
      return _resolveAyuda(req, VS, notifyFn, ayudaAmount);
    }
    
    // Building/job requests require building existence
    if (req.category === 'building') {
      if (getBuildingDeficit(VS, req.buildingType)) {
        return { ok: false, msg: 'Kailangan muna itayo ang ' + req.buildingType + '.' };
      }
      if (req.resolveEffect && req.resolveEffect(VS)) {
        req.resolved = true;
        _archiveRequest(N, req, 'helped');
        N.requests.splice(idx, 1);
        if (notifyFn) notifyFn('Natapos ang kahilingan! Salamat sa mamamayan!', 'success');
        return { ok: true, msg: 'Natugunan ang pangangailangan.' };
      }
      return { ok: false, msg: 'Hindi pa natutugunan ang pangangailangan.' };
    }
    
    if (req.category === 'job') {
      var newUnemployed = getUnemployedByProfession(VS)[req.profession];
      if (newUnemployed < req.unemployedCount) {
        if (req.resolveEffect && req.resolveEffect(VS)) {
          req.resolved = true;
          _archiveRequest(N, req, 'helped');
          N.requests.splice(idx, 1);
          delete N.employmentProgress[req.id];
          if (notifyFn) notifyFn('May trabaho na ang mga tao! 🙌', 'success');
          return { ok: true, msg: 'Natugunan ang pangangailangan sa trabaho.' };
        }
      }
      return { ok: false, msg: 'Kailangan magtayo ng ' + req.solutionBuilding + ' para mabigyan ng trabaho.' };
    }
    
    if (req.category === 'housing') {
      var newHomeless = getHousingDeficit(VS);
      if (newHomeless < req.homelessCount) {
        req.resolved = true;
        _archiveRequest(N, req, 'helped');
        N.requests.splice(idx, 1);
        delete N.employmentProgress[req.id];
        if (notifyFn) notifyFn('May bahay na ang mga tao! 🏠', 'success');
        return { ok: true, msg: 'Natugunan ang pangangailangan sa tirahan.' };
      }
      return { ok: false, msg: 'Kailangan magtayo ng bahay.' };
    }
    
    // Legacy help
    if (VS.res.gold < req.helpCostGold) {
      return { ok: false, msg: 'Kulang! Kailangan: ' + req.helpCostGold + ' ginto.' };
    }
    if (req.helpCostGold > 0) {
      VS.res.gold = clamp(VS.res.gold - req.helpCostGold, 0, VS.resCap.gold);
    }
    if (req.resolveEffect) req.resolveEffect(VS);
    req.resolved = true;
    _archiveRequest(N, req, 'helped');
    N.requests.splice(idx, 1);
    if (notifyFn) notifyFn('Natugunan: ' + req.category + '. Salamat ng mamamayan!', 'success');
    return { ok: true, msg: 'Natugunan ang pangangailangan.' };
  }
  
  if (action === 'delay') {
    if (req.delayEffect) req.delayEffect(VS);
    req.timeLeft = Math.min(req.timeLeft + 60, REQUEST_EXPIRY_SECS);
    if (notifyFn) notifyFn('Ipinagpaliban. Mag-ingat — maaaring lumala.', 'warning');
    return { ok: true, msg: 'Ipinagpaliban.' };
  }
  
  if (action === 'ignore') {
    if (req.ignoreEffect) req.ignoreEffect(VS);
    req.resolved = true;
    _archiveRequest(N, req, 'ignored');
    N.requests.splice(idx, 1);
    if (notifyFn) notifyFn('Binalewalain. Galit ang mga tao!', 'danger');
    return { ok: true, msg: 'Binalewalain ang kahilingan.' };
  }
  if (action === 'ayuda') {
  if (ayudaAmount === undefined) {
    return { ok: false, msg: 'Kailangan ng halaga ng ayuda.' };
  }
  return _resolveAyuda(req, VS, notifyFn, ayudaAmount);
}
  return { ok: false, msg: 'Hindi kilala ang aksyon.' };
}

function _resolveAyuda(req, VS, notifyFn, amount) {
  var minMax = getAyudaSatisfactionRange(req.id);
  var effect = {};
  
  if (amount < minMax.min) {
    // Too low - insulted
    effect.reaction = 'low';
    effect.bubble = 'Ang baba naman! 🤨';
    effect.govTrustChange = -5;
    effect.angerChange = 10;
    effect.happinessChange = -5;
    if (notifyFn) notifyFn('Masyadong mababa ang ayuda! Nagalit ang mga tao.', 'danger');
  } else if (amount > minMax.max) {
    // Too high - surprised but happy, but increase future expectations
    effect.reaction = 'high';
    effect.bubble = 'Sobra naman! 😲 Sana lagi ganyan.';
    effect.govTrustChange = 10;
    effect.angerChange = -5;
    effect.happinessChange = 15;
    recordAyudaGiven(req.id, amount, minMax.min, minMax.max);
    if (notifyFn) notifyFn('Sobra ang ayuda! Sana laging ganito!', 'success');
  } else {
    // Just right
    effect.reaction = 'good';
    effect.bubble = 'Salamat po! 🙏';
    effect.govTrustChange = 8;
    effect.angerChange = -10;
    effect.happinessChange = 12;
    if (notifyFn) notifyFn('Tamang-tama ang ayuda! Salamat po!', 'success');
  }
  
  // Apply effects to villagers
  VS.villagers.forEach(function(v) {
    v.govTrust = clamp((v.govTrust || 50) + effect.govTrustChange, 0, 100);
    v.anger = clamp((v.anger || 0) + effect.angerChange, 0, 100);
    v.happiness = clamp((v.happiness || 60) + effect.happinessChange, 0, 100);
  });
  
  // Deduct gold from treasury
  VS.res.gold = clamp(VS.res.gold - amount, 0, VS.resCap.gold);
  
  req.resolved = true;
  _archiveRequest(VS.needs, req, 'helped');
  
  // Remove from active requests
  var idx = VS.needs.requests.indexOf(req);
  if (idx !== -1) VS.needs.requests.splice(idx, 1);
  
  return { ok: true, msg: 'Ayuda naibigay.', effect: effect };
}

/* ══════════════════════════════════════════════════════════════
   getActiveRequests / clearResolvedRequests
══════════════════════════════════════════════════════════════ */
export function getActiveRequests(VS) {
  _ensureState(VS);
  return VS.needs.requests.filter(function(r) { return !r.resolved; });
}

export function getEmploymentProgress(requestId, VS) {
  if (VS.needs && VS.needs.employmentProgress[requestId]) {
    return VS.needs.employmentProgress[requestId];
  }
  return null;
}

export function clearResolvedRequests(VS) {
  _ensureState(VS);
  VS.needs.requests = VS.needs.requests.filter(function(r) { return !r.resolved; });
  VS.needs.resolved = VS.needs.resolved.slice(0, 10);
}